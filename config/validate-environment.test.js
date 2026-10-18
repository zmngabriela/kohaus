import { describe, expect, it } from 'vitest'
import { validateEnvironment } from './validate-environment.js'
import environments from './environments.json'
const development = { VITE_APP_ENV:'development', VITE_SUPABASE_URL:`https://${environments.developmentProjectRef}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_example' }
const production = { ...development, VITE_APP_ENV:'production', VITE_SUPABASE_URL:'https://productionexample.supabase.co', KOHAUS_EXPECTED_SUPABASE_REF:'productionexample' }
describe('environment separation', () => {
 it('accepts correctly configured development and production', () => {
  expect(() => validateEnvironment(development)).not.toThrow()
  expect(() => validateEnvironment({...production, VERCEL_ENV:'production'})).not.toThrow()
 })
 it('blocks missing configuration outside isolated tests', () => {
  expect(() => validateEnvironment({})).toThrow()
  expect(() => validateEnvironment({}, {test:true})).not.toThrow()
 })
 it('blocks crossed environments and local access to production', () => {
  expect(() => validateEnvironment({...development, VERCEL_ENV:'production'})).toThrow()
  expect(() => validateEnvironment({...production, VERCEL_ENV:'preview'})).toThrow()
  expect(() => validateEnvironment(production, {command:'serve'})).toThrow()
  expect(() => validateEnvironment({...production, VITE_SUPABASE_URL:development.VITE_SUPABASE_URL})).toThrow()
  expect(() => validateEnvironment({...production, KOHAUS_EXPECTED_SUPABASE_REF:'wrong'})).toThrow()
 })
 it('rejects privileged keys', () => {
  expect(() => validateEnvironment({...development, VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_example'})).toThrow()
  const jwt = `header.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`
  expect(() => validateEnvironment({...development, VITE_SUPABASE_PUBLISHABLE_KEY:jwt})).toThrow()
 })
})
