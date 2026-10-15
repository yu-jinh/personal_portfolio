import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon.jsx'
import MediaEmbed from '../components/MediaEmbed.jsx'
import PostToc from '../components/PostToc.jsx'
import ProjectCover from '../components/ProjectCover.jsx'
import { getProject, isResearch, siblingsOf } from '../data/projects.js'
import { getPost, loadPostBody } from '../lib/content.js'
import { formatRange } from '../lib/format.js'
import useDocumentTitle from '../lib/useDocumentTitle.js'
import NotFound from './NotFound.jsx'

function NeighborLink({ project, direction }) {
  const { t, i18n } = useTranslation()
  if (!project) return <span />
  return (
    <Link className={`post-nav-link post-nav-${direction}`} to={`/projects/${project.slug}`}>
      <span className="post-nav-label">
        {direction === 'prev' && <Icon name="arrowLeft" size={14} />}
        {t(`project.${direction}`)}
        {direction === 'next' && <Icon name="arrowRight" size={14} />}
      </span>
      <span className="post-nav-title">{getPost(project.slug, i18n.language).title}</span>
    </Link>
  )
}

// The rendered Markdown body is a separate chunk; `null` while it loads.
function usePostBody(post) {
  const [body, setBody] = useState(null)
  const key = post?.key
  useEffect(() => {
    if (!post) return undefined
    let alive = true
    setBody(null)
    loadPostBody(post).then((loaded) => { if (alive) setBody(loaded) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return body
}

// In-post demo clips are written as <video data-src="…" muted loop playsinline>.
// Each one starts downloading and playing only as it scrolls into view, and
// pauses when it leaves, so a post with many clips stays light.
function useLazyClips(body) {
  useEffect(() => {
    if (!body) return undefined
    const clips = document.querySelectorAll('.prose video[data-src]')
    if (!clips.length) return undefined
    const observer = new IntersectionObserver((entries) => {
      for (const { target: video, isIntersecting } of entries) {
        if (isIntersecting) {
          if (!video.getAttribute('src')) video.src = video.dataset.src
          video.muted = true
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      }
    }, { rootMargin: '200px 0px', threshold: 0.2 })
    clips.forEach((video) => observer.observe(video))
    return () => observer.disconnect()
  }, [body])
}

export default function ProjectPage() {
  const { slug } = useParams()
  const { t, i18n } = useTranslation()
  const project = getProject(slug)
  const post = project ? getPost(slug, i18n.language) : null
  const body = usePostBody(post)
  useLazyClips(body)
  useDocumentTitle(post ? `${post.title} | ${t('hero.name')}` : t('meta.title'))

  if (!project || !post) return <NotFound />

  const research = isResearch(project)
  const siblings = siblingsOf(project)
  const index = siblings.indexOf(project)
  const period = formatRange(project.start, project.end, i18n.language, t('common.present'))

  return (
    <article className="post">
      <header className="post-header">
        <div className="container container-narrow">
          <Link className="back-link" to="/" state={{ scrollTo: research ? 'research' : 'projects' }}>
            <Icon name="arrowLeft" size={16} /> {t(research ? 'project.backResearch' : 'project.back')}
          </Link>
          {research ? (
            <p className="research-meta">
              <span className={`kind-badge kind-${project.kind}`}>{t(`researchSection.kinds.${project.kind}`)}</span>
              <span>{t('researchSection.minRead', { count: post.readingMinutes })}</span>
            </p>
          ) : (
            <p className={`category category-${project.category}`}>{t(`categories.${project.category}`)}</p>
          )}
          <h1>{post.title}</h1>
          <p className="post-lede">{post.summary}</p>
          <dl className="post-meta">
            <div className="post-meta-role">
              <dt>{t('project.role')}</dt>
              <dd>{post.role}</dd>
            </div>
            {project.org && (
              <div>
                <dt>{t('project.company')}</dt>
                <dd>{project.org}</dd>
              </div>
            )}
            <div>
              <dt>{t('project.period')}</dt>
              <dd>{period}</dd>
            </div>
            <div className="post-meta-stack">
              <dt>{t('project.stack')}</dt>
              <dd>
                <ul className="tags">
                  {project.stack.map((s) => <li className="tag" key={s}>{s}</li>)}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="container container-media">
        {project.video
          ? <MediaEmbed src={project.video} title={post.title} poster={project.cover} />
          : <ProjectCover project={project} alt={post.title} large />}
      </div>

      <div className="container container-narrow">
        {body ? (
          <PostToc toc={body.toc}>
            <div className="prose" dangerouslySetInnerHTML={{ __html: body.html }} />
          </PostToc>
        ) : (
          <div className="prose-loading" aria-busy="true" />
        )}

        <nav className="post-nav" aria-label={t('project.more')}>
          <NeighborLink project={siblings[index - 1]} direction="prev" />
          <NeighborLink project={siblings[index + 1]} direction="next" />
        </nav>
      </div>
    </article>
  )
}
