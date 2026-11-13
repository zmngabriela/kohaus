const groups = [
  { sections:['overview'] },
  { sections:['properties','clients','visits','tasks'], pt:'Gestão', es:'Gestión', en:'Management' },
  { sections:['prospecting','leads','opportunities','portals'], pt:'Comercial', es:'Comercial', en:'Sales' },
  { sections:['invoices'], pt:'Financeiro', es:'Finanzas', en:'Finance' },
]

export default function DashboardSidebar({ copy, language, section, onSelect, account, email }) {
  const sections = copy.dashboard.sections
  return <aside className="dashboard-sidebar">
    <p className="section-label">{copy.dashboard.label}</p>
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
      <option value="overview">{sections.overview}</option>
      {groups.slice(1).map(group => <optgroup key={group.sections[0]} label={group[language]}>
        {group.sections.map(key => <option key={key} value={key}>{sections[key]}</option>)}
      </optgroup>)}
    </select>
    {account && <div className="dashboard-account" aria-label={copy.auth.signedInAs}>
      <strong>{account.display_name || email}</strong>
      <small>{copy.auth.roleLabel} · {account.role}</small>
    </div>}
  </aside>
}
