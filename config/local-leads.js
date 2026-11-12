import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { onRequest } from '../functions/api/leads.js'

// Vite serves the Pages endpoint on loopback with the same validation as preview.
export function localLeads(databaseUrl) {
  return {
    name: 'local-leads',
    apply: 'serve',
    async configureServer(server) {
      if (!existsSync('.dev.vars')) return
      const env = parseEnv(readFileSync('.dev.vars', 'utf8'))
      if (env.SUPABASE_URL !== databaseUrl) throw new Error('Local lead gateway must use the same development database as Vite.')
      const { DatabaseSync } = await import('node:sqlite')
      const db = new DatabaseSync(':memory:')
      db.exec(readFileSync('config/cloudflare/rate-limits.sql', 'utf8'))
      env.RATE_LIMITS = { prepare(sql) {
        const statement = db.prepare(sql)
        return { bind: (...args) => ({ first: () => statement.get(...args), run: () => statement.run(...args) }) }
      } }
      server.httpServer?.once('close', () => db.close())
      server.middlewares.use('/api/leads', async (req, res, next) => {
        try {
          const ip = req.socket.remoteAddress
          const origin = 'http://' + req.headers.host
          if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) || new URL(origin).hostname !== 'localhost') {
            res.writeHead(403).end()
            return
          }
          const headers = new Headers(req.headers)
          headers.set('CF-Connecting-IP', '127.0.0.1')
          const request = new Request(origin + '/api/leads', { method: req.method, headers,
            ...(['GET','HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' }) })
          const result = await onRequest({ request, env, waitUntil: () => {} })
          res.writeHead(result.status, Object.fromEntries(result.headers)).end(await result.text())
        } catch (error) { next(error) }
      })
    },
  }
}
