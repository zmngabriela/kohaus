import FormNotice from './FormNotice'
import PrivacyConsent from './PrivacyConsent'
import guilhermePortrait from '../assets/guilherme-coninch.png'
import { useState } from 'react'
import './CompanyPages.css'

export const companyContact = { email: 'hola@kohausrealestate.com', phone: '+34 665 32 47 91', tel: '+34665324791' }
export const companyCopy = {
 pt: { contact:'Contato', about:'Sobre nós', title:'Toda conexão começa com uma conversa.', intro:'Para informações, ideias ou uma nova possibilidade, fale com a KOHAUS.', location:'Barcelona, Espanha', form:'Vamos conversar', name:'Nome', surname:'Sobrenome', email:'E-mail', phone:'Telefone', message:'Mensagem', send:'Enviar mensagem', sending:'Enviando…', consent:'Li a política de privacidade.', privacy:'Privacidade', success:'Mensagem recebida. Entraremos em contato pelo e-mail ou telefone informado.', error:'Não foi possível enviar. Tente novamente ou fale conosco por e-mail.', headline:'Pessoas, lugares e possibilidades.', statement:'Um olhar atento para o que torna cada conexão única.', body:'A KOHAUS conecta pessoas a espaços com identidade e oportunidades com sentido. Curadoria, conhecimento local e visão internacional orientam uma forma mais próxima de viver o mercado imobiliário.', approach:'Cada busca tem seu contexto. Cada imóvel, seu valor. Por isso, o atendimento começa pela escuta e segue com critério, clareza e atenção aos detalhes.', person:'Por trás das conexões', role:'Guilherme Coninch', bio:'À frente da KOHAUS, Guilherme reúne sua experiência no mercado imobiliário de Barcelona a uma rede de parceiros. Um acompanhamento direto e pessoal, com as conexões certas para cada projeto.', cta:'Converse com a KOHAUS', rights:'Todos os direitos reservados.' },
 es: { contact:'Contacto', about:'Sobre nosotros', title:'Toda conexión empieza con una conversación.', intro:'Para información, ideas o una nueva posibilidad, habla con KOHAUS.', location:'Barcelona, España', form:'Hablemos', name:'Nombre', surname:'Apellidos', email:'Email', phone:'Teléfono', message:'Mensaje', send:'Enviar mensaje', sending:'Enviando…', consent:'He leído la política de privacidad.', privacy:'Privacidad', success:'Mensaje recibido. Nos pondremos en contacto por el email o teléfono indicado.', error:'No se pudo enviar. Inténtalo de nuevo o escríbenos por email.', headline:'Personas, lugares y posibilidades.', statement:'Una mirada atenta a lo que hace única cada conexión.', body:'KOHAUS conecta personas con espacios con identidad y oportunidades con sentido. Selección cuidada, conocimiento local y visión internacional definen una forma más cercana de vivir el mercado inmobiliario.', approach:'Cada búsqueda tiene su contexto. Cada inmueble, su valor. Por eso, el acompañamiento empieza por escuchar y continúa con criterio, claridad y atención al detalle.', person:'Detrás de las conexiones', role:'Guilherme Coninch', bio:'Al frente de KOHAUS, Guilherme combina su experiencia en el mercado inmobiliario de Barcelona con una red de colaboradores. Un acompañamiento directo y personal, con las conexiones adecuadas para cada proyecto.', cta:'Habla con KOHAUS', rights:'Todos los derechos reservados.' },
 en: { contact:'Contact', about:'About us', title:'Every connection starts with a conversation.', intro:'For information, ideas or a new possibility, get in touch with KOHAUS.', location:'Barcelona, Spain', form:'Let’s talk', name:'First name', surname:'Last name', email:'Email', phone:'Phone', message:'Message', send:'Send message', sending:'Sending…', consent:'I have read the privacy policy.', privacy:'Privacy', success:'Message received. We will contact you using the email or phone number provided.', error:'Could not send. Please try again or contact us by email.', headline:'People, places and possibilities.', statement:'An attentive eye for what makes each connection unique.', body:'KOHAUS connects people with distinctive spaces and meaningful opportunities. Thoughtful selection, local knowledge and an international outlook shape a more personal approach to real estate.', approach:'Every search has its context. Every property, its value. Our approach starts with listening and continues with clear advice and attention to detail.', person:'Behind the connections', role:'Guilherme Coninch', bio:'Leading KOHAUS, Guilherme brings together his experience in Barcelona’s property market and a network of collaborators. Direct, personal guidance, with the right connections for each project.', cta:'Talk to KOHAUS', rights:'All rights reserved.' },
}

export function ContactForm({ language, onSubmit, messageLabel, messageRequired = true, successMessage, leadCopy }) {
 const c = companyCopy[language]
 const [status, setStatus] = useState('')
 async function submit(event) {
  event.preventDefault()
  if (status === 'sending') return
  const form = event.currentTarget
  const data = new FormData(form)
  const fields = Object.fromEntries(['name','surname','email','phone','message', ...(leadCopy ? ['address','city','operation','source'] : [])].map(key => [key, String(data.get(key) || '').trim()]))
  if (leadCopy) fields.newsletterAccepted = data.get('newsletterAccepted') === 'on'
  if (['name','surname','phone','email', ...(messageRequired ? ['message'] : []), ...(leadCopy ? ['city','operation','source'] : [])].some(key => !fields[key])) { setStatus('error'); return }
  setStatus('sending')
  try {
   await onSubmit(fields)
   setStatus('success'); form.reset()
  } catch { setStatus('error') }
 }
 return <form onSubmit={submit} className="contact-form">
    {['name','surname','email','phone'].map(key => <label key={key}><span>{c[key]}</span><input name={key} type={key==='email'?'email':key==='phone'?'tel':'text'} autoComplete={{name:'given-name',surname:'family-name',email:'email',phone:'tel'}[key]} required maxLength={key==='email'?254:key==='phone'?40:100} disabled={status==='sending'} /></label>)}
    {leadCopy && <>
      {['address', 'city'].map(key => <label key={key}><span>{leadCopy.fields[key]}</span><input name={key} autoComplete={key === 'city' ? 'address-level2' : 'street-address'} required={key === 'city'} maxLength={key === 'city' ? 200 : 500} disabled={status === 'sending'} /></label>)}
      <label><span>{leadCopy.fields.operation}</span><select name="operation" required defaultValue="" disabled={status === 'sending'}><option value="" disabled>{({pt:'Selecione uma opção',es:'Selecciona una opción',en:'Select an option'})[language]}</option>{Object.entries(leadCopy.operations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>{leadCopy.fields.source}</span><select name="source" required defaultValue="" disabled={status === 'sending'}><option value="" disabled>{({pt:'Selecione uma opção',es:'Selecciona una opción',en:'Select an option'})[language]}</option>{Object.entries(leadCopy.sources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </>}
    <label className="contact-wide"><span>{messageLabel || c.message}</span><textarea name="message" required={messageRequired} maxLength={5000} rows={5} disabled={status==='sending'} /></label>
    <label className="contact-consent contact-wide"><input type="checkbox" required disabled={status==='sending'} /><PrivacyConsent language={language} text={c.consent} /></label>
    {leadCopy && <label className="contact-consent contact-wide"><input type="checkbox" name="newsletterAccepted" disabled={status === 'sending'} /><span>{leadCopy.newsletter}</span></label>}
    <button className="solid-button" disabled={status==='sending'}>{status==='sending'?c.sending:c.send}</button>
    {['success','error'].includes(status) && <FormNotice error={status==='error'} language={language} onDismiss={() => setStatus('')}>{status==='success' ? successMessage || c.success : c.error}</FormNotice>}
   </form>
}

export function ContactPage({ language, onSubmit, leadCopy }) {
 const c = companyCopy[language]
 return <main className="company-page company-contact">
  <div className="contact-copy">
  <p className="section-label">{c.contact}</p><h1 className="section-title company-opening">{c.title}</h1>
  <p className="company-intro">{c.intro}</p>
  <div className="contact-details"><p>{c.location}</p><a href={`mailto:${companyContact.email}`}>{companyContact.email}</a><a href={`tel:${companyContact.tel}`}>{companyContact.phone}</a></div>
  </div>
  <section className="contact-section"><h2 className="section-title">{c.form}</h2>
   <ContactForm language={language} leadCopy={leadCopy} onSubmit={fields => onSubmit({ ...fields, comments: fields.message, language, ...(!leadCopy ? {city:'Barcelona', address:'', operation:'contact', source:'website-contact', newsletterAccepted:false} : {}), legalAccepted:true })} />
  </section>
 </main>
}

export function AboutPage({ language }) {
 const c = companyCopy[language]
 return <main className="company-page company-about">
  <p className="section-label">{c.about}</p>
  <section className="company-manifesto company-opening">
    <h2 className="section-title">{c.statement}</h2>
    <div><p>{c.body}</p><p>{c.approach}</p></div></section>
  <section className="company-person"><div className="company-person-portrait"><p className="section-label">{c.person}</p><img src={guilhermePortrait} alt="Guilherme Coninch" width="200" height="200" loading="lazy" /></div><div><h2 className="section-title">{c.role}</h2><p>{c.bio}</p><a className="outline-button" href={`?view=contact&lang=${language}`}>{c.cta}</a></div></section>
 </main>
}
