import {it,expect,vi} from 'vitest'
import {createMailApi} from '../../scripts/mail/api.mjs'
const id='33333333-3333-4333-8333-333333333333'
function setup({role='admin',enabled=true,replayed=false,fail=null}={}){
 const sendMail=fail?vi.fn().mockRejectedValue(fail):vi.fn().mockResolvedValue({accepted:['person@example.test']})
 const db={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role}})})})}),rpc:vi.fn(async name=>name==='crm_reserve_email'?{data:{replayed,status:'sent',mailbox_email:'hola@kohausrealestate.com',recipient:'person@example.test',subject:'Re: Hello',body:'Response',message_id:'<id@test>',references_ids:['<old@test>']}}:{})}
 const handle=createMailApi({db,enabled,accounts:[{email:'hola@kohausrealestate.com',password:'test-only'}],makeTransport:()=>({sendMail,close:vi.fn()})})
 const request={token:'test',input:{action:'send',conversationId:id,messageId:id,mailbox:'hola@kohausrealestate.com',body:'Response',to:'attacker@example.test'}}
 return {handle,request,db,sendMail}
}
it('does not send without authentication, permission or explicit activation',async()=>{
 for(const options of [{role:'viewer'},{enabled:false}]){const s=setup(options);expect((await s.handle(s.request)).status).toBeGreaterThanOrEqual(400);expect(s.sendMail).not.toHaveBeenCalled()}
 const s=setup();await s.handle({...s.request,token:null});expect(s.sendMail).not.toHaveBeenCalled()
})
it('uses server recipient, correct reply mailbox and headers',async()=>{
 const s=setup();expect((await s.handle(s.request)).status).toBe(200)
 expect(s.sendMail.mock.calls[0][0]).toMatchObject({to:{address:'person@example.test'},replyTo:'hola@kohausrealestate.com',messageId:'<id@test>',inReplyTo:'<old@test>',disableUrlAccess:true})
})
it('does not resend reserved requests',async()=>{const s=setup({replayed:true});await s.handle(s.request);expect(s.sendMail).not.toHaveBeenCalled()})
it('network timeouts are uncertain, not safe to retry',async()=>{const s=setup({fail:{code:'ETIMEDOUT'}});await s.handle(s.request);expect(s.db.rpc).toHaveBeenLastCalledWith('crm_finish_email',{p_id:id,p_status:'uncertain'})})
it('stores the chosen file for history and sends it alongside the inline signature',async()=>{
 const s=setup()
 s.request.input.files=[{name:'proposta.pdf',content:'JVBERg=='}]
 expect((await s.handle(s.request)).status).toBe(200)
 expect(s.db.rpc).toHaveBeenCalledWith('crm_store_sent_email_files',{p_id:id,p_files:[{name:'proposta.pdf',content:'JVBERg==',size:4}]})
 const attachments=s.sendMail.mock.calls[0][0].attachments
 expect(attachments.map(file=>file.filename)).toEqual(['assinatura-guilherme.png','proposta.pdf'])
 expect(attachments[1].content.toString()).toBe('%PDF')
})
