import React from 'react'
import ReactDOM from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import './locales'
import './styles.css'
import Navbar from './components/Navbar.jsx'
import Hero from './components/Hero.jsx'
import Projects from './components/Projects.jsx'
import Skills from './components/Skills.jsx'
import Contact from './components/Contact.jsx'
import Footer from './components/Footer.jsx'

function Title() {
  const { t, i18n } = useTranslation()
  React.useEffect(() => {
    document.title = t('meta.title')
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
  }, [t, i18n.language])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Title />
    <Navbar />
    <main>
      <Hero />
      <Projects />
      <Skills />
      <Contact />
    </main>
    <Footer />
  </React.StrictMode>,
)
