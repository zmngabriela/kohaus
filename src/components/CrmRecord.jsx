import { useState } from 'react'
import EditorDialog from './EditorDialog'
import './CrmRecord.css'

export default function CrmRecord({ title, meta, fields = [], status, image, imageAlt = title, editLabel, onEdit, language, children, actions, disabled = false, className = '' }) {
  const [editing, setEditing] = useState(false)
  const labels = { pt: ['Gerenciar', 'Fechar'], es: ['Gestionar', 'Cerrar'], en: ['Manage', 'Close'] }[language] || ['Manage', 'Close']
  return <article className={`crm-record ${className}`}>
    <div className={`crm-record-summary${image ? ' has-image' : ''}`}>
      {image && <img src={image} alt={imageAlt} loading="lazy" />}
      <div className="crm-record-copy"><h3>{title}</h3><p>{meta}</p>
        <dl className="crm-record-fields">{fields.filter(field => field.value).map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
      </div>
      <div className="crm-record-actions"><span>{status}</span>
        {onEdit && <button type="button" className="dashboard-property-edit" disabled={disabled} onClick={onEdit}>{editLabel}</button>}
        {actions}
        {children && <button type="button" className="dashboard-property-edit" onClick={() => setEditing(true)}>{labels[0]}</button>}
      </div>
    </div>
    {editing && <EditorDialog title={title} closeLabel={labels[1]} onClose={() => setEditing(false)}><div className="crm-record-editor">{children}</div></EditorDialog>}
  </article>
}
