import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { PROFILE } from '../data/profile.js'

export default function Contact() {
  const { t } = useTranslation()
  return (
    <section id="contact" className="section section-alt">
      <div className="container">
        <div className="contact-panel">
          <div>
            <p className="eyebrow">{t('contactSection.eyebrow')}</p>
            <h2>{t('contactSection.title')}</h2>
            <p className="contact-text">{t('contactSection.subtitle')}</p>
            <p className="contact-email">{PROFILE.email}</p>
          </div>
          <div className="contact-actions">
            <a className="btn btn-primary" href={`mailto:${PROFILE.email}`}>
              <Icon name="mail" size={16} /> {t('contactSection.email')}
            </a>
            <a className="btn" href={PROFILE.linkedin} target="_blank" rel="noreferrer">
              <Icon name="linkedin" size={16} /> LinkedIn
            </a>
            <a className="btn" href={PROFILE.resume} target="_blank" rel="noreferrer">
              <Icon name="download" size={16} /> {t('hero.resume')}
            </a>
            {PROFILE.github && (
              <a className="btn" href={PROFILE.github} target="_blank" rel="noreferrer">
                <Icon name="github" size={16} /> GitHub
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
