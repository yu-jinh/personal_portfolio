import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { PROFILE } from '../data/profile.js'

function Avatar() {
  const { t } = useTranslation()
  if (PROFILE.photo) return <img className="avatar" src={PROFILE.photo} alt={t('hero.name')} />
  return <div className="avatar avatar-monogram" aria-hidden="true">JY</div>
}

export default function Hero() {
  const { t } = useTranslation()
  const focus = t('hero.focus', { returnObjects: true })
  const facts = t('hero.facts', { returnObjects: true })

  return (
    <section id="top" className="hero">
      <div className="container hero-grid">
        <div className="hero-text">
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.name')}</h1>
          <p className="hero-headline">{t('hero.headline')}</p>
          <p className="hero-summary">{t('hero.summary')}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/" state={{ scrollTo: 'projects' }} replace>
              {t('hero.viewProjects')} <Icon name="arrowRight" size={16} />
            </Link>
            <a className="btn" href={PROFILE.resume} target="_blank" rel="noreferrer">
              <Icon name="download" size={16} /> {t('hero.resume')}
            </a>
          </div>
          <ul className="focus-list" aria-label={t('hero.focusLabel')}>
            {focus.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <aside className="profile-card">
          <div className="profile-head">
            <Avatar />
            <div>
              <p className="profile-name">{t('hero.name')}</p>
              <p className="profile-title">{t('hero.eyebrow')}</p>
            </div>
          </div>
          <dl className="profile-facts">
            {facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="profile-links">
            <a href={`mailto:${PROFILE.email}`}><Icon name="mail" size={16} /> {t('contactSection.email')}</a>
            <a href={PROFILE.linkedin} target="_blank" rel="noreferrer"><Icon name="linkedin" size={16} /> LinkedIn</a>
            {PROFILE.github && (
              <a href={PROFILE.github} target="_blank" rel="noreferrer"><Icon name="github" size={16} /> GitHub</a>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
