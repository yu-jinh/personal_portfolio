import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'
import EmailActions from './EmailActions.jsx'
import { PROFILE } from '../data/profile.js'

export default function Contact({ index }) {
  const { t } = useTranslation()
  return (
    <Section id="contact" index={index} tone="ink" title={t('contactSection.title')}>
      <Reveal className="contact">
        <p className="contact-text">{t('contactSection.text')}</p>
        <EmailActions showAddress />
        <ul className="contact-links">
          <li>
            <a href={PROFILE.linkedin} target="_blank" rel="noreferrer">
              {t('hero.linkedin')} <Icon name="arrowUpRight" size={15} />
            </a>
          </li>
          <li>
            <a href={PROFILE.resume} target="_blank" rel="noreferrer">
              {t('hero.resume')} <Icon name="arrowUpRight" size={15} />
            </a>
          </li>
          {PROFILE.github && (
            <li>
              <a href={PROFILE.github} target="_blank" rel="noreferrer">
                GitHub <Icon name="arrowUpRight" size={15} />
              </a>
            </li>
          )}
        </ul>
      </Reveal>
    </Section>
  )
}
