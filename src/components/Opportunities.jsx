import CrmRecord from './CrmRecord'
import { matchProperties, contactLinks, propertyExtras } from '../lib/opportunities'
import { opportunityCopy } from '../lib/opportunityCopy'

export default function Opportunities({ clients, properties, language, copy, onClient, onProperty, error, loading }) {
  const c = opportunityCopy[language]
  const matches = clients.flatMap(client => matchProperties(client, properties).map(property => ({ client, property })))
  return <section className="dashboard-section opportunities-section">
    <div className="dashboard-properties-head"><div><p className="section-label dashboard-label">{c.title}</p><h2>{c.intro}</h2></div></div>
    {error ? <p role="alert">{c.pending}</p> : loading ? <p role="status">{c.loading}</p> : matches.length ? <div className="opportunities-list">{matches.map(({ client, property }) => {
      const links = contactLinks(client)
      return <CrmRecord key={`${client.id}-${property.id}`} language={language} title={`${client.name} ${client.surname}`} imageAlt={property.title} image={property.photos?.find(photo => photo.url)?.url}
        meta={`${property.reference} · ${property.title}`}
        fields={[
          { label: copy.dashboard.clientColumns.contact, value: [client.phone, client.email].filter(Boolean).join(' · ') || c.noContact },
          { label: copy.dashboard.clientColumns.budget, value: property.priceLabel || (property.priceValue != null ? new Intl.NumberFormat(language, { style: 'currency', currency: property.currency || 'EUR' }).format(property.priceValue) : '—') },
          { label: c.criteria, value: [`${copy.dashboard.propertyColumns.rooms}: ${property.rooms ?? '—'}`, `${copy.property.detailLabels.bathrooms}: ${property.bathrooms ?? '—'}`, `${property.surface} m²`, ...propertyExtras(property).map(extra => copy.catalog.extras[extra] || extra)].join(' · ') },
        ]}
        editLabel={c.edit} onEdit={() => onClient(client)}
        actions={<>
          {links.phone && <a href={links.phone}>{c.call}</a>}
          {links.whatsapp && <a href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
          {links.email && <a href={links.email}>{c.email}</a>}
          <button type="button" onClick={() => onProperty(property)}>{c.open}</button>
        </>} />
    })}</div> : <div className="dashboard-empty"><p>{c.empty}</p></div>}
  </section>
}
