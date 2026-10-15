import Reveal from './Reveal.jsx'

// Home-page section: a numbered heading column beside the content on wide
// screens, stacked above it on narrow ones.
export default function Section({ id, index, title, intro, tone, children }) {
  return (
    <section id={id} className={`section${tone ? ` section-${tone}` : ''}`} aria-labelledby={`${id}-title`}>
      <div className="container section-grid">
        <Reveal as="header" className="section-head">
          <p className="section-index" aria-hidden="true">{index}</p>
          <h2 id={`${id}-title`}>{title}</h2>
          {intro && <p className="section-intro">{intro}</p>}
        </Reveal>
        <div className="section-body">{children}</div>
      </div>
    </section>
  )
}
