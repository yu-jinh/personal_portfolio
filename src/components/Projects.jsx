import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import Reveal from './Reveal.jsx'
import Section from './Section.jsx'
import ProjectCover from './ProjectCover.jsx'
import Facts from './Facts.jsx'
import { WORK } from '../data/projects.js'
import { getPost } from '../lib/content.js'
import { formatRange } from '../lib/format.js'

// One row per project: what it is (brief), what it measured (facts), what it
// was built with (stack). The title link stretches over the whole row.
function WorkItem({ project, index }) {
  const { t, i18n } = useTranslation()
  const post = getPost(project.slug, i18n.language)
  const period = formatRange(project.start, project.end, i18n.language, t('common.present'))
  return (
    <Reveal as="article" className="work-item">
      <ProjectCover project={project} alt="" className="work-cover" />
      <div className="work-body">
        <p className="item-meta">
          <span className="item-index">{String(index + 1).padStart(2, '0')}</span>
          <span>{t(`categories.${project.category}`)}</span>
          <span>{period}</span>
        </p>
        <h3 className="item-title">
          <Link className="stretched-link" to={`/projects/${project.slug}`}>{post.title}</Link>
        </h3>
        <p className="item-brief">{post.brief || post.summary}</p>
        <Facts facts={post.facts} />
        <ul className="stack-list" aria-label={t('project.stack')}>
          {project.stack.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <span className="item-cta" aria-hidden="true">
          {t('projectsSection.readMore')} <Icon name="arrowRight" size={15} />
        </span>
      </div>
    </Reveal>
  )
}

export default function Projects({ index }) {
  const { t } = useTranslation()
  return (
    <Section id="work" index={index} title={t('projectsSection.title')} intro={t('projectsSection.intro')}>
      <div className="work-list">
        {WORK.map((p, i) => <WorkItem key={p.slug} project={p} index={i} />)}
      </div>
    </Section>
  )
}
