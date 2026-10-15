// Key numbers, each printed with what it measures (from the post's `facts` frontmatter).
export default function Facts({ facts, className = '', label }) {
  if (!facts?.length) return null
  return (
    <dl className={`facts ${className}`.trim()} aria-label={label}>
      {facts.map((f) => (
        <div key={f.value + f.context}>
          <dt>{f.context}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
