import { useTranslation } from 'react-i18next'

export default function Hero() {
  const { t } = useTranslation()
  return (
    <header id="top" className="hero">
      <p className="greeting">{t('hero.greeting')}</p>
      <h1>{t('hero.name')} <span className="name-en">{t('hero.nameEn')}</span></h1>
      <p className="tagline">{t('hero.tagline')}</p>
      <p className="education">{t('hero.education')}</p>
      <div className="hero-actions">
        <a className="btn primary" href="#projects">{t('hero.viewProjects')}</a>
        <a className="btn" href="./resume.pdf" download>{t('hero.downloadResume')}</a>
      </div>
    </header>
  )
}
