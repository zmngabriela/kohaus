import { createHash } from 'node:crypto'
export const mailboxes = ['hola@kohausrealestate.com','guilherme@kohausrealestate.com']
export function normalizeMail(mail, {mailbox, uid, uidValidity, folder='INBOX', internalDate, direction='inbound'}) {
 if(!mailboxes.includes(mailbox)) throw new Error('MAILBOX_NOT_ALLOWED')
 if(!['inbound','outbound'].includes(direction))throw new Error('INVALID_DIRECTION')
 if(direction==='outbound' && mail.from?.value?.[0]?.address?.toLowerCase()!==mailbox)throw new Error('UNEXPECTED_SENT_FROM')
 const sender = direction==='outbound'?mail.to?.value?.[0]:mail.from?.value?.[0]
 const email = sender?.address?.trim().toLowerCase()
 if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_SENDER')
 const messageId = String(mail.messageId || '').slice(0,998)
 const hash=value=>createHash('sha256').update(value).digest('hex')
 const provider = 'email:'+hash(`${mailbox}:${messageId || `${folder}:${uidValidity}:${uid}`}`)
 const references = [...(Array.isArray(mail.references)?mail.references:mail.references?[mail.references]:[]),mail.inReplyTo].filter(Boolean).map(String).slice(-30)
 const attachments = (mail.attachments || []).filter(a=>a.disposition!=='inline' && a.contentDisposition!=='inline' && String(a.filename || '').toLowerCase()!=='assinatura-guilherme.png').map(a=>String(a.filename || 'anexo').slice(0,200))
 const text = (mail.text || '[Mensagem sem versão de texto. Consulte o original na caixa de e-mail.]').slice(0,9000)
 return {mailbox,direction,provider_id:provider,message_id:messageId,references,from:email,name:String(sender.name || email).slice(0,200),subject:String(mail.subject || 'Sem assunto').slice(0,240),body:text+(attachments.length?'\n\nAnexos disponíveis na caixa de e-mail: '+attachments.slice(0,10).join(', '):''),at:new Date(internalDate || mail.date || Date.now()).toISOString()}
}
