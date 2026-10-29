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
it('reuses signed links and signs thumbnail paths without persisting their tokens',async()=>{
 const createSignedUrls=vi.fn().mockResolvedValue({data:[{path:'main.jpg',signedUrl:'https://test/main?token=a'},{path:'thumb.webp',signedUrl:'https://test/thumb?token=b'}]})
 const db={storage:{from:()=>({createSignedUrls,getPublicUrl:path=>({data:{publicUrl:`https://test/public/${path}`}})})}}
 const input=[{photos:[{path:'main.jpg',thumbnailPath:'thumb.webp'}]}]
 const result=await signPropertyPhotos(input,db,'property-media')
 await signPropertyPhotos(input,db,'property-media')
 expect(createSignedUrls).toHaveBeenCalledTimes(1)
 expect(createSignedUrls).toHaveBeenCalledWith(['main.jpg','thumb.webp'],3600)
 expect(result[0].photos[0].thumbnailUrl).toContain('token=b')
 expect(JSON.stringify(photosForStorage(result[0].photos,db,'property-media'))).not.toContain('token=')
 expect(photosForStorage(result[0].photos,db,'property-media')[0].thumbnailPath).toBe('thumb.webp')
})
