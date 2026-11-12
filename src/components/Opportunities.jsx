import { matchProperties, contactLinks } from '../lib/opportunities'
import { opportunityCopy } from '../lib/opportunityCopy'
import { listingSummary, shareCopy, shareOpportunities } from '../lib/opportunityShare'
import { propertyTranslations } from '../lib/propertyTranslations'
import './Opportunities.css'

const fullName = client => [client.name,client.surname].filter(Boolean).join(' ')

export default function Opportunities({ clients, properties, language, copy, onClient, onProperty, filters, onFilter, Select, error, loading }) {
  const c = opportunityCopy[language]
  const labels = shareCopy[language]
  const groups = clients.filter(client=>!filters.client || client.id===filters.client).map(client=>{
    const all = matchProperties(client,properties)
    const visible = filters.property ? all.filter(p=>p.id===filters.property) : all
    return {client,all,visible}
  }).filter(group=>group.visible.length)

  function field(key,label,items) {
    return <label><span>{label}</span><Select light className="dashboard-filter-select" ariaLabel={label} value={filters[key] || ''} onChange={value=>onFilter({...filters,[key]:value})} options={[{value:'',label:copy.catalog.all},...items]} /></label>
  }
  return <section className="dashboard-section opportunities-section">
    <div className="dashboard-properties-head"><div><p className="section-label dashboard-label">{c.title}</p><h2>{c.intro}</h2></div></div>
    <div className="dashboard-property-filters">
      {field('client',copy.dashboard.visitFields.client,clients.map(client=>({value:client.id,label:fullName(client)})))}
      {field('property',copy.dashboard.visitFields.property,properties.map(p=>({value:p.id,label:[p.reference,p.title].filter(Boolean).join(' · ')})))}
    </div>
    {error ? <p role="alert">{c.pending}</p> : loading ? <p role="status">{c.loading}</p> : groups.length ? <div className="opportunities-list">{groups.map(({client,all,visible})=>{
      const links = contactLinks(client)
      return <article className="opportunity-card" key={client.id}>
        <header><h3>{fullName(client)}</h3><p>{[client.phone,client.email].filter(Boolean).join(' · ') || c.noContact}</p></header>
        <ul>{visible.map(p=>{
          const title = propertyTranslations(p,'title')[language]
          const photo = p.photos?.find(image=>image.thumbnailUrl || image.url)
          return <li key={p.id}>
            {photo && <img loading="lazy" alt={title} src={photo.thumbnailUrl || photo.url}/>}
            <div><small>{p.reference}</small><h4>{title}</h4><p>{listingSummary(p,language)}</p></div>
            {!p.offMarket && <button type="button" className="dashboard-property-edit" onClick={()=>onProperty(p)}>{c.open}</button>}
          </li>
        })}</ul>
        <div className="opportunity-actions">
          {links.phone && <a href={links.phone}>{c.call}</a>}
          {links.email && <a href={links.email}>{c.email}</a>}
          <button type="button" onClick={()=>onClient(client)}>{c.edit}</button>
          {links.whatsapp && <>
            <a href={links.whatsapp} target="_blank" rel="noreferrer">{labels.chat}</a>
            <a className="solid-button" href={links.whatsapp+'?'+new URLSearchParams({text:shareOpportunities(client,all)})} target="_blank" rel="noreferrer">{labels.share} ({all.length})</a>
          </>}
        </div>
      </article>
    })}</div> : <div className="dashboard-empty"><p>{c.empty}</p></div>}
  </section>
}
