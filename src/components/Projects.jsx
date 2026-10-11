import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const COLLECTION_KEYS = ['umi', 'ego']
const INTERACTION_KEYS = ['teleop', 'coglet']

function VideoSlot({ text }) {
  return (
    <div className="video-slot">
      <span className="video-slot-icon">▶</span>
      <span>{text}</span>
    </div>
  )
}

function ProjectCard({ k }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <article className="card">
      <VideoSlot text={t(`projects.${k}.videoPlaceholder`)} />
      <div className="card-body">
        <p className="video-label">{t('projectCard.videoLabel')}</p>
        <h3>{t(`projects.${k}.title`)}</h3>
        <p className="summary">{t(`projects.${k}.summary`)}</p>
        <div className="tags">
          {(t(`projects.${k}.stack`, { returnObjects: true }) || []).map((s) => (
            <span className="tag" key={s}>{s}</span>
          ))}
        </div>
        <p className="role"><strong>{t('projectCard.roleLabel')}：</strong>{t(`projects.${k}.role`)}</p>
        <button className="link-btn" onClick={() => setOpen(!open)}>
          {open ? t('projectCard.hideDetails') : t('projectCard.showDetails')}
        </button>
        {open && <p className="details">{t(`projects.${k}.details`)}</p>}
      </div>
    </article>
  )
}

function Group({ groupKey, keys }) {
  const { t } = useTranslation()
  return (
    <div className="group">
      <h3 className="group-title">{t(`projectGroups.${groupKey}.title`)}</h3>
      <p className="group-subtitle">{t(`projectGroups.${groupKey}.subtitle`)}</p>
      <div className="cards">
        {keys.map((k) => <ProjectCard key={k} k={k} />)}
      </div>
    </div>
  )
}

export default function Projects() {
  const { t } = useTranslation()
  return (
    <section id="projects" className="section">
      <h2>{t('nav.projects')}</h2>
      <Group groupKey="collection" keys={COLLECTION_KEYS} />
      <Group groupKey="interaction" keys={INTERACTION_KEYS} />
    </section>
  )
}
