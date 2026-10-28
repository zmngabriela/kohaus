import { useEffect, useState } from 'react'
import { CONSENT_KEY, CONSENT_TTL, readConsent, storeConsent, syncAnalytics, syncPreferences } from '../lib/analytics'
import './Legal.css'
import { cookieCopy } from '../lib/cookie-copy'
export default function CookieConsent({ language, view, deferInitial = false }) {
 const c = cookieCopy[language] || cookieCopy.es
 const [consent, setConsent] = useState(() => deferInitial ? null : readConsent())
 const [ready, setReady] = useState(!deferInitial)
 useEffect(() => { if (deferInitial) { setConsent(readConsent()); setReady(true) } }, [deferInitial])
 const [open, setOpen] = useState(false)
 const [analytics, setAnalytics] = useState(false)
 const [preferences, setPreferences] = useState(false)
 useEffect(() => {
  if (!ready) return
  syncAnalytics(consent?.analytics === true, view, language)
  syncPreferences(consent?.preferences === true, language)
 }, [consent, view, language, ready])
 useEffect(() => {
  const refresh = event => { if (!event.key || event.key === CONSENT_KEY) { const next = readConsent(); if (consent?.analytics && !next?.analytics) { syncAnalytics(false, view, language); location.reload() } else setConsent(next) } }
  window.addEventListener('storage', refresh)
  const timer = setInterval(() => { if (consent && Date.now() - consent.at >= CONSENT_TTL) { syncAnalytics(false, view, language); setConsent(null); if (document.getElementById('kohaus-analytics')) location.reload() } }, 60000)
  return () => { window.removeEventListener('storage', refresh); clearInterval(timer) }
 }, [consent, view, language])
 function choose(value, remember = false) {
  const next = storeConsent(value, remember)
  syncPreferences(remember, language)
  setConsent(next); setOpen(false)
  if (!value) {
   syncAnalytics(false, view, language)
   if (document.getElementById('kohaus-analytics')) location.reload()
  }
 }
 function configure() { setPreferences(consent?.preferences === true); setAnalytics(consent?.analytics === true); setOpen(true) }
 return <>
  <div className="cookie-settings-footer"><button type="button" onClick={configure}>{c.settings}</button></div>
  {ready && (!consent || open) && <aside className="privacy-notice" aria-label={c.title}>
   <strong>{open ? c.settings : c.title}</strong>
   <p>{open ? c.configureText : c.text} <a href={`?view=cookies&lang=${language}`}>{c.policy}</a></p>
   {open && <div className="cookie-preferences">
    <label><input type="checkbox" checked disabled /><span>{c.necessary}</span></label>
    <label><input type="checkbox" checked={preferences} onChange={e => setPreferences(e.target.checked)} /><span>{c.preferences}</span></label>
    <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /><span>{c.analytics}</span></label>
   </div>}
   <div className="cookie-actions">
    <button onClick={() => choose(false)}>{c.reject}</button>
    {open ? <><button onClick={() => choose(analytics, preferences)}>{c.save}</button><button onClick={() => setOpen(false)}>{c.close}</button></> : <><button onClick={configure}>{c.settings}</button><button onClick={() => choose(true, true)}>{c.accept}</button></>}
   </div>
  </aside>}
 </>
}
