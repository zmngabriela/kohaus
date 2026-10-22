import { useEffect, useState } from 'react'
import EditorDialog from './EditorDialog'
import { CONSENT_KEY, CONSENT_TTL, readConsent, storeConsent, syncAnalytics } from '../lib/analytics'
import './Legal.css'
import { cookieCopy } from '../lib/cookie-copy'
export default function CookieConsent({ language, view }) {
 const c = cookieCopy[language] || cookieCopy.es
 const [consent, setConsent] = useState(readConsent)
 const [open, setOpen] = useState(false)
 const [analytics, setAnalytics] = useState(false)
 useEffect(() => {
  syncAnalytics(consent?.analytics === true, view, language)
 }, [consent, view, language])
 useEffect(() => {
  const refresh = event => { if (!event.key || event.key === CONSENT_KEY) { const next = readConsent(); if (consent?.analytics && !next?.analytics) { syncAnalytics(false, view, language); location.reload() } else setConsent(next) } }
  window.addEventListener('storage', refresh)
  const timer = setInterval(() => { if (consent && Date.now() - consent.at >= CONSENT_TTL) { syncAnalytics(false, view, language); setConsent(null); if (document.getElementById('kohaus-analytics')) location.reload() } }, 60000)
  return () => { window.removeEventListener('storage', refresh); clearInterval(timer) }
 }, [consent, view, language])
 function choose(value) {
  const next = storeConsent(value)
  setConsent(next); setOpen(false)
  if (!value) {
   syncAnalytics(false, view, language)
   if (document.getElementById('kohaus-analytics')) location.reload()
  }
 }
 function configure() { setAnalytics(consent?.analytics === true); setOpen(true) }
 return <>
  <div className="cookie-settings-footer"><button type="button" onClick={configure}>{c.settings}</button></div>
  {!consent && !open && <aside className="privacy-notice" aria-label={c.title}>
   <div><strong>{c.title}</strong><p>{c.text} <a href={`?view=cookies&lang=${language}`}>{c.policy}</a></p></div>
   <div className="cookie-actions"><button onClick={() => choose(false)}>{c.reject}</button><button onClick={configure}>{c.settings}</button><button onClick={() => choose(true)}>{c.accept}</button></div>
  </aside>}
  {open && <EditorDialog title={c.settings} closeLabel={c.close} onClose={() => setOpen(false)}>
   <div className="cookie-preferences">
    <label><input type="checkbox" checked disabled /><span><strong>{c.necessary}</strong><p>{c.necessaryText}</p></span></label>
    <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /><span><strong>{c.analytics}</strong><p>{c.analyticsText}</p></span></label>
    <p>{c.control}</p>
    {import.meta.env.VITE_APP_ENV !== 'production' && <p>{c.preview}</p>}
    <div className="cookie-actions"><button onClick={() => choose(false)}>{c.reject}</button><button onClick={() => choose(analytics)}>{c.save}</button></div>
   </div>
  </EditorDialog>}
 </>
}
