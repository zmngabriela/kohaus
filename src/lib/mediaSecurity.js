const types = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp' }
export function safeExternalUrl(value) {
 try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '' } catch { return '' }
}
export function validatePhoto(file) {
 if (!types[file.type] || file.size > 20 * 1024 * 1024 || file.size === 0) throw new Error('Use JPG, PNG ou WebP de até 20 MB.')
 return types[file.type]
}
export async function validatePhotoContent(file) {
 const extension = validatePhoto(file)
 const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer())
 const png = bytes.slice(0,8).join(',') === '137,80,78,71,13,10,26,10'
 const jpeg = bytes[0]===255 && bytes[1]===216 && bytes[2]===255
 const webp = String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP'
 if (!(extension==='png' && png || extension==='jpg' && jpeg || extension==='webp' && webp)) throw new Error('O conteúdo do arquivo não corresponde a uma imagem permitida.')
 return extension
}
export async function signPropertyPhotos(properties, database, bucket) {
 const paths = [...new Set(properties.flatMap(p => p.photos || []).map(p=>p.path).filter(Boolean))]
 if (!paths.length) return properties
 const { data, error } = await database.storage.from(bucket).createSignedUrls(paths,3600)
 if (error) throw new Error('Não foi possível carregar as imagens autorizadas.')
 const urls = new Map((data || []).map(item=>[item.path,item.signedUrl]))
 return properties.map(p=>({...p,photos:(p.photos || []).map(photo=>photo.path ? {...photo,url:urls.get(photo.path) || ''} : {...photo,url:safeExternalUrl(photo.url)})}))
}
// Signed URLs are temporary bearer capabilities and must never be saved to the database.
export function photosForStorage(photos, database, bucket) {
 return photos.map(photo=>photo.path ? {...photo,url:database.storage.from(bucket).getPublicUrl(photo.path).data.publicUrl} : {...photo,url:safeExternalUrl(photo.url)})
}
