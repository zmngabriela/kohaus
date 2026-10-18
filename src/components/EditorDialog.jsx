import { useEffect, useRef } from 'react'

export default function EditorDialog({ title, closeLabel, onClose, busy = false, children }) {
  const sheet = useRef(null)
  const close = useRef(onClose)
  const pending = useRef(busy)
  useEffect(() => { close.current = onClose; pending.current = busy }, [onClose, busy])
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheet.current?.focus()
    function handleKey(event) {
      if (event.key === 'Escape' && !pending.current) close.current()
      if (event.key !== 'Tab') return
      const elements = [...sheet.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')]
      const first = elements[0]
      const last = elements.at(-1)
      if (!first) { event.preventDefault(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === sheet.current)) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', handleKey)
      previous?.focus()
    }
  }, [])
  return <div className="dashboard-editor-overlay" role="dialog" aria-modal="true" aria-label={title}>
    <div className="dashboard-editor-backdrop" onClick={() => !busy && onClose()} />
    <section className="dashboard-editor-sheet" ref={sheet} tabIndex={-1}>
      <div className="dashboard-editor-head">
        <h2>{title}</h2>
        <button type="button" className="dashboard-editor-close" disabled={busy} onClick={onClose}>{closeLabel}</button>
      </div>
      {children}
    </section>
  </div>
}
