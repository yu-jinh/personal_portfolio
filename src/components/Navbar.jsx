import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import useTheme from '../lib/useTheme.js'

const SECTIONS = ['work', 'research', 'experience', 'skills', 'contact']

// Which home-page section is under the navbar: the last one whose top has
// scrolled past a line just below it. At the bottom of the page, the last one.
function useActiveSection(enabled) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    if (!enabled) {
      setActive(null)
      return undefined
    }
    let frame = 0
    const update = () => {
      frame = 0
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let current = null
      for (const id of SECTIONS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 120) current = id
      }
      setActive(atBottom ? SECTIONS[SECTIONS.length - 1] : current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [enabled])
  return active
}

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const { theme, toggle: toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const onHome = pathname === '/'
  const active = useActiveSection(onHome)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggleLang = () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  const themeLabel = t(theme === 'dark' ? 'nav.themeLight' : 'nav.themeDark')

  return (
    <header className={`navbar${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="container navbar-inner">
        <Link className="brand" to="/" state={{ scrollTo: 'top' }} replace={onHome}>
          <span className="brand-mark" aria-hidden="true">JY</span>
          <span className="brand-name">{t('hero.name')}</span>
        </Link>

        <nav className="nav-links" id="nav-links" aria-label={t('nav.sections')}>
          {SECTIONS.map((id) => (
            <Link
              key={id}
              to="/"
              state={{ scrollTo: id }}
              replace={onHome}
              aria-current={active === id ? 'true' : undefined}
              className={active === id ? 'is-active' : undefined}
              onClick={() => setOpen(false)}
            >
              {t(`nav.${id}`)}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            className="icon-btn lang-btn"
            onClick={toggleLang}
            aria-label={t('nav.langLabel')}
            lang={i18n.language === 'zh' ? 'en' : 'zh'}
          >
            {t('nav.langToggle')}
          </button>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button
            type="button"
            className="icon-btn menu-btn"
            onClick={() => setOpen(!open)}
            aria-label={t(open ? 'nav.close' : 'nav.menu')}
            aria-expanded={open}
            aria-controls="nav-links"
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  )
}
