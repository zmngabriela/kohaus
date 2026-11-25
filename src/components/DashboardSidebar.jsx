const groups = [
  { sections:['overview','inbox'] },
  { sections:['properties','clients','visits','tasks'], pt:'Gestão', es:'Gestión', en:'Management' },
  { sections:['leads','opportunities','prospecting','portals'], pt:'Comercial', es:'Comercial', en:'Sales' },
  { sections:['invoices'], pt:'Financeiro', es:'Finanzas', en:'Finance' },
]

export default function DashboardSidebar({ copy, language, section, onSelect, account, email, siteHref, onLanguageChange, onSignOut }) {
  const sections = copy.dashboard.sections
  return <aside className="dashboard-sidebar">
    <p className="section-label">CRM KOHAUS</p>
    <nav aria-label="Dashboard sections">
      {groups.map(group => <div className="dashboard-nav-group" key={group.sections[0]}>
        {group[language] && <small>{group[language]}</small>}
        {group.sections.map(key => <button key={key} type="button"
          className={key === section ? 'dashboard-tab is-active' : 'dashboard-tab'}
          aria-current={key === section ? 'page' : undefined}
          onClick={() => onSelect(key)}>{sections[key]}</button>)}
      </div>)}
    </nav>
    <select className="dashboard-mobile-nav" aria-label={copy.dashboard.label} value={section} onChange={event => onSelect(event.target.value)}>
      {groups[0].sections.map(key => <option key={key} value={key}>{sections[key]}</option>)}
      {groups.slice(1).map(group => <optgroup key={group.sections[0]} label={group[language]}>
        {group.sections.map(key => <option key={key} value={key}>{sections[key]}</option>)}
      </optgroup>)}
    </select>
    <DashboardUtilities copy={copy} language={language} siteHref={siteHref}
      onLanguageChange={onLanguageChange} onSignOut={onSignOut}>
      {account && <div className="dashboard-account" aria-label={copy.auth.signedInAs}>
        <strong>{account.display_name || email}</strong>
        <small>{copy.auth.roleLabel} · {account.role}</small>
      </div>}
    </DashboardUtilities>
  </aside>
}


export function DashboardUtilities({ copy, language, siteHref, onLanguageChange, onSignOut, children }) {
  const labels = {
    pt: { site: 'Ver site', language: 'Idioma' },
    es: { site: 'Ver sitio web', language: 'Idioma' },
    en: { site: 'View website', language: 'Language' },
  }[language]
  return <div className="dashboard-utilities">
    <a className="outline-button" href={siteHref}>{labels.site}</a>
    {children}
    <label>{labels.language}
      <select value={language} onChange={event=>onLanguageChange(event.target.value)}>
        <option value="pt">Português</option>
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </label>
    {onSignOut && <button type="button" className="outline-button" onClick={onSignOut}>{copy.nav.signOut}</button>}
  </div>
}
