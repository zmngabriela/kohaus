const shapes = {
  Instagram: <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></>,
  Facebook: <path fill="currentColor" stroke="none" d="M14 22v-9h3l.5-3H14V8c0-1.2.4-2 2-2h1.7V3.1A18 18 0 0 0 15 3c-3 0-4.7 1.8-4.7 5v2H7.5v3h2.8v9z"/>,
  LinkedIn: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7.5 10v7m4-7v7m0-4c0-4 5-4 5 0v4"/><circle cx="7.5" cy="7" r=".8" fill="currentColor"/></>,
  rooms: <path d="M3 18V6m0 9h18v3M3 10h5v5m0-5h10a3 3 0 0 1 3 3v2"/>,
  bathrooms: <path d="M3 12h18l-1 4a3 3 0 0 1-3 2H7a3 3 0 0 1-3-2zm2 0V6a2 2 0 0 1 4 0M6 18v2m12-2v2"/>,
  surface: <path d="M3 3h18v18H3zm4 14L17 7m-5 0h5v5M7 12v5h5"/>,
  terrace: <path d="m3 9 9-6 9 6H3zm9 0v11m-4 0h8M3 14v6m0-4h4m14-2v6m0-4h-4"/>,
}

export default function SiteIcon({ name }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>
}
