import {it,expect} from 'vitest'
import { normalizeMail } from '../../scripts/mail/normalize.mjs'
const raw={from:{value:[{address:'Person@Example.com',name:'Person'}]},messageId:'<one@test>',subject:'Hello',text:'Message',references:['<parent@test>'],attachments:[{filename:'document.pdf'}]}
const ctx={mailbox:'hola@kohausrealestate.com',uid:1,uidValidity:1,internalDate:'2026-11-23T12:00:00Z'}
it('deduplicates across re-fetches but preserves separate mailboxes',()=>{
 const a=normalizeMail(raw,ctx)
 expect(normalizeMail(raw,{...ctx,uid:2}).provider_id).toBe(a.provider_id)
 expect(normalizeMail(raw,{...ctx,mailbox:'guilherme@kohausrealestate.com'}).provider_id).not.toBe(a.provider_id)
 expect(a.from).toBe('person@example.com')
 expect(a.body).toContain('document.pdf')
 expect(a).not.toHaveProperty('html')
})
it('rejects unauthorized mailbox and missing sender',()=>{
 expect(()=>normalizeMail(raw,{...ctx,mailbox:'someone@example.com'})).toThrow()
 expect(()=>normalizeMail({},ctx)).toThrow()
})

it('sent emails link to recipient instead of mailbox owner',()=>{
 const sent=normalizeMail({...raw,from:{value:[{address:ctx.mailbox}]},to:{value:[{address:'client@example.test',name:'Client'}]}},{...ctx,direction:'outbound',folder:'Sent'})
 expect(sent.from).toBe('client@example.test');expect(sent.direction).toBe('outbound')
 expect(()=>normalizeMail(raw,{...ctx,direction:'outbound'})).toThrow('UNEXPECTED_SENT_FROM')
})
