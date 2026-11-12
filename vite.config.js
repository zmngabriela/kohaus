import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateEnvironment } from './config/validate-environment.js'

import { localLeads } from './config/local-leads.js'

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  validateEnvironment(env, {
    command,
    test: Boolean(process.env.VITEST),
  })
  return {
    plugins: [react(), !process.env.VITEST && localLeads(env.VITE_SUPABASE_URL)],
    server: { fs: { deny: ['.env', '.env.*', '.dev.vars*', '*.{crt,pem,key}', '**/.git/**'] } },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
