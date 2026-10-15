import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Fades and lifts its content in the first time it scrolls into view.
// Shows immediately when motion is reduced or IntersectionObserver is missing.
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(prefersReducedMotion)

  useEffect(() => {
    if (shown) return undefined
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) {
      setShown(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [shown])

  return (
    <Tag
      ref={ref}
      className={`reveal${shown ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { '--reveal-delay': `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  )
}
