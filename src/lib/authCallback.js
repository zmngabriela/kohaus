export function readAuthCallback(url) {
  const parsed = new URL(url)
  const hash = new URLSearchParams(parsed.hash.slice(1))
  const type = hash.get('type') || parsed.searchParams.get('type')
  const error = hash.get('error_code') || hash.get('error') || parsed.searchParams.get('error')
  return { active: Boolean(error) || ['invite', 'recovery'].includes(type), invalid: Boolean(error) }
}
// Capture before the Auth SDK consumes and removes the callback fragment.
export const initialAuthCallback = readAuthCallback(window.location.href)
