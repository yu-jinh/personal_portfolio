import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import ProjectCover from './ProjectCover.jsx'
import SectionHeader from './SectionHeader.jsx'
import { CATEGORIES, WORK } from '../data/projects.js'
import { getPost } from '../lib/content.js'

export function ProjectCard({ project }) {
  const { t, i18n } = useTranslation()
  const post = getPost(project.slug, i18n.language)
  return (
    <Link className="card project-card" to={`/projects/${project.slug}`}>
      <ProjectCover project={project} alt={post.title} />
      <div className="card-body">
        <p className={`category category-${project.category}`}>{t(`categories.${project.category}`)}</p>
        <h3>{post.title}</h3>
        <p className="card-summary">{post.summary}</p>
        <ul className="tags">
          {project.stack.slice(0, 4).map((s) => <li className="tag" key={s}>{s}</li>)}
        </ul>
        <span className="card-cta">
          {t('projectsSection.readMore')} <Icon name="arrowRight" size={16} />
        </span>
      </div>
    </Link>
  )
}

export default function Projects() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('all')
  const shown = filter === 'all' ? WORK : WORK.filter((p) => p.category === filter)
  // Only offer filters that have at least one work project behind them.
  const filters = ['all', ...CATEGORIES.filter((c) => WORK.some((p) => p.category === c))]

  return (
    <section id="projects" className="section">
      <div className="container">
        <SectionHeader
          eyebrow={t('projectsSection.eyebrow')}
          title={t('projectsSection.title')}
          subtitle={t('projectsSection.subtitle')}
        />
        <div className="filters" role="group" aria-label={t('projectsSection.filterLabel')}>
          {filters.map((key) => (
            <button
              key={key}
              className={`filter${filter === key ? ' is-active' : ''}`}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {key === 'all' ? t('projectsSection.all') : t(`categories.${key}`)}
            </button>
          ))}
        </div>
        <div className="project-grid">
          {shown.map((p) => <ProjectCard key={p.slug} project={p} />)}
        </div>
      </div>
    </section>
  )
}
