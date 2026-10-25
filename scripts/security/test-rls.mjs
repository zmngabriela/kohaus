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
const payload={id:'retry-property',title:'Test',operation:'comprar',destination:'Sitges',type:'piso',currency:'EUR',surface:80,rooms:2,bathrooms:1,status:'active',owner_client_id:'c1'}
const command=`select public.save_property_with_address('${JSON.stringify(payload)}'::jsonb,'PRIVATE OWNER ADDRESS')`
await as('authenticated',owner,command)
await as('authenticated',owner,command)
assert.equal((await db.query("select count(*)::int n from public.dashboard_properties where id='retry-property'")).rows[0].n,1)
assert.equal((await db.query("select reference from public.dashboard_properties where id='retry-property'")).rows[0].reference,'KH0115')
assert.equal((await db.query("select owner_client_id from public.property_private where property_id='retry-property'")).rows[0].owner_client_id,'c1')
assert.ok(!JSON.stringify((await as('anon','','select * from public.public_properties')).rows).includes('owner_client_id'))
await as('authenticated',owner,"delete from public.dashboard_properties where id='retry-property' returning id")
assert.equal((await db.query("select count(*)::int n from public.property_private where property_id='retry-property'")).rows[0].n,0)
await db.close()
console.log('PASS: explicit membership, anonymous/outsider isolation, viewer read-only, admin edit, private media and protected lead writes.')
