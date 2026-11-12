import { useEffect, useState } from 'react'

export default function FormNotice({ children, error, language, onDismiss }) {
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), 8000)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(onDismiss, 200)
    return () => clearTimeout(timer)
  }, [closing, onDismiss])
  return <aside className={'form-notice' + (error ? ' is-error' : '') + (closing ? ' is-closing' : '')} role={error ? 'alert' : 'status'}>
    {children}
    <button type="button" onClick={() => setClosing(true)} aria-label={{ pt:'Fechar aviso', es:'Cerrar aviso', en:'Dismiss notification' }[language]}>×</button>
  </aside>
}
