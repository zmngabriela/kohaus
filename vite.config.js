import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateEnvironment } from './config/validate-environment.js'

export default defineConfig(({ mode, command }) => {
  validateEnvironment({ ...loadEnv(mode, process.cwd(), ''), ...process.env }, {
    command,
    test: Boolean(process.env.VITEST),
  })
  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
