import { cookieCopy } from '../lib/cookie-copy'
import { legalContent, legalOwner } from '../lib/legalContent'
import './Legal.css'
const labels = {
 pt: {legal:'Aviso legal',privacy:'Privacidade',cookies:'Cookies e armazenamento',home:'Voltar ao início'},
 es: {legal:'Aviso legal',privacy:'Privacidad',cookies:'Cookies y almacenamiento',home:'Volver al inicio'},
 en: {legal:'Legal notice',privacy:'Privacy',cookies:'Cookies and storage',home:'Back to home'},
}
export function LegalPage({ page, language }) {
 const c = legalContent[language] || legalContent.es
 const l = labels[language] || labels.es
 const cookies = cookieCopy[language] || cookieCopy.es
 const sections = page === 'cookies' ? [[cookies.necessary,cookies.necessaryText],[cookies.preferences,cookies.preferencesText],[cookies.analytics,cookies.analyticsText],[cookies.policy,cookies.storage],[cookies.settings,cookies.control]] : page === 'privacy' ? [...c.privacy,[cookies.analytics,cookies.text+' '+cookies.control]] : c.legal
 return <main className="legal-page">
  <a href={`?lang=${language}`}>{l.home}</a>
  <h1 className="section-title">{l[page]}</h1>
  {page !== 'legal' && <>
  <p>{c.note}</p>
  <section><h2>{c.identity}</h2><p><mark className="legal-pending">{c.name}</mark></p>
   {c.pending.map(text=><p key={text}><mark className="legal-pending">{text}</mark></p>)}
   <p><a href="mailto:hola@thekohaus.com">hola@thekohaus.com</a> · <a href="tel:+34665324791">+34 665 32 47 91</a></p>
  </section>
  </>}
  {sections.map(([heading,text])=><section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
  {page === 'legal' && <section>
   <h2>{c.identity}</h2>
   <p className="legal-owner-details">{c.ownerDetails}{legalOwner.name} · {legalOwner.city} · <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a> · <a href="tel:+34665324791">+34 665 32 47 91</a></p>
   <p className="legal-contact">{c.legalContact} <a href="mailto:hola@thekohaus.com">hola@thekohaus.com</a></p>
  </section>}
  {page === 'privacy' && c.privacyPending.map(text=><p key={text}><mark className="legal-pending">{text}</mark></p>)}
 </main>
}
