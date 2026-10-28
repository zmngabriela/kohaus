import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initialAuthCallback } from './lib/authCallback'

const root = document.getElementById('root')
const snapshot = document.getElementById('kohaus-initial-page')
let initialPage
try { if (snapshot && !initialAuthCallback.active) initialPage = JSON.parse(snapshot.textContent) } catch { /* Use the client route if no valid snapshot was delivered. */ }
const app = <StrictMode><App initialPage={initialPage} /></StrictMode>
if (initialPage) hydrateRoot(root, app)
else createRoot(root).render(app)
snapshot?.remove()
