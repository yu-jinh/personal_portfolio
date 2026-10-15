import { useEffect, useState } from 'react'

const media = window.matchMedia('(prefers-color-scheme: dark)')

function savedTheme() {
  try {
    const value = localStorage.getItem('theme')
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

// Follows the OS theme until the visitor picks one; the pick is remembered.
// index.html applies the saved pick before first paint to avoid a flash.
export default function useTheme() {
  const [choice, setChoice] = useState(savedTheme)
  const [systemDark, setSystemDark] = useState(media.matches)

  useEffect(() => {
    const onChange = (e) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme = choice || (systemDark ? 'dark' : 'light')

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setChoice(next)
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch {}
  }

  return { theme, toggle }
}
