import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { PROFILE } from '../data/profile.js'

const behavior = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>
          {t('footer.rights', { year: new Date().getFullYear() })}
          <span className="footer-sep" aria-hidden="true">/</span>
          {t('footer.built')}
        </p>
        <div className="footer-links">
          <a href={`mailto:${PROFILE.email}`} aria-label={t('hero.email')}><Icon name="mail" /></a>
          <a href={PROFILE.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Icon name="linkedin" /></a>
          {PROFILE.github && (
            <a href={PROFILE.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Icon name="github" /></a>
          )}
          <button type="button" className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: behavior() })}>
            {t('footer.top')} <Icon name="arrowUp" size={15} />
          </button>
        </div>
      </div>
    </footer>
  )
}
