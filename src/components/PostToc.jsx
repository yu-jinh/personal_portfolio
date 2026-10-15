import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Only long write-ups get a table of contents; short case studies don't need one.
const MIN_SECTIONS = 7

// "On this page" for long project posts: a sticky sidebar on wide screens,
// a collapsible box above the article otherwise. Uses buttons + scrollIntoView
// because a plain #anchor link would be read as a route by the HashRouter.
export default function PostToc({ toc, children }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(null)
  const enabled = toc && toc.length >= MIN_SECTIONS

  useEffect(() => {
    if (!enabled) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      let current = toc[0].id
      for (const { id } of toc) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 140) current = id
      }
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [enabled, toc])

  if (!enabled) return children

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const list = (
    <ol className="toc-list">
      {toc.map((item) => (
        <li key={item.id}>
          <button className={item.id === active ? 'is-active' : ''} onClick={() => jump(item.id)}>
            {item.text}
          </button>
        </li>
      ))}
    </ol>
  )

  return (
    <div className="post-body has-toc">
      <details className="toc-inline">
        <summary>{t('project.toc')}</summary>
        {list}
      </details>
      {children}
      <aside className="toc-side" aria-label={t('project.toc')}>
        <div className="toc-side-inner">
          <p className="toc-title">{t('project.toc')}</p>
          {list}
        </div>
      </aside>
    </div>
  )
}
