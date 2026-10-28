import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
 plugins:[react()],
 ssr:{target:'webworker',noExternal:true},
 build:{ssr:'src/entry-server.jsx',outDir:'dist-ssr',rolldownOptions:{output:{entryFileNames:'entry-server.js'}}},
})
