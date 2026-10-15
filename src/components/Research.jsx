import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import SectionHeader from './SectionHeader.jsx'
import { RESEARCH } from '../data/projects.js'
import { getPost } from '../lib/content.js'
import { formatMonth } from '../lib/format.js'

// Surveys and study notes: shown as articles (type, date, reading time)
// rather than as project cards, so they read as writing, not shipped work.
export function ResearchCard({ project }) {
  const { t, i18n } = useTranslation()
  const post = getPost(project.slug, i18n.language)
  return (
    <Link className="card research-card" to={`/projects/${project.slug}`}>
      <div className="research-meta">
        <span className={`kind-badge kind-${project.kind}`}>{t(`researchSection.kinds.${project.kind}`)}</span>
        <span>{formatMonth(project.start, i18n.language)}</span>
        <span aria-hidden="true">·</span>
        <span>{t('researchSection.minRead', { count: post.readingMinutes })}</span>
      </div>
      <h3>{post.title}</h3>
      <p className="card-summary">{post.summary}</p>
      <ul className="tags">
        {project.stack.slice(0, 4).map((s) => <li className="tag" key={s}>{s}</li>)}
      </ul>
      <span className="card-cta">
        {t('researchSection.read')} <Icon name="arrowRight" size={16} />
      </span>
    </Link>
  )
}

export default function Research() {
  const { t } = useTranslation()
  if (RESEARCH.length === 0) return null
  return (
    <section id="research" className="section section-alt">
      <div className="container">
        <SectionHeader
          eyebrow={t('researchSection.eyebrow')}
          title={t('researchSection.title')}
          subtitle={t('researchSection.subtitle')}
        />
        <div className="research-grid">
          {RESEARCH.map((p) => <ResearchCard key={p.slug} project={p} />)}
        </div>
      </div>
    </section>
  )
}
