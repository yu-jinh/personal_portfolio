import { useTranslation } from 'react-i18next'
import SectionHeader from './SectionHeader.jsx'
import { SKILLS } from '../data/profile.js'

export default function Skills() {
  const { t } = useTranslation()
  return (
    <section id="skills" className="section section-alt">
      <div className="container">
        <SectionHeader
          eyebrow={t('skillsSection.eyebrow')}
          title={t('skillsSection.title')}
          subtitle={t('skillsSection.subtitle')}
        />
        <div className="skill-grid">
          {SKILLS.map((group) => (
            <div className="card skill-card" key={group.key}>
              <h3>{t(`skillsSection.groups.${group.key}`)}</h3>
              <ul className="tags">
                {group.items.map((item) => <li className="tag" key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
