import { serverConfig } from '../../dist-ssr/entry-server.js'
import { createPropertyImageHandler } from '../../server/property-image.js'
export const onRequest = createPropertyImageHandler(serverConfig)
