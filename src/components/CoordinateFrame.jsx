import { useEffect, useRef } from 'react'

// Two coordinate frames linked by a transform, the idea behind most of the
// work on this site (robot base, camera, object, headset). Draws itself in on
// load and tilts a few degrees toward the pointer; static when motion is reduced.
export default function CoordinateFrame({ label }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(pointer: fine)')
    if (reduce.matches || !fine.matches) return undefined
    let frame = 0
    const onMove = (e) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const x = e.clientX / window.innerWidth - 0.5
        const y = e.clientY / window.innerHeight - 0.5
        el.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`)
        el.style.setProperty('--tilt-y', `${(x * 14).toFixed(2)}deg`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <figure className="frame-figure" ref={ref}>
      <svg viewBox="0 0 320 240" role="img" aria-label={label}>
        <defs>
          {['x', 'y', 'z', 'link'].map((k) => (
            <marker key={k} id={`tip-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 1 L9 5 L0 9 z" className={`tip tip-${k}`} />
            </marker>
          ))}
        </defs>
        {/* drafting grid */}
        <g className="frame-grid">
          {[40, 80, 120, 160, 200].map((y) => <line key={`h${y}`} x1="0" x2="320" y1={y} y2={y} />)}
          {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={`v${x}`} y1="0" y2="240" x1={x} x2={x} />)}
        </g>

        {/* base frame */}
        <g className="frame frame-base">
          <line className="axis axis-x" data-axis="x" x1="96" y1="168" x2="34" y2="204" markerEnd="url(#tip-x)" />
          <line className="axis axis-y" data-axis="y" x1="96" y1="168" x2="172" y2="198" markerEnd="url(#tip-y)" />
          <line className="axis axis-z" data-axis="z" x1="96" y1="168" x2="96" y2="82" markerEnd="url(#tip-z)" />
          <circle cx="96" cy="168" r="3.5" />
          <text x="22" y="222">x</text>
          <text x="178" y="214">y</text>
          <text x="104" y="84">z</text>
          <text className="frame-name" x="62" y="148">base</text>
        </g>

        {/* transform between frames */}
        <path className="frame-link" d="M104 160 C 160 100, 200 92, 238 86" markerEnd="url(#tip-link)" />
        <text className="frame-t" x="168" y="96">T</text>

        {/* object frame, rotated */}
        <g className="frame frame-object">
          <line className="axis axis-x" data-axis="x" x1="250" y1="80" x2="290" y2="104" markerEnd="url(#tip-x)" />
          <line className="axis axis-y" data-axis="y" x1="250" y1="80" x2="218" y2="112" markerEnd="url(#tip-y)" />
          <line className="axis axis-z" data-axis="z" x1="250" y1="80" x2="262" y2="28" markerEnd="url(#tip-z)" />
          <circle cx="250" cy="80" r="3" />
          <text className="frame-name" x="254" y="132">object</text>
        </g>
      </svg>
    </figure>
  )
}
