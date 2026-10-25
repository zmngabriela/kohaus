import { messages, validateInput, validateResult } from './core.js'

const defaultModel = 'openai/gpt-oss-120b'

export function createHandler({ createClient, env, fetcher = fetch }) {
  return async request => {
    const origin = request.headers.get('origin') || ''
    const allowed = (env('AI_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim())
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    }
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers })

    if (!allowed.includes(origin)) return reply(403, { error: 'origin_denied' })
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
          'Access-Control-Allow-Methods': 'POST',
        },
      })
    }
    if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' })

    const groqKey = env('GROQ_API_KEY')
    const supabaseUrl = env('SUPABASE_URL')
    const supabaseKey = env('SUPABASE_ANON_KEY')
    if (!groqKey || !supabaseUrl || !supabaseKey) return reply(503, { error: 'not_configured' })

    const authorization = request.headers.get('authorization') || ''
    if (!authorization.startsWith('Bearer ')) return reply(401, { error: 'unauthorized' })
    const db = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: { user }, error: authError } = await db.auth.getUser(authorization.slice(7))
    if (authError || !user) return reply(401, { error: 'unauthorized' })

    const { data: member, error: memberError } = await db.from('dashboard_users')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberError || !['admin', 'editor'].includes(member?.role)) return reply(403, { error: 'forbidden' })

    let input
    try {
      const reader = request.body?.getReader()
      if (!reader) throw new Error('missing_body')
      const decoder = new TextDecoder()
      let body = ''
      let size = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.length
        if (size > 20000) {
          await reader.cancel()
          return reply(413, { error: 'too_large' })
        }
        body += decoder.decode(value, { stream: true })
      }
      input = validateInput(JSON.parse(body + decoder.decode()))
    } catch {
      return reply(400, { error: 'invalid_input' })
    }

    const { data: permitted, error: limitError } = await db.rpc('consume_property_ai_quota')
    if (limitError) return reply(503, { error: 'quota_unavailable' })
    if (!permitted) return reply(429, { error: 'rate_limited' })

    try {
      const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: env('GROQ_MODEL') || defaultModel,
          messages: messages(input),
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_completion_tokens: 5000,
        }),
        signal: AbortSignal.timeout(45000),
      })
      if (!response.ok) {
        if (response.status === 429) return reply(429, { error: 'rate_limited' })
        if ([401, 403].includes(response.status)) return reply(502, { error: 'provider_auth_failed' })
        if (response.status === 400) return reply(502, { error: 'model_or_request_rejected' })
        return reply(502, { error: 'provider_unavailable' })
      }

      const data = await response.json()
      if (data.choices?.[0]?.finish_reason !== 'stop') throw new Error('incomplete_response')
      const result = validateResult(JSON.parse(data.choices[0].message.content), input.action)
      return reply(200, result)
    } catch {
      return reply(502, { error: 'provider_unavailable' })
    }
  }
}
