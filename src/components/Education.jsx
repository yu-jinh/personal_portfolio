import { useTranslation } from 'react-i18next'
import SectionHeader from './SectionHeader.jsx'

export default function Education() {
  const { t } = useTranslation()
  const items = t('educationSection.items', { returnObjects: true })
  return (
    <section id="education" className="section">
      <div className="container">
        <SectionHeader eyebrow={t('educationSection.eyebrow')} title={t('educationSection.title')} />
        <div className="edu-grid">
          {items.map((e) => (
            <div className="card edu-card" key={e.degree}>
              <p className="edu-years">{e.years}</p>
              <h3>{e.degree}</h3>
              <p className="edu-school">{e.school}</p>
              <p className="edu-dept">{e.department}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
