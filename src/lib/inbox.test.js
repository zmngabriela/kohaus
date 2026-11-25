import { describe,it,expect,vi,beforeEach } from 'vitest'
import { createInboxStore,filterInbox,propertyMessage } from './inbox'
import { canReply,parseWebhook,normalizedPhone,supportedTemplates,templatePayload,verifySignature } from '../../supabase/functions/whatsapp-webhook/core'
import { webcrypto,createHmac } from 'node:crypto'
describe('local inbox',()=>{
 let store
 beforeEach(()=>{localStorage.clear();store=createInboxStore({local:true,userId:'test',database:new Proxy({}, {get(){throw Error('Remote access forbidden')}})})})
 it('keeps demo, notes and replies local and labels replies unsent',async()=>{
  await store.seedDemo();await store.seedDemo();let rows=await store.list();expect(rows).toHaveLength(1);expect(rows[0].unread_count).toBe(1)
  const id=rows[0].id;await store.markRead(id);expect((await store.list())[0].unread_count).toBe(0)
  await store.note(id,'Call tomorrow','note1');await store.note(id,'Call tomorrow','note1')
  await store.send(id,'Hello','reply1');await store.send(id,'Hello','reply1')
  expect(await store.messages(id)).toHaveLength(3);expect((await store.messages(id)).at(-1).status).toBe('draft')
  await store.save(id,{status:'resolved'});expect((await store.list())[0].resolved_at).toBeTruthy()
  expect(await store.connection()).toEqual({state:'local',canSend:false})
 })
 it('imports each form once and isolates users',async()=>{
  const leads=[{id:'l1',name:'Ana',email:'test@example.test',comments:'Looking for a home'}]
  await store.importForms(leads);await store.importForms(leads);expect(await store.list()).toHaveLength(1)
  expect(await createInboxStore({local:true,userId:'other'}).list()).toHaveLength(0)
 })
 it('shows resolved conversations only in the resolved filter',()=>{
  const rows=[
   {status:'open',unread_count:1},
   {status:'waiting',unread_count:0},
   {status:'resolved',unread_count:1},
  ]
  expect(filterInbox(rows,{})).toEqual(rows.slice(0,2))
  expect(filterInbox(rows,{status:'unread'})).toEqual([rows[0]])
  expect(filterInbox(rows,{status:'resolved'})).toEqual([rows[2]])
 })
 it('filters by linked record, contact, unread and assignee',()=>{
  const rows=[{contact_name:'João',status:'open',channel:'whatsapp',client_id:'c1',assigned_to:'me',unread_count:2}]
  expect(filterInbox(rows,{search:'joao',context:{client_id:'c1'},assigned:'mine',status:'unread'},'me')).toHaveLength(1)
  expect(filterInbox(rows,{context:{property_id:'missing'}},'me')).toHaveLength(0)
 })
 it('does not offer private or unavailable property links',()=>{
  expect(propertyMessage({id:'p1',status:'active',offMarket:true})).toBe('')
  expect(propertyMessage({id:'p1',status:'draft'})).toBe('')
  expect(propertyMessage({id:'p1',status:'active',reference:'KH1'})).toContain('id=p1')
 })
})
describe('WhatsApp protocol protections',()=>{
 it('enforces the customer service window boundary',()=>{
  const now=Date.now();expect(canReply(new Date(now-86400000).toISOString(),now)).toBe(false)
  expect(canReply(new Date(now-86399000).toISOString(),now)).toBe(true)
  expect(canReply(new Date(now+1000).toISOString(),now)).toBe(false)
  expect(canReply(null,now)).toBe(false)
 })
 it('does not guess a country prefix',()=>{
  expect(normalizedPhone('+34 665 32 47 91')).toBe('34665324791')
  expect(normalizedPhone('invalid')).toBeNull();expect(normalizedPhone('0034 665324791')).toBeNull()
 })
 it('verifies signatures against the exact raw body',async()=>{
  vi.stubGlobal('crypto',webcrypto)
  const raw='{"object":"whatsapp_business_account"}',secret='test-secret',sig='sha256='+createHmac('sha256',secret).update(raw).digest('hex')
  expect(await verifySignature(raw,sig,secret)).toBe(true);expect(await verifySignature(raw+' ',sig,secret)).toBe(false)
  expect(await verifySignature(raw,'sha256=bad',secret)).toBe(false);vi.unstubAllGlobals()
 })
 it('only ingests the configured phone and recognized receipt states',()=>{
  const value={metadata:{phone_number_id:'123'},messages:[{id:'wamid.1',from:'34600000000',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'Hi'}}],statuses:[{id:'wamid.2',timestamp:'1700000000',status:'read'}]}
  const payload={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value}]}]}
  expect(parseWebhook(payload,'other').messages).toHaveLength(0)
  expect(parseWebhook(payload,'123').messages[0].body).toBe('Hi')
  expect(parseWebhook(payload,'123').receipts[0].status).toBe('read')
 })
 it('only offers supported approved templates and checks every variable',()=>{
  const rows=[{name:'follow_up',language:'es',status:'APPROVED',components:[{type:'BODY',text:'Hola {{1}}'}]},{name:'rejected',status:'REJECTED'},{name:'button',language:'es',status:'APPROVED',components:[{type:'BUTTONS'}]}]
  const templates=supportedTemplates(rows);expect(templates).toHaveLength(1)
  expect(()=>templatePayload(templates[0],[])).toThrow();expect(templatePayload(templates[0],['Ana']).components[0].parameters[0].text).toBe('Ana')
 })
})
