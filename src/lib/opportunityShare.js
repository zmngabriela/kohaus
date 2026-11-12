import { propertyPrice } from './propertyPrice'
import { propertyTranslations } from './propertyTranslations'
import { canonicalUrl } from './seo'

export const shareCopy = {
 pt:{chat:'Enviar mensagem no WhatsApp',share:'Enviar oportunidades no WhatsApp',hello:'Olá',intro:'Separei estes imóveis que combinam com o que você procura.',rooms:'quartos',end:'Qual deles você gostaria de conhecer melhor?'},
 es:{chat:'Enviar mensaje por WhatsApp',share:'Enviar oportunidades por WhatsApp',hello:'Hola',intro:'He seleccionado estas propiedades que encajan con lo que buscas.',rooms:'hab.',end:'¿Cuál te gustaría conocer mejor?'},
 en:{chat:'Send a WhatsApp message',share:'Send opportunities on WhatsApp',hello:'Hi',intro:'I picked out these properties that match what you’re looking for.',rooms:'bedrooms',end:'Which one would you like to know more about?'},
}

export function listingSummary(property, language) {
 const amount = propertyPrice(property)
 return [
   property.destination,
   property.rooms > 0 && `${property.rooms} ${shareCopy[language].rooms}`,
   property.surface > 0 && `${property.surface} m²`,
   amount ? new Intl.NumberFormat(language,{style:'currency',currency:property.currency || 'EUR'}).format(amount) : property.priceLabel,
 ].filter(Boolean).join(' · ')
}

export function shareOpportunities(client, properties) {
 const language = Object.hasOwn(shareCopy,client.language) ? client.language : 'es'
 const c = shareCopy[language]
 const listings = properties.map((p,index) => {
   const title = p.offMarket ? 'Off-market' : propertyTranslations(p,'title')[language]
   const url = p.offMarket ? '' : canonicalUrl({view:'anuncio',propertyId:p.id,language})
   return [`${index+1}. ${title} · ${p.reference}`, listingSummary(p,language),url].filter(Boolean).join('\n')
 })
 return [[c.hello,client.name].filter(Boolean).join(', ')+'!',c.intro,...listings,c.end].join('\n\n')
}
