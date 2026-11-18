import { expect, it, vi } from 'vitest'
import { createPropertyImageHandler } from './property-image'
const request = (id='a') => ({request:new Request(`https://kohausrealestate.com/api/property-image?id=${id}`)})
it('resolves the first photo and refreshes expiring links', async () => {
 const load = vi.fn().mockResolvedValue([{id:'a',status:'active',photos:[{url:'https://media.example/cover.jpg?token=new'},{url:'https://media.example/second.jpg'}]}])
 const response = await createPropertyImageHandler({},load)(request())
 expect(response.status).toBe(302)
 expect(response.headers.get('Location')).toBe('https://media.example/cover.jpg?token=new')
 expect(response.headers.get('Cache-Control')).toBe('no-store')
})
it.each([
 {id:'a',status:'active',off_market:true,photos:[{url:'https://media.example/private.jpg'}]},
 {id:'a',status:'draft',photos:[{url:'https://media.example/draft.jpg'}]},
 {id:'a',status:'active',photos:[]},
 {id:'a',status:'active',photos:[{url:'javascript:alert(1)'}]},
])('does not expose private, unpublished or invalid media', async row => {
 expect((await createPropertyImageHandler({},async()=>[row])(request())).status).toBe(404)
})
it('reports upstream failures without an invalid redirect', async () => {
 expect((await createPropertyImageHandler({},async()=>{throw Error('offline')})(request())).status).toBe(503)
})
