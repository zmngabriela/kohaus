import { useEffect, useRef, useState } from 'react'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfPreview({ url, title }) {
  const container = useRef(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    const holder = container.current
    const document = getDocument({ url, useSystemFonts: true })
    const renders = []
    async function renderPages() {
      try {
        const pdf = await document.promise
        for (let number = 1; active && number <= pdf.numPages; number++) {
          const page = await pdf.getPage(number)
          if (!active) return
          const viewport = page.getViewport({ scale: 1.6 })
          const canvas = window.document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.setAttribute('aria-label', `${title} · ${number}`)
          holder.appendChild(canvas)
          const render = page.render({ canvasContext: canvas.getContext('2d'), viewport })
          renders.push(render)
          await render.promise
        }
      } catch {
        if (active) setError(true)
      }
    }
    void renderPages()
    return () => {
      active = false
      renders.forEach(render => render.cancel())
      void document.destroy()
      holder.replaceChildren()
    }
  }, [url, title])
  return <section className="invoice-preview" aria-label={title}>
    {error && <a href={url} target="_blank" rel="noreferrer">{title} ↗</a>}
    <div ref={container} />
  </section>
}
