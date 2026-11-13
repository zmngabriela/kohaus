import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { feedProperty } from './property.js'

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
Deno.serve(async req => {
  if (req.method !== 'GET') return reply({error:'method'},405)
  const token = Deno.env.get('IDEALISTA_FEED_TOKEN')
  if (!token || req.headers.get('Authorization') !== 'Bearer ' + token) return reply({error:'unauthorized'},401)
  const code = Deno.env.get('IDEALISTA_API_SECRET')
  if (!code) return reply({error:'missing_customer_code'},503)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const contact = {contactName:'Guilherme Coninch',contactEmail:'hola@kohausrealestate.com',contactPrimaryPhonePrefix:'34',contactPrimaryPhoneNumber:'665324791'}
  try {
    const {data, error, count} = await db.from('dashboard_properties')
      .select('id,reference,type,price_value,currency,operation,title,surface,rooms,bathrooms,photos,portal_data,portal_publications', {count:'exact'})
      .eq('status','active').eq('off_market',false)
      .contains('portal_publications',JSON.stringify([{portalId:'idealista',feedEnabled:true}])).order('id')
    if (error || !data || data.length !== count) throw Error('incomplete_query')
    if (!data.length) return reply({error:'empty_feed'},409)
    const properties = []
    const codes = new Set()
    for (const row of data) {
      const images = []
      for (const photo of row.photos || []) {
        let url = photo.url
        if (photo.path) {
          const signed = await db.storage.from('property-media').createSignedUrl(photo.path,86400)
          if (signed.error) throw Error('missing_image')
          url = signed.data.signedUrl
        }
        if (!url || new URL(url).protocol !== 'https:') throw Error('invalid_image')
        images.push({imageUrl:url,imageOrder:images.length+1})
      }
      const item = feedProperty(row,images)
      if (codes.has(item.propertyCode)) throw Error('duplicate_code')
      codes.add(item.propertyCode)
      properties.push(item)
    }
    return reply({customerCountry:'Spain',customerCode:code,customerReference:'KOHAUS',customerContact:contact,customerProperties:properties})
  } catch { return reply({error:'feed_incomplete'},503) }
})
