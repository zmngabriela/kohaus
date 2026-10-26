import { getCookiePolicy } from '../lib/cookiePolicy'
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
 const cookies = getCookiePolicy(language)
 const sections = page === 'cookies' ? cookies.sections : page === 'privacy' ? c.privacy : c.legal
 return <main className="legal-page">
  <a href={`?lang=${language}`}>{l.home}</a>
  <h1 className="section-title">{l[page]}</h1>
  {sections.map(([heading,content])=>{
   const items = Array.isArray(content) && typeof content[0] === 'object' ? content : content?.items
   return <section key={heading}><h2>{heading}</h2>
    {items ? <>{content.intro && <p>{content.intro}</p>}<ul className="legal-bullet-list">{items.map(item=><li key={item.title}><strong>{item.title}</strong><span>{item.description}</span></li>)}</ul></> : content?.paragraphs ? content.paragraphs.map(text=><p key={text}>{text}</p>) : <p>{Array.isArray(content) ? content.join(' ') : content}</p>}
   </section>
  })}
  {page === 'legal' && <section>
   <h2>{c.identity}</h2>
   <p className="legal-owner-details">{c.ownerDetails}{legalOwner.name} · {legalOwner.city} · <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a> · <a href="tel:+34665324791">+34 665 32 47 91</a></p>
   <p className="legal-contact">{c.legalContact} <a href="mailto:hola@thekohaus.com">hola@thekohaus.com</a></p>
  </section>}
  {(page === 'privacy' || page === 'cookies') && <section>
   <h2>{c.identity}</h2>
   <p className="legal-owner-details">{c.controllerLabel}{legalOwner.name} · {legalOwner.city} · <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a> · <a href="tel:+34665324791">+34 665 32 47 91</a></p>
   <p className="legal-contact">{page === 'cookies' ? cookies.contact : c.privacyContact} <a href="mailto:hola@thekohaus.com">hola@thekohaus.com</a></p>
  </section>}
 </main>
}
