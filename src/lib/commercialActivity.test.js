import { expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { activityHistoryEntry } from './commercialActivity'

it('preserves events across edits, relinking and deletion for clients and owners', async () => {
 const db = new PGlite()
 try {
 await db.exec(`create role authenticated; create role anon; create schema auth;
 create function auth.uid() returns uuid language sql as 'select null::uuid';
 create table dashboard_users(user_id uuid);
 create table property_private(property_id text,owner_client_id text);
 create table dashboard_visits(id text,client_id text,property_id text,lead_id text,status text,history jsonb,updated_at timestamptz);
 create table dashboard_tasks(id text,client_id text,property_id text,lead_id text,status text,updated_at timestamptz);
 insert into property_private values ('p1','owner1'),('p2','owner2');
 insert into dashboard_visits(id,client_id,property_id,status) values ('old','c1','p1','scheduled');`)
 await db.exec(readFileSync('supabase/migrations/202611211200_commercial_activity.sql','utf8'))
 await db.exec(`insert into dashboard_tasks values ('t1','c1','p1','l1','pending',now());
 update dashboard_tasks set status='completed',property_id='p2',client_id='c2' where id='t1';
 update dashboard_tasks set updated_at=now() where id='t1';
 delete from dashboard_tasks where id='t1';`)
 const {rows}=await db.query('select * from dashboard_activity_events order by created_at,id')
 expect(rows).toHaveLength(4)
 expect(rows.find(e=>e.action==='snapshot').client_ids.sort()).toEqual(['c1','owner1'])
 const change=rows.find(e=>e.action==='updated')
 expect(change.client_ids.sort()).toEqual(['c1','c2','owner1','owner2'])
 expect(change.property_ids.sort()).toEqual(['p1','p2'])
 expect(change.lead_ids).toEqual(['l1'])
 expect(change.before_data.status).toBe('pending')
 expect(change.after_data.status).toBe('completed')
 expect(rows.find(e=>e.action==='deleted').before_data.status).toBe('completed')
 await db.exec('set role authenticated')
 await expect(db.exec('delete from dashboard_activity_events')).rejects.toThrow()
 } finally {await db.close()}
}, 20000)

it('renders task status changes with before and after values',()=>{
 const entry=activityHistoryEntry({id:'e1',source_type:'task',action:'updated',before_data:{status:'pending'},after_data:{status:'completed',title:'Ligar'}},'pt')
 expect(entry.heading).toBe('Tarefa · Atualizada · Ligar')
 expect(entry.changes).toContainEqual({field:'status',before:'Pendente',after:'Concluída'})
})
