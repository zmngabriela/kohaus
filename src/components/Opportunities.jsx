import { useState } from 'react'
import { normalizeTypes } from '../lib/clientCriteria'
import { matchProperties, contactLinks, propertyExtras } from '../lib/opportunities'
import './Opportunities.css'
import { opportunityCopy } from '../lib/opportunityCopy'
function PropertyThumbnail({ property, language, onOpen }) {
  const url = property.photos?.find(photo => photo.url)?.url
  const [failedUrl, setFailedUrl] = useState(null)
  const noPhoto = { pt: 'Sem foto', es: 'Sin foto', en: 'No photo' }[language]
  return <button type="button" className="opportunity-thumbnail" onClick={onOpen} aria-label={`${opportunityCopy[language].open}: ${property.title}`}>
    {url && failedUrl !== url ? <img src={url} alt={property.title} loading="lazy" onError={() => setFailedUrl(url)} /> : <span>{noPhoto}</span>}
  </button>
}

export default function Opportunities({ clients, properties, language, copy, onClient, onProperty, error, loading }) {
  const c = opportunityCopy[language]
  const matches = clients.flatMap(client => matchProperties(client, properties).map(property => ({ client, property })))
  return <section className="dashboard-section opportunities-section"><div className="dashboard-properties-head"><div><p className="section-label dashboard-label">{c.title}</p><h2>{c.intro}</h2></div></div>
    {error ? <p role="alert">{c.pending}</p> : loading ? <p role="status">{c.loading}</p> : matches.length ? <div className="opportunities-list">{matches.map(({ client, property }) => {
      const links = contactLinks(client)
      return <article className="opportunity-card" key={`${client.id}-${property.id}`}>
        <PropertyThumbnail property={property} language={language} onOpen={() => onProperty(property)} />
        <div><p className="dashboard-property-reference">{property.operation === 'comprar' ? copy.nav.buy : copy.nav.rent} · {property.reference}</p><h3>{client.name} {client.surname}</h3><h4>{property.title}</h4><p>{property.priceLabel || (property.priceValue != null ? new Intl.NumberFormat(language, { style: 'currency', currency: property.currency || 'EUR' }).format(property.priceValue) : '—')}</p>
        <div className="opportunity-facts"><span>{copy.dashboard.propertyColumns.rooms}: {property.rooms ?? '—'}</span><span>{copy.property.detailLabels.bathrooms}: {property.bathrooms ?? '—'}</span><span>{property.surface} m²</span>{propertyExtras(property).map(extra => <span key={extra}>{copy.catalog.extras[extra] || extra}</span>)}</div>
        <p className="opportunity-criteria">{c.criteria}: {[client.destinations?.length ? client.destinations.join(', ') : null, client.types?.length ? normalizeTypes(client.types).map(type => copy.catalog.types[type]).join(', ') : null, client.budgetMin || client.budgetMax ? `${copy.dashboard.clientColumns.budget}: ${client.budgetMin || 0}–${client.budgetMax || '∞'} ${client.currency || 'EUR'}` : null, client.minRooms ? `${copy.dashboard.clientFields.minRooms}: ${client.minRooms}` : null, client.minBathrooms ? `${c.bathrooms}: ${client.minBathrooms}` : null, client.minSurface ? `${copy.dashboard.clientFields.minSurface}: ${client.minSurface}` : null, ...(client.requiredExtras || []).map(extra => copy.catalog.extras[extra])].filter(Boolean).join(' · ') || (property.operation === 'comprar' ? copy.nav.buy : copy.nav.rent)}</p></div>
        <div className="opportunity-contact"><p>{client.phone} {client.email}</p><div className="opportunity-actions">{links.phone && <a href={links.phone}>{c.call}</a>}{links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}{links.email && <a href={links.email}>{c.email}</a>}<button type="button" onClick={() => onProperty(property)}>{c.open}</button><button type="button" onClick={() => onClient(client)}>{c.edit}</button></div>{!links.phone && !links.email && <p>{c.noContact}</p>}{links.phone && !links.whatsapp && <p>{c.phoneHint}</p>}</div>
      </article>
    })}</div> : <div className="dashboard-empty"><p>{c.empty}</p></div>}
  </section>
}
