import { useState } from 'react'
import { ContactForm } from './CompanyPages'

export const searchCopy = {
  pt: { empty: 'Nenhum imóvel encontrado com estes critérios.', action: 'Avise-me quando receber algo assim', note: 'O que mais você procura? (opcional)', source: 'Busca sem resultados', success: 'Busca registrada. Guilherme entrará em contato se receber um imóvel com esse perfil.' },
  es: { empty: 'No se han encontrado inmuebles con estos criterios.', action: 'Avísame cuando llegue algo así', note: '¿Qué más buscas? (opcional)', source: 'Búsqueda sin resultados', success: 'Búsqueda registrada. Guilherme te contactará si recibe un inmueble de este perfil.' },
  en: { empty: 'No properties match these criteria.', action: 'Let me know when something like this comes in', note: 'What else are you looking for? (optional)', source: 'Search with no results', success: 'Search saved. Guilherme will contact you if a matching property comes in.' },
}

export default function EmptyCatalogLead({ language, criteria, city, operation, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const c = searchCopy[language]
  return <section className="empty-catalog-lead">
    <p>{c.empty}</p>
    {sent ? <p role="status">{c.success}</p> : <>
      <button type="button" className="solid-button" aria-expanded={open} onClick={() => setOpen(!open)}>{c.action}</button>
      {open && <><p>{criteria}</p><ContactForm language={language} messageLabel={c.note} messageRequired={false} onSubmit={async fields => {
        await onSubmit({ ...fields, language, city, operation, source:'catalog-alert', address:'', comments:[criteria, fields.message].filter(Boolean).join('\n'), legalAccepted:true, newsletterAccepted:false })
        setSent(true)
      }} /></>}
    </>}
  </section>
}
