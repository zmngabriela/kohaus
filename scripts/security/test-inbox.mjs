// Run with PGLITE_MODULE pointing to an installed @electric-sql/pglite ESM module.
// Isolated PostgreSQL engine; mocks Supabase schemas, not its HTTP/Auth/Storage services.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant all on storage.objects to anon,authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated;
`)
const schema=fs.readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists "pgcrypto";','')
await db.exec(schema)
// Replay incremental migrations to catch non-repeatable statements.
for(const file of fs.readdirSync('supabase/migrations').filter(x=>x.startsWith('2026102321')).sort()) await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'))
await db.exec(fs.readFileSync('supabase/migrations/202610252100_invoice_delete.sql','utf8'))
await db.exec(`
 insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000001','owner@example.test'),('00000000-0000-0000-0000-000000000002','viewer@example.test'),('00000000-0000-0000-0000-000000000003','outsider@example.test');
`)
assert.equal((await db.query('select count(*)::int n from public.dashboard_users')).rows[0].n,0,'Auth signup must not grant CRM membership')
await db.exec(`
 insert into public.dashboard_users(user_id,email,role) values ('00000000-0000-0000-0000-000000000001','owner@example.test','admin'),('00000000-0000-0000-0000-000000000002','viewer@example.test','viewer');
 insert into public.dashboard_properties(id,title,reference,operation,destination,type,status,photos,off_market) values
 ('p1','Public','ONE','comprar','barcelona','piso','active','[{"path":"public.jpg"}]',false),
 ('p2','Private','TWO','comprar','barcelona','piso','active','[{"path":"secret.jpg"}]',true);
 insert into public.property_private values('p1','PRIVATE ADDRESS');
 insert into public.dashboard_clients(id,name,operation,notes) values('c1','TEST','comprar','PRIVATE NOTE');
 insert into storage.objects(bucket_id,name) values('property-media','public.jpg'),('property-media','secret.jpg'),('property-media','orphan.jpg');
`)
async function as(role,sub,sql){await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub','${sub}',false);`);try{return await db.query(sql)}finally{await db.exec('reset role')}}
async function denied(role,sub,sql) {try{const r=await as(role,sub,sql); assert.equal(r.rows.length,0)}catch(e){if(e.code!=='42501')throw e}}
const owner='00000000-0000-0000-0000-000000000001', viewer='00000000-0000-0000-0000-000000000002', outsider='00000000-0000-0000-0000-000000000003'
await denied('anon','','select * from public.dashboard_clients')
await denied('authenticated',outsider,'select * from public.dashboard_clients')
await denied('authenticated',outsider,"insert into public.dashboard_users(user_id,email,role) values('00000000-0000-0000-0000-000000000003','outsider@example.test','admin') returning *")
await denied('authenticated',viewer,"update public.dashboard_clients set notes='hacked' where id='c1' returning *")
assert.equal((await as('authenticated',owner,"update public.dashboard_clients set notes='allowed' where id='c1' returning id")).rows.length,1)
assert.deepEqual((await as('anon','',"select name from storage.objects order by name")).rows.map(x=>x.name),['public.jpg'])
assert.equal((await as('authenticated',owner,'select name from storage.objects')).rows.length,3)
await denied('authenticated',viewer,"insert into storage.objects(bucket_id,name) values('property-media','new.jpg') returning *")
const catalog=(await as('anon','','select * from public.public_properties')).rows
assert.equal(catalog.length,2);assert.deepEqual(catalog.find(x=>x.off_market).photos,[])
assert.ok(!JSON.stringify(catalog).includes('PRIVATE ADDRESS'))
await denied('anon','',"insert into public.owner_leads(id,name,surname,email,phone,city,operation,source) values('spam','Bot','Bot','b@b.test','1','x','x','x') returning id")
assert.equal((await db.query("select public from storage.buckets where id='property-media'")).rows[0].public,false)
await denied('authenticated',outsider,'select public.consume_property_ai_quota()')
await denied('authenticated',viewer,'select public.consume_property_ai_quota()')
for(let i=0;i<20;i++) assert.equal((await as('authenticated',owner,'select public.consume_property_ai_quota() permitted')).rows[0].permitted,true)
assert.equal((await as('authenticated',owner,'select public.consume_property_ai_quota() permitted')).rows[0].permitted,false)
await denied('authenticated',owner,'select * from public.property_ai_usage')
// New property workflow: unique automatic references, retry-safe creation and private owner link.
const payload={id:'retry-property',title:'Test',operation:'comprar',destination:'Sitges',country:'ES',type:'piso',currency:'EUR',surface:80,rooms:2,bathrooms:1,status:'active',owner_client_id:'c1'}
const command=`select public.save_property_with_address('${JSON.stringify(payload)}'::jsonb,'PRIVATE OWNER ADDRESS')`
await as('authenticated',owner,command)
await as('authenticated',owner,command)
assert.equal((await db.query("select country from public.dashboard_properties where id='retry-property'")).rows[0].country,'ES')
await as('authenticated',owner,`select public.save_property_with_address('{"country":"PT"}'::jsonb,'PRIVATE OWNER ADDRESS','retry-property')`)
assert.equal((await as('anon','',"select country from public.public_properties where id='retry-property'")).rows[0].country,'PT')
assert.equal((await db.query("select count(*)::int n from public.dashboard_properties where id='retry-property'")).rows[0].n,1)
assert.equal((await db.query("select reference from public.dashboard_properties where id='retry-property'")).rows[0].reference,'KH0115')
assert.equal((await db.query("select owner_client_id from public.property_private where property_id='retry-property'")).rows[0].owner_client_id,'c1')
assert.ok(!JSON.stringify((await as('anon','','select * from public.public_properties')).rows).includes('owner_client_id'))
await as('authenticated',owner,"delete from public.dashboard_properties where id='retry-property' returning id")
assert.equal((await db.query("select count(*)::int n from public.property_private where property_id='retry-property'")).rows[0].n,0)
await as('authenticated',owner,"insert into public.dashboard_invoices(number,snapshot) values('TEST-DELETE','{\"client\":{\"name\":\"Test\"}}') returning id")
await denied('authenticated',viewer,"delete from public.dashboard_invoices where number='TEST-DELETE' returning id")
assert.equal((await as('authenticated',owner,"delete from public.dashboard_invoices where number='TEST-DELETE' returning id")).rows.length,1)

await db.exec(fs.readFileSync('supabase/migrations/202611220100_inbox.sql','utf8'))
await denied('anon','','select * from public.crm_inbox')
await denied('authenticated',outsider,'select * from public.crm_inbox')
await denied('authenticated',viewer,`select public.crm_save_ticket(null,'{"channel":"whatsapp","subject":"Test"}')`)
const ticket=(await as('authenticated',owner,`select * from public.crm_save_ticket(null,'{"channel":"whatsapp","subject":"Test","contact_phone":"34611111111","client_id":"c1","property_id":"p1"}')`)).rows[0]
assert.ok(ticket.id)
await as('authenticated',owner,`select public.crm_add_note('${ticket.id}','Follow up','11111111-1111-4111-8111-111111111111')`)
await as('authenticated',owner,`select public.crm_add_note('${ticket.id}','Follow up','11111111-1111-4111-8111-111111111111')`)
assert.equal((await db.query("select count(*)::int n from crm_messages")).rows[0].n,1)
await denied('authenticated',viewer,`select public.crm_add_note('${ticket.id}','Illegal','22222222-2222-4222-8222-222222222222')`)
await denied('authenticated',owner,`update crm_messages set status='sent' returning *`)
await db.exec(`insert into owner_leads(id,name,surname,email,phone,city,operation,source) values ('inbox-lead','Demo','Contact','demo@example.test','34600000000','Barcelona','comprar','contact')`)
assert.equal((await db.query("select count(*)::int n from crm_conversations where lead_id='inbox-lead'")).rows[0].n,1)
const incoming={phone:'34600000000',phone_id:'1234',provider_id:'wamid.test',name:'Demo',kind:'text',body:'Hello',at:new Date().toISOString()}
const receive=`select crm_receive_whatsapp('${JSON.stringify(incoming)}')`
await denied('authenticated',owner,receive)
await as('service_role','',receive)
await as('service_role','',receive)
assert.equal((await db.query("select count(*)::int n from crm_messages where provider_id='wamid.test'")).rows[0].n,1)
assert.ok((await db.query("select * from crm_inbox_events where 'c1'=any(client_ids)")).rows.length>0)
// An existing manually created WhatsApp thread receives the webhook in place.
const manual=(await as('authenticated',owner,`select * from crm_save_ticket(null,'{"channel":"whatsapp","subject":"Manual","contact_phone":"+34 622 222 222","property_id":"p1","client_id":"c1"}')`)).rows[0]
await db.exec("update property_private set owner_client_id='c1' where property_id='p1'")
await as('service_role','',`select crm_receive_whatsapp('${JSON.stringify({...incoming,phone:'34622222222',provider_id:'wamid.manual'})}')`)
assert.equal((await db.query(`select conversation_id from crm_messages where provider_id='wamid.manual'`)).rows[0].conversation_id,manual.id)
await as('authenticated',viewer,`select crm_mark_read('${manual.id}')`)
await as('authenticated',viewer,`select crm_mark_read('${manual.id}')`)
assert.equal(Number((await as('authenticated',viewer,`select unread_count from crm_inbox where id='${manual.id}'`)).rows[0].unread_count),0)
await denied('authenticated',outsider,`select crm_mark_read('${manual.id}')`)
await db.exec(`insert into crm_messages(id,conversation_id,direction,body,status) values('33333333-3333-4333-8333-333333333333','${manual.id}','outbound','Hello','sending')`)
for(const status of ['read','delivered','sent'])await as('service_role','',`select crm_whatsapp_receipt('wamid.out','33333333-3333-4333-8333-333333333333','${status}',now())`)
assert.equal((await db.query("select status from crm_messages where provider_id='wamid.out'")).rows[0].status,'read')
await as('authenticated',owner,`select crm_save_ticket('${manual.id}','{"property_id":"p2","client_id":null}')`)
const event=(await db.query(`select * from crm_inbox_events where conversation_id='${manual.id}' and action='ticket.update' order by created_at desc limit 1`)).rows[0]
assert.ok(event.property_ids.includes('p1') && event.property_ids.includes('p2'))
assert.ok(event.client_ids.includes('c1'))
assert.equal(event.before_data.property_id,'p1');assert.equal(event.after_data.property_id,'p2')
await db.exec(fs.readFileSync('supabase/migrations/202611230100_email_inbox.sql','utf8'))
const mail={mailbox:'hola@kohausrealestate.com',provider_id:'email:test1',message_id:'<one@test>',references:[],from:'person@example.test',name:'Person',subject:'Test',body:'Hello',at:new Date().toISOString()}
const receiveEmail=m=>`select crm_receive_email('${JSON.stringify(m)}'::jsonb)`
await denied('authenticated',owner,receiveEmail(mail))
await denied('anon','',receiveEmail(mail))
await as('service_role','',receiveEmail(mail))
await as('service_role','',receiveEmail(mail))
assert.equal(Number((await db.query("select count(*) n from crm_messages where provider_id='email:test1'")).rows[0].n),1)
await as('service_role','',receiveEmail({...mail,provider_id:'email:test2',message_id:'<two@test>',references:['<one@test>']}))
const a=(await db.query("select conversation_id from crm_messages where provider_id='email:test1'")).rows[0].conversation_id
const b=(await db.query("select conversation_id from crm_messages where provider_id='email:test2'")).rows[0].conversation_id
assert.equal(a,b)
await as('service_role','',receiveEmail({...mail,mailbox:'guilherme@kohausrealestate.com',provider_id:'email:test3',references:['<one@test>']}))
assert.notEqual(a,(await db.query("select conversation_id from crm_messages where provider_id='email:test3'")).rows[0].conversation_id)
assert.equal((await as('authenticated',outsider,`select * from crm_inbox where id='${a}'`)).rows.length,0)
await db.exec(fs.readFileSync('supabase/migrations/202611240100_email_outbox.sql','utf8'))
const outboundId='77777777-7777-4777-8777-777777777777'
const reserveEmail=(actor,box='hola@kohausrealestate.com')=>`select crm_reserve_email('${actor}','${a}','${outboundId}','Response','${box}') result`
await denied('authenticated',owner,reserveEmail(owner))
await assert.rejects(()=>as('service_role','',reserveEmail(viewer)),/Forbidden/)
await assert.rejects(()=>as('service_role','',reserveEmail(owner,'guilherme@kohausrealestate.com')),/Wrong mailbox/)
assert.equal((await as('service_role','',reserveEmail(owner))).rows[0].result.replayed,false)
assert.equal((await as('service_role','',reserveEmail(owner))).rows[0].result.replayed,true)
await as('service_role','',`select crm_finish_email('${outboundId}','sent')`)
await as('service_role','',receiveEmail({...mail,provider_id:'email:reply-to-crm',message_id:'<reply@test>',references:['<'+outboundId+'@kohausrealestate.com>']}))
assert.equal((await db.query("select conversation_id from crm_messages where provider_id='email:reply-to-crm'")).rows[0].conversation_id,a)
await db.exec(fs.readFileSync('supabase/migrations/202611240200_sent_email.sql','utf8'))
const sentMail={...mail,provider_id:'email:sent-external',message_id:'<sent-external@test>',references:['<one@test>'],direction:'outbound'}
const importSent=`select crm_import_sent_email('${JSON.stringify(sentMail)}'::jsonb)`
await denied('authenticated',owner,importSent)
await as('service_role','',importSent)
await as('service_role','',importSent)
const sentRows=(await db.query("select direction,conversation_id from crm_messages where provider_id='email:sent-external'")).rows
assert.equal(sentRows.length,1);assert.equal(sentRows[0].direction,'outbound');assert.equal(sentRows[0].conversation_id,a)
await db.close()
console.log('PASS: inbox RLS, note idempotency, form tickets, signed-webhook RPC isolation and deduplication')
