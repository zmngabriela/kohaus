import { cityKey } from './propertyCities.js'
export const SITE_URL = 'https://kohaus.pages.dev'
export const LANGUAGES = ['es', 'pt', 'en']
export const DESTINATIONS = ['barcelona', 'costa-brava', 'itapema', 'balneario camboriu']
const names = { barcelona: 'Barcelona', 'costa-brava': 'Costa Brava', itapema: 'Itapema', 'balneario camboriu': 'Balneário Camboriú' }
const copy = {
 es: { home: 'Inmuebles en Barcelona y Costa Brava', intro: 'Compra, alquiler e inversión inmobiliaria con KOHAUS. Una mirada selectiva en Barcelona y la Costa Brava, con conexiones en Brasil y Portugal.', buy: 'Inmuebles en venta', rent: 'Inmuebles en alquiler', all: 'Barcelona, Costa Brava y Brasil', about: 'Sobre nosotros', contact: 'Contacto', captacion: 'Vender o alquilar tu propiedad', legal: 'Aviso legal', privacy: 'Política de privacidad', cookies: 'Política de cookies', 'off-market': 'Propiedades off-market', anuncio: 'Detalle del inmueble', listing: 'Consulta las propiedades disponibles, sus características y precios. Contacta con KOHAUS para conocer las opciones que encajan con tu búsqueda.' },
 pt: { home: 'Imóveis em Barcelona e Costa Brava', intro: 'Compra, aluguel e investimento imobiliário com a KOHAUS. Um olhar seletivo em Barcelona e na Costa Brava, com conexões no Brasil e em Portugal.', buy: 'Imóveis à venda', rent: 'Imóveis para alugar', all: 'Barcelona, Costa Brava e Brasil', about: 'Sobre nós', contact: 'Contato', captacion: 'Vender ou alugar seu imóvel', legal: 'Aviso legal', privacy: 'Política de privacidade', cookies: 'Política de cookies', 'off-market': 'Imóveis off-market', anuncio: 'Detalhes do imóvel', listing: 'Consulte os imóveis disponíveis, suas características e preços. Fale com a KOHAUS para conhecer as opções que combinam com sua busca.' },
 en: { home: 'Property in Barcelona and Costa Brava', intro: 'Buy, rent and explore property investment with KOHAUS. A selective perspective in Barcelona and Costa Brava, with connections in Brazil and Portugal.', buy: 'Property for sale', rent: 'Property to rent', all: 'Barcelona, Costa Brava and Brazil', about: 'About us', contact: 'Contact', captacion: 'Sell or rent your property', legal: 'Legal notice', privacy: 'Privacy policy', cookies: 'Cookie policy', 'off-market': 'Off-market properties', anuncio: 'Property details', listing: 'Explore available properties, features and prices. Contact KOHAUS to discuss options that fit your search.' },
}
export function canonicalUrl(route, origin = SITE_URL) {
 const url = new URL('/', origin)
 const view = route.view || 'home'
 if (view !== 'home') url.searchParams.set('view', view)
 url.searchParams.set('lang', LANGUAGES.includes(route.language) ? route.language : 'es')
 if (view === 'catalogo' || view === 'off-market') {
  url.searchParams.set('op', route.operation || (view === 'off-market' ? 'all' : 'comprar'))
  url.searchParams.set('dest', cityKey(route.destination || 'todos'))
 }
 if (view === 'anuncio') url.searchParams.set('id', route.propertyId || '')
 return url.href
}
export function pageSeo(route, property, origin = SITE_URL) {
 const language = LANGUAGES.includes(route.language) ? route.language : 'es'
 const c = copy[language], view = route.view || 'home'
 const destination = names[cityKey(route.destination || '')] || (route.destination !== 'todos' && route.destination) || c.all
 let title = c[view] || 'KOHAUS'
 let description = c.intro
 if (view === 'catalogo') {
  title = `${route.operation === 'alquilar' ? c.rent : c.buy} ${language === 'en' ? 'in' : language === 'pt' ? 'em' : 'en'} ${destination}`
  description = `${title}. ${c.listing}`
 }
 if (view === 'anuncio' && property) {
  title = typeof property.title === 'object' ? property.title[language] || property.title.es : property.title
  const text = property.description || property.observations
  description = (typeof text === 'object' ? text[language] || text.es : text) || c.listing
 }
 return { title: `${title} | KOHAUS Real Estate`, description: description.replace(/\s+/g, ' ').trim().slice(0, 165), canonical: canonicalUrl({...route,language}, origin), language,
  noindex: !['home','catalogo','off-market','about','contact','captacion','anuncio','legal','privacy','cookies'].includes(view) || Boolean(route.reference),
 }
}
