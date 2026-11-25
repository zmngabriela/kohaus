// Server-only, read-only IMAP polling. Never import this module in browser code.
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, writeFile, rename, open, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { readMailAccounts } from './settings.mjs'
import { normalizeMail } from './normalize.mjs'

if(process.env.SPACEMAIL_SYNC_ENABLED!=='true') { console.log('Spacemail sync disabled. No connection attempted.'); process.exit(0) }
const config = readMailAccounts(process.env.SPACEMAIL_ACCOUNTS_JSON)
if(!config.length) throw new Error('Configure the approved mailboxes on the server.')
if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing server database configuration.')
const since = new Date(process.env.SPACEMAIL_IMPORT_SINCE || '')
if(!Number.isFinite(since.getTime())) throw new Error('SPACEMAIL_IMPORT_SINCE must define the approved start date (ISO).')
const db = createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const directory = process.env.SPACEMAIL_STATE_DIR || 'tmp/spacemail'
await mkdir(directory,{recursive:true,mode:0o700})
const lock = await open(`${directory}/sync.lock`,'wx',0o600).catch(()=>null)
if(!lock) { console.error('A sync is already running, or its lock needs review.'); process.exit(1) }
try {
 for(const account of config) {
  const client = new ImapFlow({host:'mail.spacemail.com',port:993,secure:true,auth:{user:account.email,pass:account.password},logger:false,connectionTimeout:20000,socketTimeout:60000})
  // Never print server errors or message bodies: they may contain credentials/PII.
  client.on('error',()=>{})
  try {
   await client.connect()
   const listed=await client.list()
   const sent=account.sentFolder || listed.find(folder=>folder.specialUse==='\\Sent')?.path
   const folders=[{path:'INBOX',direction:'inbound'},...(sent?[{path:sent,direction:'outbound'}]:[])]
   if(!sent)console.log(`${account.email}: Sent folder not identified; configure sentFolder to import sent mail.`)
   for(const folder of folders) {
   const path=`${directory}/${account.email}-${createHash('sha256').update(folder.path).digest('hex').slice(0,16)}.json`
   let cursor={}
   try{cursor=JSON.parse(await readFile(path,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
   const mailbox=await client.mailboxOpen(folder.path,{readOnly:true})
   const validity=String(mailbox.uidValidity)
   if(cursor.validity && cursor.validity!==validity) throw new Error('UIDVALIDITY_CHANGED_REVIEW_REQUIRED')
   const all=await client.search({since},{uid:true})
   const uids=(all || []).filter(uid=>uid>(cursor.uid || 0)).sort((a,b)=>a-b).slice(0,100)
   for(const uid of uids) {
    const meta=await client.fetchOne(uid,{size:true,internalDate:true},{uid:true})
    if(!meta) continue
    if(meta.size>10*1024*1024) throw new Error('MESSAGE_EXCEEDS_10MB_REVIEW_REQUIRED')
    const raw=await client.fetchOne(uid,{source:true},{uid:true})
    if(!raw?.source) throw new Error('SOURCE_UNAVAILABLE')
    const parsed=await simpleParser(raw.source,{skipImageLinks:true,skipTextToHtml:true,maxHtmlLengthToParse:2*1024*1024})
    if(new Date(meta.internalDate)>=since) {
     const message=normalizeMail(parsed,{mailbox:account.email,uid,uidValidity:validity,internalDate:meta.internalDate,folder:folder.path,direction:folder.direction})
     const {error}=await db.rpc(folder.direction==='inbound'?'crm_receive_email':'crm_import_sent_email',{p_message:message})
     if(error) throw new Error('DATABASE_IMPORT_FAILED')
    }
    cursor={uid,validity,checkedAt:new Date().toISOString()}
    await writeFile(path+'.next',JSON.stringify(cursor),{mode:0o600})
    await rename(path+'.next',path)
   }
   console.log(`${account.email}: synchronized ${uids.length} ${folder.direction} message(s).`)
   }
  } catch { console.error(`${account.email}: sync interrupted; checkpoint retained. Review configuration or oversized message. No emails were deleted.`); process.exitCode=1 }
  finally { await client.logout().catch(()=>{}); client.close() }
 }
} finally { await lock.close(); await unlink(`${directory}/sync.lock`) }
