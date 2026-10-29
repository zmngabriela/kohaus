const fields = 'id,created_at,title,reference,operation,destination,type,price_value,currency,surface,rooms,bathrooms,status,off_market,observations,photos,portal_data'
export async function loadPublicRows(config, fetcher = fetch) {
 const endpoint = new URL('/rest/v1/public_properties',config.url)
 endpoint.searchParams.set('select',fields)
 endpoint.searchParams.set('order','created_at.desc')
 const headers = {apikey:config.key}
 if (config.key?.includes('.')) headers.Authorization = `Bearer ${config.key}`
 const response = await fetcher(endpoint,{headers,signal:AbortSignal.timeout(10000)})
 if (!response.ok) throw new Error('Public catalog unavailable')
 const rows = await response.json()
 if (!Array.isArray(rows)) throw new Error('Invalid public catalog')
 const published = rows.filter(row=>['active','closed'].includes(row.status)).map(row=>{
  const safe = Object.fromEntries(fields.split(',').map(key=>[key,row[key]]))
  if (safe.off_market) { safe.photos=[]; safe.observations=''; safe.portal_data={} }
  return safe
 })
 const paths = [...new Set(published.flatMap(row=>row.photos || []).map(photo=>photo.path).filter(Boolean))]
 if (!paths.length) return published
 const signed = await fetcher(`${config.url}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600,paths}),signal:AbortSignal.timeout(10000)})
 if (!signed.ok) throw new Error('Public media unavailable')
 const data = await signed.json()
 const urls = new Map(data.map(item=>[item.path,item.signedURL ? new URL(`${config.url}/storage/v1${item.signedURL}`).href : '']))
 return published.map(row=>({...row,photos:(row.photos || []).map(photo=>({id:photo.id,name:photo.name,caption:typeof photo.caption === 'string' ? photo.caption.slice(0,200) : '',path:photo.path,url:photo.path ? urls.get(photo.path) || '' : /^https:\/\//.test(photo.url || '') ? photo.url : ''}))}))
}
