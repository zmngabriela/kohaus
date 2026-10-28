import { expect,it,vi } from 'vitest'
import { loadPublicRows } from './public-data'
it('reads only the public view, drops private fields, and never signs off-market media',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json([
  {id:'a',status:'active',photos:[{path:'a.jpg',name:'a'}],property_private:{address:'PRIVATE'}},
  {id:'b',status:'active',off_market:true,photos:[{path:'secret.jpg'}],observations:'SECRET'},
  {id:'c',status:'draft',photos:[{path:'draft.jpg'}]},
 ])).mockResolvedValueOnce(Response.json([{path:'a.jpg',signedURL:'/object/sign/property-media/a.jpg?token=test'}]))
 const rows=await loadPublicRows({url:'https://test.supabase.co',key:'sb_publishable_test',bucket:'property-media'},fetcher)
 expect(String(fetcher.mock.calls[0][0])).toContain('/rest/v1/public_properties')
 expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Cookie')
 expect(JSON.parse(fetcher.mock.calls[1][1].body).paths).toEqual(['a.jpg'])
 expect(JSON.stringify(rows)).not.toMatch(/PRIVATE|SECRET|secret.jpg|draft.jpg/)
 expect(rows[0].photos[0].url).toContain('/storage/v1/object/sign/')
})
it('does not silently return an empty catalog on upstream failure',async()=>{
 await expect(loadPublicRows({url:'https://test.supabase.co',key:'x'},async()=>new Response('',{status:503}))).rejects.toThrow('unavailable')
})
