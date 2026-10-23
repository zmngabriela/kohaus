import { useState } from 'react'
const texts = {
 pt: { open:'Esqueci minha senha', email:'E-mail', send:'Enviar link de recuperação', sending:'Enviando…', back:'Voltar ao login', sent:'Se este e-mail tiver uma conta, você receberá um link para redefinir sua senha. Confira também o spam.', error:'Não foi possível solicitar o link. Aguarde um momento e tente novamente.' },
 es: { open:'Olvidé mi contraseña', email:'Correo electrónico', send:'Enviar enlace de recuperación', sending:'Enviando…', back:'Volver al inicio de sesión', sent:'Si este correo tiene una cuenta, recibirás un enlace para restablecer tu contraseña. Revisa también el spam.', error:'No se pudo solicitar el enlace. Espera un momento e inténtalo de nuevo.' },
 en: { open:'Forgot my password', email:'Email', send:'Send recovery link', sending:'Sending…', back:'Back to login', sent:'If this email has an account, you will receive a password reset link. Please also check your spam folder.', error:'Unable to request the link. Please wait a moment and try again.' },
}
export default function PasswordRecovery({ language, client, initialEmail = '', onBack }) {
 const c = texts[language] || texts.es
 const [email, setEmail] = useState(initialEmail)
 const [busy, setBusy] = useState(false)
 const [sent, setSent] = useState(false)
 const [error, setError] = useState(false)
 async function submit(event) {
  event.preventDefault()
  if (busy) return
  setBusy(true); setError(false)
  try {
   if (!client) throw new Error('Unavailable')
   const redirect = new URL('/', window.location.origin)
   redirect.searchParams.set('view', 'dashboard')
   redirect.searchParams.set('lang', language)
   const { error: failure } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect.href })
   if (failure) throw failure
   setSent(true)
  } catch { setError(true) } finally { setBusy(false) }
 }
 return <form className="dashboard-auth-form" onSubmit={submit}>
  <p>{c.open}</p>
  {sent ? <p role="status">{c.sent}</p> : <>
   <label><span>{c.email}</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
   {error && <p className="dashboard-auth-error" role="alert">{c.error}</p>}
   <button className="dashboard-auth-submit" type="submit" disabled={busy}>{busy ? c.sending : c.send}</button>
  </>}
  <button type="button" className="outline-button" onClick={onBack}>{c.back}</button>
 </form>
}
