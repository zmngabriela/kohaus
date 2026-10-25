const text={pt:['Proprietário vinculado','Sem vínculo','Cadastrar proprietário'],es:['Propietario vinculado','Sin vínculo','Crear propietario'],en:['Linked owner','Unlinked','Create owner']}
export default function PropertyOwner({Select,value,clients,language,onChange,onCreate}){
 const t=text[language]||text.es
 return <div className="dashboard-property-form-full property-owner-row">
  <label><span>{t[0]}</span><Select value={value||''} onChange={onChange} options={[{value:'',label:t[1]},...clients.map(c=>({value:c.id,label:[c.name,c.surname].filter(Boolean).join(' ')+(c.email?` · ${c.email}`:'')}))]} ariaLabel={t[0]} light className="dashboard-form-select" /></label>
  <button className="outline-button" type="button" onClick={onCreate}>{t[2]}</button>
 </div>
}
