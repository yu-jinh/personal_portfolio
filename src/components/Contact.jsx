import { useTranslation } from 'react-i18next'

export default function Contact() {
  const { t } = useTranslation()
  return (
    <section id="contact" className="section">
      <h2>{t('contactSection.title')}</h2>
      <p className="section-subtitle">{t('contactSection.subtitle')}</p>
      <ul className="contact-list">
        <li>📧 {t('contactSection.email')}</li>
        <li>💻 {t('contactSection.github')}</li>
        <li>🔗 {t('contactSection.linkedin')}</li>
      </ul>
      <p className="resume-note">📄 {t('contactSection.resumeNote')}</p>
    </section>
  )
}
