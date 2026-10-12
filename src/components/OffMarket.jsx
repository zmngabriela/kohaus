import { useEffect, useRef, useState } from 'react'
import './CrmExtensions.css'
const copy = {
 pt: { title: 'Imóveis que pedem discrição.', text: 'Uma seleção reservada para compra e aluguel. Conheça os detalhes em uma conversa com a KOHAUS.', all: 'Todos', buy: 'Comprar', rent: 'Alugar', image: 'Imagem ilustrativa', request: 'Solicitar informações', empty: 'Nenhum imóvel off-market disponível no momento.', name: 'Nome', surname: 'Sobrenome', email: 'E-mail', phone: 'Telefone', message: 'Mensagem', send: 'Enviar pedido', success: 'Recebemos seu pedido. A KOHAUS entrará em contato.', consent: 'Concordo com o uso dos meus dados para responder a este pedido.', cancel: 'Fechar', error: 'Não foi possível enviar. Tente novamente.' },
 es: { title: 'Propiedades que requieren discreción.', text: 'Una selección reservada de compra y alquiler. Conoce los detalles en una conversación con KOHAUS.', all: 'Todos', buy: 'Comprar', rent: 'Alquilar', image: 'Imagen ilustrativa', request: 'Solicitar información', empty: 'No hay propiedades off-market disponibles por ahora.', name: 'Nombre', surname: 'Apellidos', email: 'Email', phone: 'Teléfono', message: 'Mensaje', send: 'Enviar solicitud', success: 'Hemos recibido tu solicitud. KOHAUS se pondrá en contacto contigo.', consent: 'Acepto el uso de mis datos para responder a esta solicitud.', cancel: 'Cerrar', error: 'No se pudo enviar. Inténtalo de nuevo.' },
 en: { title: 'Properties that call for discretion.', text: 'A private selection for sale and rent. Discover the details in a conversation with KOHAUS.', all: 'All', buy: 'Buy', rent: 'Rent', image: 'Illustrative image', request: 'Request information', empty: 'No off-market properties are currently available.', name: 'Name', surname: 'Surname', email: 'Email', phone: 'Phone', message: 'Message', send: 'Send request', success: 'We received your request. KOHAUS will be in touch.', consent: 'I agree to the use of my data to respond to this request.', cancel: 'Close', error: 'Could not send. Please try again.' },
}
export default function OffMarket({ property, language, onSubmit, onClose }) {
 const section = useRef(null)
 useEffect(() => { section.current?.scrollIntoView?.({behavior:'smooth',block:'center'}) }, [])
 const c = copy[language]
 const [busy,setBusy] = useState(false), [result,setResult] = useState(''), [sent,setSent] = useState(false)
 async function submit(event) {
  event.preventDefault()
  const form = new FormData(event.currentTarget)
  setBusy(true); setResult('')
  try {
   await onSubmit({name:form.get('name'),surname:form.get('surname'),phone:form.get('phone'),email:form.get('email'),comments:`Off-market ${property.reference}\n${form.get('message')}`,address:property.reference,city:property.destination,operation:property.operation,source:'property_request',language,legalAccepted:true,newsletterAccepted:false})
   setSent(true); setResult(c.success)
  } catch { setResult(c.error) } finally { setBusy(false) }
 }
 return <section ref={section} className="offmarket-request" aria-label={c.request}>
  <h2>{c.request} · {property.reference}</h2>
  {result && <p role="status">{result}</p>}
  {!sent && <form onSubmit={submit} className="crm-extension-form"><fieldset disabled={busy}>
   {['name','surname','email','phone'].map(key=><label key={key}>{c[key]}<input name={key} type={key==='email'?'email':key==='phone'?'tel':'text'} required /></label>)}
   <label>{c.message}<textarea name="message" /></label>
   <label className="offmarket-consent"><input type="checkbox" required />{c.consent}</label>
   <button type="submit">{c.send}</button>
  </fieldset></form>}
  <button type="button" className="outline-button" onClick={onClose}>{c.cancel}</button>
 </section>
}
