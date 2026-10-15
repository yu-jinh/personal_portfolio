import { useTranslation } from 'react-i18next'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'

export default function Education({ index }) {
  const { t } = useTranslation()
  const items = t('educationSection.items', { returnObjects: true })
  return (
    <Section id="education" index={index} title={t('educationSection.title')}>
      <ol className="entry-list">
        {items.map((e) => (
          <Reveal as="li" className="entry" key={e.degree}>
            <p className="entry-when">{e.years}</p>
            <div className="entry-body">
              <h3>{e.degree}</h3>
              <p className="entry-org">{e.school}</p>
              <p className="entry-sub">{e.department}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}
