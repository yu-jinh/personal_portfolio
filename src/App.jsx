import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import ProjectPage from './pages/ProjectPage.jsx'
import NotFound from './pages/NotFound.jsx'

function DocumentLang() {
  const { i18n } = useTranslation()
  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
    try { localStorage.setItem('lang', i18n.language) } catch {}
  }, [i18n.language])
  return null
}

// Route changes jump to the top, unless the link asked for a home-page
// section via `state.scrollTo` (used by the navbar and "back to projects").
function ScrollManager() {
  const location = useLocation()
  useEffect(() => {
    const id = location.state?.scrollTo
    if (!id) {
      window.scrollTo(0, 0)
      return
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location])
  return null
}

export default function App() {
  return (
    <>
      <DocumentLang />
      <ScrollManager />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
