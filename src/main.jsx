import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './locales'
import './styles.css'
import App from './App.jsx'

// HashRouter keeps project URLs (#/projects/<slug>) working on GitHub Pages
// without a 404 redirect hack. See docs/adr/0002-project-pages.md.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
