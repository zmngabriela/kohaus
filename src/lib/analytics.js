export const CONSENT_KEY = 'kohaus-cookie-consent-v1'
export const CONSENT_TTL = 180 * 24 * 60 * 60 * 1000
export const MEASUREMENT_ID = 'G-YZZQDVVQLX'
let initialized = false
let lastPage = ''
const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }
export function readConsent() {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY))
    return value?.version === 1 && typeof value.analytics === 'boolean' && Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < CONSENT_TTL ? value : null
  } catch { return null }
}
export function storeConsent(analytics, preferences = false) {
  const value = { version: 1, analytics, preferences, at: Date.now() }
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)) } catch { /* Session-only choice when storage is unavailable. */ }
  return value
}
export function clearAnalyticsCookies() {
  const domains = location.hostname.split('.').map((_, i, parts) => parts.slice(i).join('.'))
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.trim().split('=')[0]
    if (!/^_ga(?:_|$)/.test(name)) return
    for (const domain of ['', ...domains]) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
  })
}
export function syncAnalytics(allowed, view, language, enabled = import.meta.env.VITE_APP_ENV === 'production' && import.meta.env.VITE_ANALYTICS_ENABLED === 'true') {
  const publicViews = ['home', 'catalogo', 'off-market', 'anuncio', 'captacion', 'about', 'contact', 'legal', 'privacy', 'cookies']
  const active = enabled && allowed && publicViews.includes(view) && !['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname)
  window[`ga-disable-${MEASUREMENT_ID}`] = !active
  if (!active) {
    lastPage = ''
    if (!allowed) clearAnalyticsCookies()
    return
  }
  window.dataLayer ||= []
  window.gtag ||= function () { window.dataLayer.push(arguments) }
  const lang = ['pt', 'es', 'en'].includes(language) ? language : 'es'
  const page = `${location.origin}/${view}?lang=${lang}`
  if (!initialized) {
    window.gtag('consent', 'default', denied)
    window.gtag('consent', 'update', { ...denied, analytics_storage: 'granted' })
    window.gtag('js', new Date())
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false, page_location: page, page_referrer: '', page_title: `KOHAUS · ${view}`, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false })
    const script = document.createElement('script')
    script.id = 'kohaus-analytics'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    document.head.appendChild(script)
    initialized = true
  }
  if (lastPage !== page) {
    window.gtag('event', 'page_view', { page_location: page, page_referrer: '', page_title: `KOHAUS · ${view}`, send_to: MEASUREMENT_ID })
    lastPage = page
  }
}

export const LANGUAGE_KEY = 'kohaus-preferred-language'
export function readPreferredLanguage() {
  try { return readConsent()?.preferences === true ? localStorage.getItem(LANGUAGE_KEY) : null } catch { return null }
}
export function syncPreferences(allowed, language) {
  try {
    if (allowed && ['pt', 'es', 'en'].includes(language)) localStorage.setItem(LANGUAGE_KEY, language)
    else localStorage.removeItem(LANGUAGE_KEY)
  } catch { /* Storage may be unavailable. */ }
}
