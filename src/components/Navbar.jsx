import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import useTheme from '../lib/useTheme.js'

const SECTIONS = ['projects', 'research', 'experience', 'skills', 'contact']

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { theme, toggle: toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  const onHome = pathname === '/'

  return (
    <nav className={`navbar${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="container navbar-inner">
        <Link className="brand" to="/" state={{ scrollTo: 'top' }} replace={onHome}>
          <span className="brand-mark">JY</span>
          <span className="brand-name">{t('hero.name')}</span>
        </Link>

        <div className="nav-links" id="nav-links">
          {SECTIONS.map((id) => (
            <Link key={id} to="/" state={{ scrollTo: id }} replace={onHome} onClick={() => setOpen(false)}>
              {t(`nav.${id}`)}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <button className="icon-btn lang-btn" onClick={toggleLang} aria-label={t('nav.langLabel')}>
            {t('nav.langToggle')}
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={t('nav.themeLabel')}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            className="icon-btn menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={t('nav.menu')}
            aria-expanded={open}
            aria-controls="nav-links"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </nav>
  )
}
