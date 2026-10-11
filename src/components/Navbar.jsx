import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const toggle = () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  return (
    <nav className="navbar">
      <a className="brand" href="#top">🤖 {t('hero.name')}</a>
      <div className="nav-links">
        <a href="#top">{t('nav.home')}</a>
        <a href="#projects">{t('nav.projects')}</a>
        <a href="#skills">{t('nav.skills')}</a>
        <a href="#contact">{t('nav.contact')}</a>
        <button className="lang-btn" onClick={toggle}>{t('nav.langToggle')}</button>
      </div>
    </nav>
  )
}
