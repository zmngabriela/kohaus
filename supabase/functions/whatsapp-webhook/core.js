// Provider parsing is pure and shared with the isolated tests.
export async function verifySignature(raw, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature || '')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['verify'])
  const bytes = Uint8Array.from(signature.slice(7).match(/../g), hex => parseInt(hex,16))
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw))
}
export function parseWebhook(payload, phoneId) {
  const messages=[], receipts=[]
  if (payload?.object !== 'whatsapp_business_account') return {messages,receipts}
  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value=change.value
    if (change.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId) continue
    for (const m of value.messages || []) {
      if (!m.id || !/^[1-9]\d{6,14}$/.test(m.from || '') || !/^\d{1,12}$/.test(String(m.timestamp))) continue
      const at = new Date(Number(m.timestamp)*1000)
      if (!Number.isFinite(at.getTime()) || at.getTime()>Date.now()+300000) continue
      const media=['image','audio','video','document','sticker'].includes(m.type) ? m[m.type] : null
      const body=m.text?.body || m.button?.text || m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || media?.caption || ''
      messages.push({provider_id:m.id,phone:m.from,phone_id:phoneId,at:at.toISOString(),name:value.contacts?.find(c=>c.wa_id===m.from)?.profile?.name || '',
        kind:media ? m.type : ['text','button','interactive'].includes(m.type) ? 'text' : 'unsupported', body:String(body).slice(0,10000),media_id:media?.id || null,media_name:media?.filename || null})
    }
    for(const s of value.statuses || []) {
      const at=new Date(Number(s.timestamp)*1000)
      if(!s.id || !['sent','delivered','read','failed'].includes(s.status) || !Number.isFinite(at.getTime())) continue
      receipts.push({provider_id:s.id,status:s.status,at:at.toISOString(),local_id:/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s.biz_opaque_callback_data || '') ? s.biz_opaque_callback_data : null,error:s.errors?.[0]?.code ? String(s.errors[0].code) : null})
    }
  }
  return {messages,receipts}
}
export function canReply(lastInbound, now=Date.now()) {
  const time=Date.parse(lastInbound)
  return Number.isFinite(time) && time<=now && now-time<24*60*60*1000
}
export function normalizedPhone(value='') {
  const text=String(value).trim()
  // Require a country code, never append a guessed country to a local number.
  if(!/^\+?[1-9][\d\s().-]{6,24}$/.test(text)) return null
  const digits=text.replace(/\D/g,'')
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : null
}
export function supportedTemplates(rows=[]) {
  return rows.filter(t=>t.status==='APPROVED' && t.name && t.language &&
    (t.parameter_format || 'POSITIONAL')==='POSITIONAL' &&
    (t.components || []).every(c=>c.type==='BODY' || (['HEADER','FOOTER'].includes(c.type) && (!c.format || c.format==='TEXT') && !/\{\{/.test(c.text || ''))))
    .map(t=>{const body=t.components?.find(c=>c.type==='BODY')?.text || '';return {name:t.name,language:t.language,body,parameters:[...new Set(body.match(/\{\{\d+\}\}/g) || [])].length}})
}
export function templatePayload(template, values) {
  if(!Array.isArray(values) || values.length!==template.parameters || values.some(v=>typeof v!=='string' || !v.trim() || v.length>1000)) throw new Error('INVALID_TEMPLATE_PARAMETERS')
  return {name:template.name,language:{code:template.language},...(values.length ? {components:[{type:'body',parameters:values.map(text=>({type:'text',text:text.trim()}))}]} : {})}
}
