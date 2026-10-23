import { useState } from 'react'
const texts = {
 pt: { title:'Defina sua nova senha', intro:'Defina uma senha para acessar o dashboard da KOHAUS.', password:'Nova senha', confirm:'Confirmar senha', hint:'Use pelo menos 12 caracteres.', save:'Salvar senha', saving:'Salvando…', loading:'Validando acesso…', invalid:'Este link é inválido, expirou ou já foi utilizado. Peça um novo link ao administrador.', mismatch:'As senhas precisam ser iguais e ter pelo menos 12 caracteres.', failed:'Não foi possível salvar a senha. Tente novamente; se o acesso expirou, peça um novo link.', done:'Senha salva. Você já pode acessar o dashboard.', next:'Entrar no dashboard', login:'Voltar ao login' },
 es: { title:'Define tu nueva contraseña', intro:'Define una contraseña para acceder al dashboard de KOHAUS.', password:'Nueva contraseña', confirm:'Confirmar contraseña', hint:'Usa al menos 12 caracteres.', save:'Guardar contraseña', saving:'Guardando…', loading:'Validando acceso…', invalid:'Este enlace no es válido, ha caducado o ya se ha utilizado. Solicita uno nuevo al administrador.', mismatch:'Las contraseñas deben coincidir y tener al menos 12 caracteres.', failed:'No se pudo guardar la contraseña. Inténtalo de nuevo; si el acceso ha caducado, solicita otro enlace.', done:'Contraseña guardada. Ya puedes acceder al dashboard.', next:'Entrar al dashboard', login:'Volver al inicio de sesión' },
 en: { title:'Set your new password', intro:'Set a password to access the KOHAUS dashboard.', password:'New password', confirm:'Confirm password', hint:'Use at least 12 characters.', save:'Save password', saving:'Saving…', loading:'Validating access…', invalid:'This link is invalid, expired or already used. Ask your administrator for a new link.', mismatch:'Passwords must match and contain at least 12 characters.', failed:'Unable to save your password. Try again; if your access expired, request a new link.', done:'Password saved. You can now access the dashboard.', next:'Open dashboard', login:'Back to login' },
}
export default function PasswordSetup({ language, client, session, loading, invalid, onContinue, onBack }) {
 const c = texts[language] || texts.es
 const [password, setPassword] = useState('')
 const [confirmation, setConfirmation] = useState('')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const [done, setDone] = useState(false)
 async function save(event) {
  event.preventDefault()
  if (busy || !session || invalid || !client) return
  if (password.length < 12 || password !== confirmation) { setError(c.mismatch); return }
  setBusy(true); setError('')
  try {
   const { error: failure } = await client.auth.updateUser({ password })
   if (failure) throw failure
   setPassword(''); setConfirmation(''); setDone(true)
  } catch { setError(c.failed) } finally { setBusy(false) }
 }
 return <main className="dashboard-page"><section className="dashboard-auth-shell">
  <div className="dashboard-auth-copy"><p className="section-label dashboard-label">KOHAUS</p><h1 className="section-title">{c.title}</h1><p>{c.intro}</p></div>
  <div className="dashboard-auth-card">
   {invalid ? <><p role="alert" className="dashboard-auth-error">{c.invalid}</p><button className="dashboard-auth-submit" onClick={onContinue}>{c.login}</button></> : loading ? <p role="status">{c.loading}</p> : !session ? <><p role="alert" className="dashboard-auth-error">{c.invalid}</p><button className="dashboard-auth-submit" onClick={onContinue}>{c.login}</button></> : done ? <><p role="status">{c.done}</p><button className="dashboard-auth-submit" onClick={onContinue}>{c.next}</button></> : <form className="dashboard-auth-form" onSubmit={save}>
    <label><span>{c.password}</span><input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} /></label>
    <label><span>{c.confirm}</span><input type="password" autoComplete="new-password" required minLength={12} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
    <p>{c.hint}</p>{error && <p role="alert" className="dashboard-auth-error">{error}</p>}
    <div className="dashboard-auth-actions">
    <button className="dashboard-auth-submit" disabled={busy} type="submit">{busy ? c.saving : c.save}</button>
    <button className="outline-button" disabled={busy} type="button" onClick={onBack}>{c.login}</button>
    </div>
   </form>}
  </div>
 </section></main>
}
