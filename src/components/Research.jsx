import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'
import { RESEARCH } from '../data/projects.js'
import { getPost } from '../lib/content.js'
import { formatMonth } from '../lib/format.js'

// Surveys and study notes, listed as writing (type, date, reading time)
// so they read as learning, not as shipped work.
function WritingItem({ project }) {
  const { t, i18n } = useTranslation()
  const post = getPost(project.slug, i18n.language)
  return (
    <Reveal as="article" className="writing-item">
      <p className="item-meta">
        <span className="item-kind">{t(`researchSection.kinds.${project.kind}`)}</span>
        <span>{formatMonth(project.start, i18n.language)}</span>
        <span>{t('researchSection.minRead', { count: post.readingMinutes })}</span>
      </p>
      <h3 className="item-title">
        <Link className="stretched-link" to={`/projects/${project.slug}`}>{post.title}</Link>
      </h3>
      <p className="item-brief">{post.brief || post.summary}</p>
      <ul className="stack-list" aria-label={t('project.stack')}>
        {project.stack.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <span className="item-cta" aria-hidden="true">
        {t('researchSection.read')} <Icon name="arrowRight" size={15} />
      </span>
    </Reveal>
  )
}

export default function Research({ index }) {
  const { t } = useTranslation()
  if (RESEARCH.length === 0) return null
  return (
    <Section id="research" index={index} tone="alt" title={t('researchSection.title')} intro={t('researchSection.intro')}>
      <div className="writing-list">
        {RESEARCH.map((p) => <WritingItem key={p.slug} project={p} />)}
      </div>
    </Section>
  )
}
