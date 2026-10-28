import * as renderer from '../dist-ssr/entry-server.js'
import securityHeaders from '../dist-ssr/security-headers.json'
import { createPageHandler } from '../server/handler.js'
export const onRequest = createPageHandler({...renderer,securityHeaders})
