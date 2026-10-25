export default function PropertyEditorActions({editing,busy,language,saveLabel,savingLabel,onDelete}) {
 const deleteLabel={pt:'Excluir imóvel',es:'Eliminar inmueble',en:'Delete property'}[language] || 'Delete property'
 return <div className="property-editor-actions">
  {editing && <button type="button" className="dashboard-editor-secondary" disabled={busy} onClick={onDelete}>{deleteLabel}</button>}
  <button type="submit" className="dashboard-property-submit" disabled={busy}>{busy?savingLabel:saveLabel}</button>
 </div>
}
