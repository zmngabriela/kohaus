import { useLayoutEffect } from 'react'

export function dropdownPosition(anchor, menuHeight, menuWidth, viewport) {
  const margin = 12, gap = 8
  const topEdge = viewport.top + margin
  const bottomEdge = viewport.top + viewport.height - margin
  const below = Math.max(0, bottomEdge - anchor.bottom - gap)
  const above = Math.max(0, anchor.top - gap - topEdge)
  const upwards = menuHeight > below && above > below
  const maxHeight = Math.max(0, Math.min(360, upwards ? above : below))
  const height = Math.min(menuHeight, maxHeight)
  const width = Math.min(Math.max(anchor.width, menuWidth), viewport.width - margin * 2)
  return {
    top: Math.max(topEdge, upwards ? anchor.top - gap - height : Math.min(anchor.bottom + gap, bottomEdge - height)),
    left: Math.max(viewport.left + margin, Math.min(anchor.left, viewport.left + viewport.width - margin - width)),
    width, maxHeight,
  }
}

export function useVisibleDropdown(rootRef, open, close) {
  useLayoutEffect(() => {
    if (!open) return
    const root = rootRef.current
    const menu = root?.querySelector('.custom-select-menu')
    const trigger = root?.querySelector('.custom-select-trigger')
    if (!menu || !trigger) return
    const update = () => {
      // Measure the natural option width before clamping the panel to the viewport.
      Object.assign(menu.style, { width: 'max-content', minWidth: '0', maxWidth: 'none', right: 'auto' })
      const viewport = window.visualViewport
      const bounds = dropdownPosition(trigger.getBoundingClientRect(), menu.scrollHeight, menu.scrollWidth, {
        top: viewport?.offsetTop || 0, left: viewport?.offsetLeft || 0,
        width: viewport?.width || window.innerWidth, height: viewport?.height || window.innerHeight,
      })
      Object.assign(menu.style, {
        position: 'fixed', top: `${bounds.top}px`, left: `${bounds.left}px`, right: 'auto', bottom: 'auto',
        width: `${bounds.width}px`, minWidth: '0', maxHeight: `${bounds.maxHeight}px`, boxSizing: 'border-box',
        overflowY: 'auto', overscrollBehavior: 'contain', zIndex: '1000',
      })
    }
    const escape = event => { if (event.key === 'Escape') { close(false); trigger.focus() } }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    window.addEventListener('keydown', escape)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('keydown', escape)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [rootRef, open, close])
}
