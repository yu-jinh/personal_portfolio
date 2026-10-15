import { useTranslation } from 'react-i18next'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'
import { SKILLS } from '../data/profile.js'

export default function Skills({ index }) {
  const { t } = useTranslation()
  return (
    <Section id="skills" index={index} tone="alt" title={t('skillsSection.title')} intro={t('skillsSection.intro')}>
      <Reveal as="dl" className="skill-table">
        {SKILLS.map((group) => (
          <div className="skill-row" key={group.key}>
            <dt>{t(`skillsSection.groups.${group.key}`)}</dt>
            <dd>
              <ul className="skill-items">
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </dd>
          </div>
        ))}
      </Reveal>
    </Section>
  )
}
