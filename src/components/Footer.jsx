import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { PROFILE } from '../data/profile.js'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
        <div className="footer-links">
          <a href={`mailto:${PROFILE.email}`} aria-label={t('contactSection.email')}><Icon name="mail" /></a>
          <a href={PROFILE.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><Icon name="linkedin" /></a>
          {PROFILE.github && (
            <a href={PROFILE.github} target="_blank" rel="noreferrer" aria-label="GitHub"><Icon name="github" /></a>
          )}
        </div>
      </div>
    </footer>
  )
}
