import { canonicalUrl, DESTINATIONS } from '../lib/seo'
const content = {
 pt: { title:'Comprar, alugar e investir', intro:'Cada projeto começa com um objetivo: morar, investir ou encontrar uma nova oportunidade. A KOHAUS acompanha buscas em Barcelona e na Costa Brava e mantém conexões em Itapema e Balneário Camboriú, no Brasil.', buy:'Ver imóveis à venda', rent:'Ver imóveis para alugar', places:['Barcelona','Costa Brava','Itapema','Balneário Camboriú'] },
 es: { title:'Comprar, alquilar e invertir', intro:'Cada proyecto comienza con un objetivo: vivir, invertir o encontrar una nueva oportunidad. KOHAUS acompaña búsquedas en Barcelona y la Costa Brava y mantiene conexiones en Itapema y Balneário Camboriú, en Brasil.', buy:'Ver inmuebles en venta', rent:'Ver inmuebles en alquiler', places:['Barcelona','Costa Brava','Itapema','Balneário Camboriú'] },
 en: { title:'Buy, rent and invest', intro:'Every project starts with a goal: a home, an investment or a new opportunity. KOHAUS supports property searches in Barcelona and Costa Brava, with connections in Itapema and Balneário Camboriú, Brazil.', buy:'View properties for sale', rent:'View properties to rent', places:['Barcelona','Costa Brava','Itapema','Balneário Camboriú'] },
}
export default function Markets({language}) {
 const c=content[language] || content.es
 return <section className="markets-section"><h2>{c.title}</h2><p>{c.intro}</p><nav className="markets-grid" aria-label={c.title}>{DESTINATIONS.map((destination,index)=><div key={destination}><h3>{c.places[index]}</h3>{['comprar','alquilar'].map(operation=><a key={operation} href={new URL(canonicalUrl({view:'catalogo',language,operation,destination})).search}>{operation==='comprar'?c.buy:c.rent}</a>)}</div>)}</nav></section>
}
