import Icon from './Icon.jsx'

// Shows the project's cover image when one is set, otherwise generated cover art
// (category gradient + glyph + short label) so cards never look unfinished.
export default function ProjectCover({ project, alt, large = false }) {
  const className = `cover cover-${project.category}${large ? ' cover-large' : ''}`
  if (project.cover) {
    return (
      <div className={className}>
        <img src={project.cover} alt={alt} loading="lazy" />
      </div>
    )
  }
  return (
    <div className={className} aria-hidden="true">
      <Icon name={project.category} size={large ? 88 : 56} className="cover-glyph" />
      <span className="cover-label">{project.label}</span>
    </div>
  )
}
