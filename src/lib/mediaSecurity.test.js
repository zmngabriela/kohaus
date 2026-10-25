import { expect, it, vi } from 'vitest'
import { safeExternalUrl, validatePhoto, signPropertyPhotos, photosForStorage } from './mediaSecurity'
it('rejects executable or ambiguous external links',()=>{
 for(const value of ['javascript:alert(1)','data:text/html,x','http://site.test','https://user:password@site.test','//site.test'])expect(safeExternalUrl(value)).toBe('')
 expect(safeExternalUrl('https://site.test/offer')).toBe('https://site.test/offer')
})
it('blocks SVG and oversized upload files',()=>{
 expect(()=>validatePhoto({type:'image/svg+xml',size:100})).toThrow()
 expect(()=>validatePhoto({type:'image/jpeg',size:21*1024*1024})).toThrow()
 expect(validatePhoto({type:'image/png',size:100})).toBe('png')
})
it('uses signed URLs for display, but never stores the capability',async()=>{
 const bucket={createSignedUrls:vi.fn().mockResolvedValue({data:[{path:'a.jpg',signedUrl:'https://storage.test/sign/a.jpg?token=secret'}]}),getPublicUrl:()=>({data:{publicUrl:'https://storage.test/public/a.jpg'}})}
 const db={storage:{from:()=>bucket}}
 const properties=await signPropertyPhotos([{photos:[{path:'a.jpg',url:'old'}]}],db,'property-media')
 expect(properties[0].photos[0].url).toContain('token=')
 expect(JSON.stringify(photosForStorage(properties[0].photos,db,'property-media'))).not.toContain('token=')
})
