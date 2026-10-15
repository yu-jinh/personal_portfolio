import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import Reveal from './Reveal.jsx'
import CoordinateFrame from './CoordinateFrame.jsx'
import EmailActions from './EmailActions.jsx'
import { PROFILE } from '../data/profile.js'

export default function Hero() {
  const { t } = useTranslation()
  const status = t('hero.status', { returnObjects: true })

  return (
    <section id="top" className="hero" aria-labelledby="hero-name">
      <div className="container hero-grid">
        <div className="hero-text">
          <Reveal as="p" className="hero-role">{t('hero.role')}</Reveal>
          <Reveal as="h1" id="hero-name" delay={60}>{t('hero.name')}</Reveal>
          <Reveal as="p" className="hero-thesis" delay={120}>{t('hero.thesis')}</Reveal>
          <Reveal as="p" className="hero-intro" delay={180}>{t('hero.intro')}</Reveal>
          <Reveal className="hero-actions" delay={240}>
            <EmailActions />
            <a className="btn" href={PROFILE.linkedin} target="_blank" rel="noreferrer">
              <Icon name="linkedin" size={16} /> {t('hero.linkedin')}
            </a>
            <a className="btn" href={PROFILE.resume} target="_blank" rel="noreferrer">
              <Icon name="file" size={16} /> {t('hero.resume')}
            </a>
            {PROFILE.github && (
              <a className="btn" href={PROFILE.github} target="_blank" rel="noreferrer">
                <Icon name="github" size={16} /> GitHub
              </a>
            )}
          </Reveal>
        </div>

        <Reveal className="hero-aside" delay={200}>
          <CoordinateFrame label={t('hero.frameLabel')} />
          <dl className="hero-status">
            {status.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <span className="status-value">{row.value}</span>
                  <span className="status-detail">{row.detail}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}
