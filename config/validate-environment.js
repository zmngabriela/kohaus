import environments from './environments.json' with { type: 'json' }

// Called by Vite before serving/building. Never include keys in error messages.
export function validateEnvironment(env, { command = 'build', test = false } = {}) {
  if (test) return
  const environment = env.VITE_APP_ENV
  if (!['development', 'production'].includes(environment)) throw new Error('Set VITE_APP_ENV to development or production. See docs/AMBIENTES.md.')
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase URL and publishable key are required. Local fallback is reserved for automated tests.')
  let url
  try { url = new URL(env.VITE_SUPABASE_URL) } catch { throw new Error('Invalid Supabase URL.') }
  const ref = url.hostname.split('.')[0]
  if (url.protocol !== 'https:' || url.hostname !== `${ref}.supabase.co`) throw new Error('Use the hosted Supabase project URL from Connect.')
  if (env.VITE_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_')) throw new Error('A secret key must never be exposed through VITE_ variables.')
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (key.includes('.')) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString())
      if (claims.role !== 'anon') throw new Error()
    } catch { throw new Error('Use a publishable key or legacy anon key, never service_role.') }
  }
  if (environment === 'development' && ref !== environments.developmentProjectRef) throw new Error('Development must use the registered development project.')
  if (environment === 'production' && (ref === environments.developmentProjectRef || ref !== env.KOHAUS_EXPECTED_SUPABASE_REF)) throw new Error('Production requires its own project and matching KOHAUS_EXPECTED_SUPABASE_REF.')
  if (command === 'serve' && environment === 'production') throw new Error('Local development must not connect to production.')
  if (env.CF_PAGES === '1') {
    if (!env.CF_PAGES_BRANCH) throw new Error('Cloudflare Pages must provide CF_PAGES_BRANCH.')
    const expected = env.CF_PAGES_BRANCH === environments.productionBranch ? 'production' : 'development'
    if (environment !== expected) throw new Error(`Cloudflare branch requires VITE_APP_ENV=${expected}. See docs/AMBIENTES.md.`)
  }
}
