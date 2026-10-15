// A project's cover image, or nothing when the project has none
// (surveys and notes are text-first and go without one).
export default function ProjectCover({ project, alt, className = '', eager = false }) {
  if (!project.cover) return null
  return (
    <div className={`cover ${className}`.trim()}>
      <img src={project.cover} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </div>
  )
}
