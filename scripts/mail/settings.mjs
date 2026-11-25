import { mailboxes } from './normalize.mjs'
export function readMailAccounts(value='[]') {
 let accounts
 try { accounts=JSON.parse(value) } catch { throw new Error('INVALID_SPACEMAIL_CONFIGURATION') }
 if(!Array.isArray(accounts) || accounts.some(a=>!a || !mailboxes.includes(a.email) || typeof a.password!=='string' || !a.password || (a.sentFolder!=null && (typeof a.sentFolder!=='string' || /[\r\n\0]/.test(a.sentFolder))))) throw new Error('INVALID_SPACEMAIL_CONFIGURATION')
 if(new Set(accounts.map(a=>a.email)).size!==accounts.length)throw new Error('DUPLICATE_MAILBOX')
 return accounts
}
