import { useTranslation } from 'react-i18next'
import Hero from '../components/Hero.jsx'
import Projects from '../components/Projects.jsx'
import Research from '../components/Research.jsx'
import Experience from '../components/Experience.jsx'
import Skills from '../components/Skills.jsx'
import Education from '../components/Education.jsx'
import Contact from '../components/Contact.jsx'
import useDocumentTitle from '../lib/useDocumentTitle.js'

export default function Home() {
  const { t } = useTranslation()
  useDocumentTitle(t('meta.title'))
  return (
    <>
      <Hero />
      <Projects />
      <Research />
      <Experience />
      <Skills />
      <Education />
      <Contact />
    </>
  )
}
