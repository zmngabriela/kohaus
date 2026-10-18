const wording = {
  pt: { prefix: 'Li a ', policy: 'política de privacidade', legal: 'aviso legal' },
  es: { prefix: 'He leído la ', policy: 'política de privacidad', legal: 'aviso legal' },
  en: { prefix: 'I have read the ', policy: 'privacy policy', legal: 'legal notice' },
}

export default function PrivacyConsent({ language, text }) {
  const copy = wording[language] || wording.es
  const content = text || `${copy.prefix}${copy.policy}.`
  return <span>{content.split(new RegExp(`(${copy.policy}|${copy.legal})`, 'g')).map((part, index) =>
    part === copy.policy || part === copy.legal
      ? <a key={index} href={`?view=${part === copy.policy ? 'privacy' : 'legal'}&lang=${language}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>{part}</a>
      : part
  )}</span>
}
