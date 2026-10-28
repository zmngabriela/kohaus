import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { it, expect } from 'vitest'
it('enforces four slots in the database and releases a slot when a listing closes', async () => {
 const db = new PGlite()
 try {
  await db.exec('create table dashboard_properties(id text primary key, status text, off_market boolean, portal_data jsonb)')
  const migration = readFileSync('supabase/migrations/202610281500_featured_properties.sql','utf8')
  await db.exec(migration.slice(migration.indexOf('alter table'),migration.indexOf('create or replace view')))
  for (let slot=1;slot<=4;slot++) await db.query('insert into dashboard_properties values ($1,$2,false,$3)',[String(slot),'active',JSON.stringify({featuredSlot:slot})])
  await expect(db.exec(`insert into dashboard_properties values ('duplicate','active',false,'{"featuredSlot":1}')`)).rejects.toThrow()
  await expect(db.exec(`insert into dashboard_properties values ('fifth','active',false,'{"featuredSlot":5}')`)).rejects.toThrow()
  await db.exec(`update dashboard_properties set status='closed' where id='1'`)
  await db.exec(`insert into dashboard_properties values ('replacement','active',false,'{"featuredSlot":1}')`)
  expect((await db.query(`select count(*)::int as count from dashboard_properties where status='active'`)).rows[0].count).toBe(4)
 } finally { await db.close() }
})
