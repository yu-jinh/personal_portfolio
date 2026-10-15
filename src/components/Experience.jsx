import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionHeader from './SectionHeader.jsx'
import { EXPERIENCE } from '../data/profile.js'
import { getPost } from '../lib/content.js'
import { formatRange } from '../lib/format.js'

export default function Experience() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <section id="experience" className="section">
      <div className="container">
        <SectionHeader
          eyebrow={t('experienceSection.eyebrow')}
          title={t('experienceSection.title')}
          subtitle={t('experienceSection.subtitle')}
        />
        <ol className="timeline">
          {EXPERIENCE.map((job) => {
            const item = t(`experienceSection.items.${job.key}`, { returnObjects: true })
            return (
              <li className="timeline-item" key={job.key}>
                <div className="timeline-when">
                  {formatRange(job.start, job.end, lang, t('common.present'))}
                </div>
                <div className="timeline-body">
                  <h3>{item.role}</h3>
                  <p className="timeline-org">{item.company}</p>
                  <ul className="timeline-points">
                    {item.points.map((point) => <li key={point}>{point}</li>)}
                  </ul>
                  {job.projects.length > 0 && (
                    <div className="timeline-projects">
                      <span>{t('experienceSection.related')}</span>
                      {job.projects.map((slug) => (
                        <Link key={slug} to={`/projects/${slug}`}>{getPost(slug, lang).title}</Link>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
