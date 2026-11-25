import { describe,it,expect,vi } from 'vitest'
import { createWhatsappHandler } from '../../supabase/functions/whatsapp-api/handler'
const id='11111111-1111-4111-8111-111111111111',cid='22222222-2222-4222-8222-222222222222'
function fixture({role='admin',existing=null,lastInbound=new Date().toISOString(),failReserve=false,fetcher=vi.fn(async()=>Response.json({messages:[{id:'wamid.ok'}]}))}={}) {
 const writes=[]
 const db={auth:{getUser:async()=>({data:{user:{id:'staff'}}})},rpc:vi.fn(async()=>({data:null})),from(table){
  const q={select(){return q},eq(){return q},insert(data){writes.push({table,insert:data});return Promise.resolve({error:failReserve?{code:'23505'}:null})},update(data){writes.push({table,update:data});return q},then(resolve){return Promise.resolve({data:null}).then(resolve)},maybeSingle:async()=>({data:table==='dashboard_users'?{role}:existing}),single:async()=>({data:{id:cid,channel:'whatsapp',contact_phone:'+34600000000',last_inbound_at:lastInbound}})};return q
 }}
 const env=key=>({WHATSAPP_SEND_ENABLED:'true',WHATSAPP_GRAPH_VERSION:'v25.0',WHATSAPP_PHONE_NUMBER_ID:'123',WHATSAPP_BUSINESS_ACCOUNT_ID:'456'}[key] || 'fake-secret')
 return {handler:createWhatsappHandler({db,env,fetcher}),writes,fetcher,db}
}
const request=()=>new Request('http://local/send',{method:'POST',headers:{Authorization:'Bearer mock'},body:JSON.stringify({action:'send',messageId:id,conversationId:cid,body:'Hello'})})
describe('outbound WhatsApp safety',()=>{
 it('reserves before sending and records provider acceptance',async()=>{
  const f=fixture();const r=await f.handler(request());expect(r.status).toBe(200)
  expect(f.writes[0].insert.status).toBe('sending');expect(f.fetcher).toHaveBeenCalledTimes(1);expect(f.db.rpc).toHaveBeenCalledWith('crm_whatsapp_receipt',expect.objectContaining({p_provider:'wamid.ok',p_local:id}))
 })
 it('never resends a completed request, even after the response window closes',async()=>{
  const f=fixture({existing:{id,status:'delivered',conversation_id:cid,actor_id:'staff',direction:'outbound'},lastInbound:null})
  expect((await (await f.handler(request())).json()).replayed).toBe(true);expect(f.fetcher).not.toHaveBeenCalled()
 })
 it.each(['sending','failed','uncertain'])('does not silently replay a %s message',async status=>{
  const f=fixture({existing:{id,status,conversation_id:cid,actor_id:'staff',direction:'outbound'}})
  expect((await f.handler(request())).status).toBe(409);expect(f.fetcher).not.toHaveBeenCalled()
 })
 it('rejects viewer sends and expired windows',async()=>{
  for(const options of [{role:'viewer'},{lastInbound:null}]){const f=fixture(options);expect((await f.handler(request())).status).toBeGreaterThanOrEqual(400);expect(f.fetcher).not.toHaveBeenCalled()}
 })
 it('does not send after a concurrent reservation conflict',async()=>{
  const f=fixture({failReserve:true});expect((await f.handler(request())).status).toBe(409);expect(f.fetcher).not.toHaveBeenCalled()
 })
 it('marks timeouts uncertain rather than retrying',async()=>{
  const f=fixture({fetcher:vi.fn(async()=>{throw new Error('timeout')})});expect((await f.handler(request())).status).toBe(502)
  expect(f.writes.some(w=>w.update?.status==='uncertain')).toBe(true);expect(f.fetcher).toHaveBeenCalledTimes(1)
 })
})
