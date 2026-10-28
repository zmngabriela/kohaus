import { useEffect } from 'react'
import { canonicalUrl, LANGUAGES, pageSeo, SITE_URL } from '../lib/seo'

export default function Seo({ route, property }) {
 const origin = import.meta.env.VITE_SITE_URL || SITE_URL
 const metadata = pageSeo(route, property, origin)
 useEffect(() => {
  document.head.querySelectorAll('[data-ssr-seo]').forEach(node=>node.remove())
  const nodes = []
  const add = (tag, attributes, text) => {
   const node = document.createElement(tag)
   for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,value)
   if (text) node.textContent = text
   document.head.appendChild(node); nodes.push(node)
  }
  document.title = metadata.title
  document.documentElement.lang = metadata.language
  add('meta', { name:'description', content:metadata.description })
  add('meta', { name:'robots', content:metadata.noindex || import.meta.env.VITE_APP_ENV !== 'production' ? 'noindex, follow' : 'index, follow, max-image-preview:large' })
  add('link', { rel:'canonical', href:metadata.canonical })
  for (const language of LANGUAGES) add('link',{rel:'alternate',hreflang:language,href:canonicalUrl({...route,language},origin)})
  add('link',{rel:'alternate',hreflang:'x-default',href:canonicalUrl({...route,language:'es'},origin)})
  for (const [key,value] of Object.entries({ title:metadata.title, description:metadata.description, url:metadata.canonical, type:'website', site_name:'KOHAUS Real Estate', image:new URL('/brand/kohaus-logo-transparent.png',origin).href })) add('meta',{property:`og:${key}`,content:value})
  add('meta',{name:'twitter:card',content:'summary'})
  add('script',{type:'application/ld+json'},JSON.stringify({ '@context':'https://schema.org', '@type':'Organization', name:'KOHAUS Real Estate', url:origin, logo:new URL('/brand/kohaus-logo.svg',origin).href, email:'hola@thekohaus.com', telephone:'+34665324791', sameAs:['https://www.instagram.com/guilhermeconinch.broker/','https://www.facebook.com/corretorguilhermeconinch/','https://www.linkedin.com/company/broker-guilherme-coninch/'] }))
  return () => nodes.forEach(node=>node.remove())
 }, [metadata.title,metadata.description,metadata.canonical,metadata.language,metadata.noindex,origin,route])
 return null
}
