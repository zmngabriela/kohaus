const supabaseUrl = process.env.VITE_SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!supabaseUrl || !publishableKey) throw new Error('Supabase integration check requires the configured URL and publishable key.')
const headers={apikey:publishableKey,Authorization:`Bearer ${publishableKey}`}
async function read(path){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{headers});if(!response.ok)throw new Error(`Query failed (${response.status}): ${path}: ${await response.text()}`);return response.json()}
const properties=await read('public_properties?select=*&status=eq.active')
if(!Array.isArray(properties))throw new Error('Invalid public catalogue response')
for(const property of properties){
 if('private_address' in property || 'property_private' in property || 'history' in property || 'portal_publications' in property)throw new Error('Private field present in the public catalogue')
 if(property.off_market && property.photos.length)throw new Error('Off-market photos exposed')
 if(['address','street','streetNumber','contactEmail','contactPhone'].some(key=>key in property.portal_data))throw new Error('Private portal field exposed')
}
for(const table of ['dashboard_properties?select=id,property_private(address)','property_private?select=property_id,address','dashboard_clients?select=id,language','dashboard_visits?select=id','owner_leads?select=id','dashboard_users?select=user_id','dashboard_invoices?select=id','dashboard_invoice_settings?select=id']){
 const rows=await read(table)
 if(rows.length)throw new Error(`Private CRM rows publicly readable: ${table}`)
}
console.log(`Supabase integration check passed: ${properties.length} published properties; private CRM tables inaccessible to anonymous visitors.`)
