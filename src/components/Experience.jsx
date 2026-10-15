import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'
import { EXPERIENCE } from '../data/profile.js'
import { getPost } from '../lib/content.js'
import { formatRange } from '../lib/format.js'

export default function Experience({ index }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <Section id="experience" index={index} title={t('experienceSection.title')} intro={t('experienceSection.intro')}>
      <ol className="entry-list">
        {EXPERIENCE.map((job) => {
          const item = t(`experienceSection.items.${job.key}`, { returnObjects: true })
          return (
            <Reveal as="li" className="entry" key={job.key}>
              <p className="entry-when">{formatRange(job.start, job.end, lang, t('common.present'))}</p>
              <div className="entry-body">
                <h3>{item.role}</h3>
                <p className="entry-org">{item.company}</p>
                <ul className="entry-points">
                  {item.points.map((point) => (
                    <li key={point.text}>
                      {point.label && <span className="point-label">{point.label}</span>}
                      {point.text}
                    </li>
                  ))}
                </ul>
                {job.projects.length > 0 && (
                  <div className="entry-related">
                    <span className="entry-related-label">{t('experienceSection.related')}</span>
                    <ul>
                      {job.projects.map((slug) => (
                        <li key={slug}><Link to={`/projects/${slug}`}>{getPost(slug, lang).title}</Link></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Reveal>
          )
        })}
      </ol>
    </Section>
  )
}
