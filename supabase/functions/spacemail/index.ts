import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import nodemailer from 'npm:nodemailer@10.6.1'
import { ImapFlow } from 'npm:imapflow@2.12.2'
import { simpleParser } from 'npm:mailparser@3.15.0'
import { createMailApi } from '../../../scripts/mail/api.mjs'
import { readMailAccounts } from '../../../scripts/mail/settings.mjs'
import { normalizeMail } from '../../../scripts/mail/normalize.mjs'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const transport = (account: { email: string; password: string }) => nodemailer.createTransport({
  host: 'mail.spacemail.com', port: 465, secure: true,
  auth: { user: account.email, pass: account.password },
  connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000,
})

function imapClient(account: { email: string; password: string }) {
  const client = new ImapFlow({
    host: 'mail.spacemail.com', port: 993, secure: true,
    auth: { user: account.email, pass: account.password },
    logger: false, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000,
  })
  client.on('error', () => {})
  return client
}

async function sync(account: { email: string; password: string; sentFolder?: string }, sent: boolean, since: Date) {
  const client = imapClient(account)
  try {
    await client.connect()
    const folder = sent
      ? account.sentFolder || (await client.list()).find(item => item.specialUse === '\\Sent')?.path
      : 'INBOX'
    if (!folder) return { state: 'sent_folder_missing' }
    const mailbox = await client.mailboxOpen(folder, { readOnly: true })
    const validity = String(mailbox.uidValidity)
    const { data: cursor, error } = await db.from('crm_email_sync_cursor')
      .select('uid,validity').eq('mailbox_email', account.email).eq('folder', folder).maybeSingle()
    if (error) throw error
    if (cursor && cursor.validity !== validity) return { state: 'uid_validity_changed' }
    const start = (cursor?.uid ?? 0) + 1
    if (mailbox.uidNext && start >= mailbox.uidNext) return { state: 'ok', imported: 0 }
    const matches = await client.search({ since, uid: `${start}:*` }, { uid: true })
    let imported = 0
    for (const uid of (matches || []).filter(uid => uid >= start).sort((a, b) => a - b).slice(0, 5)) {
      const meta = await client.fetchOne(uid, { size: true, internalDate: true }, { uid: true })
      if (!meta) continue
      if (meta.size == null || meta.size > 10 * 1024 * 1024) return { state: 'message_size_requires_review', imported }
      if (new Date(meta.internalDate!) >= since) {
        const raw = await client.fetchOne(uid, { source: true }, { uid: true })
        if (!raw || !raw.source) throw new Error('SOURCE_UNAVAILABLE')
        const parsed = await simpleParser(raw.source, { skipImageLinks: true, skipTextToHtml: true, maxHtmlLengthToParse: 2 * 1024 * 1024 })
        const message = normalizeMail(parsed, { mailbox: account.email, uid, uidValidity: validity, folder, internalDate: meta.internalDate, direction: sent ? 'outbound' : 'inbound' })
        const { data, error } = await db.rpc(sent ? 'crm_import_sent_email' : 'crm_receive_email', { p_message: message })
        if (error) throw error
        if (data) imported++
        if (parsed.attachments.some(part => part.contentDisposition !== 'inline')) {
          const { data: stored, error: lookupError } = await db.from('crm_messages')
            .select('id').eq('provider_id', message.provider_id).maybeSingle()
          if (lookupError) throw lookupError
          if (stored) {
            const { error: sourceError } = await db.from('crm_email_attachment_sources').upsert({
              message_id: stored.id, mailbox_email: account.email, folder, uid_validity: validity, uid,
            })
            if (sourceError) throw sourceError
            const attachments = parsed.attachments.slice(0, 20).flatMap((part, index) => part.contentDisposition === 'inline' ? [] : [{
              index, name: String(part.filename || 'anexo').slice(0, 200), size: part.size,
            }])
            const { error: metadataError } = await db.from('crm_messages').update({ email_attachments: attachments }).eq('id', stored.id)
            if (metadataError) throw metadataError
          }
        }
      }
      const { error } = await db.rpc('crm_advance_email_cursor', { p_mailbox: account.email, p_folder: folder, p_validity: validity, p_uid: uid })
      if (error) throw error
    }
    return { state: 'ok', imported }
  } finally {
    client.close()
  }
}

const allowedHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-spacemail-sync-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: allowedHeaders })

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: allowedHeaders })
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  try {
    const reader = request.body?.getReader()
    const decoder = new TextDecoder()
    let size = 0
    let body = ''
    if (!reader) return json({ error: 'INVALID_REQUEST' }, 400)
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 4_260_000) { await reader.cancel(); return json({ error: 'TOO_LARGE' }, 413) }
      body += decoder.decode(value, { stream: true })
    }
    const input = JSON.parse(body + decoder.decode())
    const token = /^Bearer ([^\s]+)$/.exec(request.headers.get('authorization') ?? '')?.[1]
    const accounts = readMailAccounts(Deno.env.get('SPACEMAIL_ACCOUNTS_JSON'))
    if (input.action === 'attachment') {
      if (!token) return json({ error: 'AUTH_REQUIRED' }, 401)
      const { data: { user } } = await db.auth.getUser(token)
      if (!user) return json({ error: 'AUTH_REQUIRED' }, 401)
      const { data: member } = await db.from('dashboard_users').select('role').eq('user_id', user.id).maybeSingle()
      if (!member) return json({ error: 'FORBIDDEN' }, 403)
      if (!Number.isInteger(input.index) || input.index < 0 || input.index >= 20) return json({ error: 'INVALID_INDEX' }, 400)
      const { data: sent, error: sentError } = await db.from('crm_sent_email_files').select('files').eq('message_id', input.messageId).maybeSingle()
      if (sentError) throw sentError
      if (sent) {
        const file = sent.files[input.index]
        if (!file) return json({ error: 'ATTACHMENT_NOT_FOUND' }, 404)
        return new Response(Uint8Array.from(atob(file.content), char => char.charCodeAt(0)), { headers: {
          ...allowedHeaders, 'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff',
        } })
      }
      const { data: source } = await db.from('crm_email_attachment_sources').select('*').eq('message_id', input.messageId).maybeSingle()
      const account = accounts.find(item => item.email === source?.mailbox_email)
      if (!source || !account) return json({ error: 'ATTACHMENT_NOT_FOUND' }, 404)
      const client = imapClient(account)
      try {
        await client.connect()
        const mailbox = await client.mailboxOpen(source.folder, { readOnly: true })
        if (String(mailbox.uidValidity) !== source.uid_validity) return json({ error: 'ATTACHMENT_NOT_FOUND' }, 404)
        const meta = await client.fetchOne(Number(source.uid), { size: true }, { uid: true })
        if (!meta || meta.size == null || meta.size > 10 * 1024 * 1024) return json({ error: 'ATTACHMENT_NOT_FOUND' }, 404)
        const raw = await client.fetchOne(Number(source.uid), { source: true }, { uid: true })
        const parsed = raw && raw.source ? await simpleParser(raw.source, { skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true }) : null
        const part = parsed?.attachments[input.index]
        if (!part) return json({ error: 'ATTACHMENT_NOT_FOUND' }, 404)
        return new Response(Uint8Array.from(part.content), { headers: {
          ...allowedHeaders, 'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff',
        } })
      } finally { client.close() }
    }
    if (input.action === 'sync' || input.action === 'verify') {
      const syncKey = Deno.env.get('SPACEMAIL_SYNC_KEY')
      const scheduled = input.action === 'sync' && syncKey && request.headers.get('x-spacemail-sync-key') === syncKey
      if (!scheduled) {
        if (!token) return json({ error: 'AUTH_REQUIRED' }, 401)
        const { data: { user } } = await db.auth.getUser(token)
        if (!user) return json({ error: 'AUTH_REQUIRED' }, 401)
        const { data } = await db.from('dashboard_users').select('role').eq('user_id', user.id).maybeSingle()
        if (data?.role !== 'admin') return json({ error: 'FORBIDDEN' }, 403)
      }
      const account = accounts.find(item => item.email === input.mailbox)
      if (!account) return json({ error: 'MAILBOX_NOT_CONFIGURED' }, 409)
      if (input.action === 'verify') {
        const client = imapClient(account)
        const smtp = transport(account)
        try {
          const checks = await Promise.allSettled([client.connect(), smtp.verify()])
          return json({ imap: checks[0].status === 'fulfilled', smtp: checks[1].status === 'fulfilled' })
        } finally { client.close(); smtp.close() }
      }
      if (Deno.env.get('SPACEMAIL_SYNC_ENABLED') !== 'true') return json({ error: 'SYNC_DISABLED' }, 409)
      const since = new Date(Deno.env.get('SPACEMAIL_IMPORT_SINCE') || '')
      if (!Number.isFinite(since.getTime())) return json({ error: 'IMPORT_DATE_REQUIRED' }, 409)
      return json(await sync(account, input.folder === 'sent', since))
    }
    const handle = createMailApi({ db, accounts, enabled: Deno.env.get('SPACEMAIL_SEND_ENABLED') === 'true', makeTransport: transport })
    const response = await handle({ token, input })
    return json(response.body, response.status)
  } catch {
    return json({ error: 'MAIL_UNAVAILABLE' }, 500)
  }
})
