import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import ProjectPage from './pages/ProjectPage.jsx'
import NotFound from './pages/NotFound.jsx'

const behavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

function DocumentLang() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
    try { localStorage.setItem('lang', i18n.language) } catch {}
  }, [i18n.language])
  return null
}

// Route changes jump to the top, unless the link asked for a home-page
// section via `state.scrollTo` (used by the navbar and "All work").
function ScrollManager() {
  const location = useLocation()
  useEffect(() => {
    const id = location.state?.scrollTo
    if (!id) {
      window.scrollTo(0, 0)
      return undefined
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: behavior(), block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])
  return null
}

// A real #fragment link would be read as a route by the HashRouter,
// so the skip link moves focus itself.
function SkipLink() {
  const { t } = useTranslation()
  const skip = (e) => {
    e.preventDefault()
    const main = document.getElementById('main')
    main?.focus({ preventScroll: true })
    main?.scrollIntoView()
  }
  return <a className="skip-link" href="#main" onClick={skip}>{t('common.skip')}</a>
}

export default function App() {
  const location = useLocation()
  return (
    <>
      <DocumentLang />
      <ScrollManager />
      <SkipLink />
      <Navbar />
      <main id="main" tabIndex={-1}>
        {/* Keyed by path so each page fades in on navigation. */}
        <div className="page" key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/projects/:slug" element={<ProjectPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </>
  )
}
