import React from 'react'
import { renderToString } from 'react-dom/server.edge'
import App, { parseRoute, mapPropertyFromSupabase } from './App'
import { pageSeo, canonicalUrl, LANGUAGES, SITE_URL } from './lib/seo'
import { preferredLanguage } from './lib/language'

export const serverConfig = {
 url: import.meta.env.VITE_SUPABASE_URL,
 key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
 bucket: import.meta.env.VITE_SUPABASE_PROPERTY_MEDIA_BUCKET || 'property-media',
 production: import.meta.env.VITE_APP_ENV === 'production',
 origin: import.meta.env.VITE_SITE_URL || SITE_URL,
}
export const publicViews = ['home','catalogo','off-market','anuncio','about','contact','captacion','legal','privacy','cookies']
export function requestRoute(url, acceptLanguage = '') {
 const languages = acceptLanguage.split(',').map(item=>item.split(';')[0].trim())
 return parseRoute(new URL(url).search, preferredLanguage(languages))
}
const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function renderPage(route, rows) {
 const properties = rows.map(mapPropertyFromSupabase)
 const selected = rows.find(p=>p.id===route.propertyId)
 const localized = selected?.portal_data?.translations?.[route.language]
 const seo = pageSeo(route, selected ? {...selected,title:localized?.title || selected.title,description:localized?.description || selected.observations} : null, serverConfig.origin)
 const initialPage = {route, properties, catalogLoaded: ['home','catalogo','off-market','anuncio'].includes(route.view)}
 const html = renderToString(<App initialPage={initialPage} />)
 const attributes = (tag, attrs) => `<${tag} data-ssr-seo ${Object.entries(attrs).map(([key,value])=>`${key}="${escape(value)}"`).join(' ')}>`
 const head = attributes('meta',{name:'description',content:seo.description}) + attributes('meta',{name:'robots',content:seo.noindex || !serverConfig.production ? 'noindex, follow' : 'index, follow, max-image-preview:large'}) + attributes('link',{rel:'canonical',href:seo.canonical}) + LANGUAGES.map(language=>attributes('link',{rel:'alternate',hreflang:language,href:canonicalUrl({...route,language},serverConfig.origin)})).join('') + Object.entries({title:seo.title,description:seo.description,url:seo.canonical,type:'website',image:new URL('/brand/kohaus-logo-transparent.png',serverConfig.origin).href}).map(([key,value])=>attributes('meta',{property:`og:${key}`,content:value})).join('')
 // JSON is inert data; escaping '<' prevents user-authored descriptions from closing the script.
 const state = JSON.stringify(initialPage).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
 return {html,head,state,title:escape(seo.title),language:seo.language}
}
