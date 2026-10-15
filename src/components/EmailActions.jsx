import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'
import { PROFILE } from '../data/profile.js'

// A mailto button with a copy-to-clipboard companion, for visitors whose
// browser has no mail client set up. "Copied" is also announced to screen readers.
export default function EmailActions({ showAddress = false }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email)
    } catch {
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="email-actions">
      <a className={showAddress ? 'email-address' : 'btn btn-primary'} href={`mailto:${PROFILE.email}`}>
        {showAddress ? PROFILE.email : <><Icon name="mail" size={16} /> {t('hero.email')}</>}
      </a>
      <button
        type="button"
        className={`btn btn-icon copy-btn${copied ? ' is-copied' : ''}`}
        onClick={copy}
        aria-label={t('hero.copyEmail')}
        title={t('hero.copyEmail')}
      >
        <Icon name={copied ? 'check' : 'copy'} size={16} />
      </button>
      <span className="copy-status" role="status" aria-live="polite">
        {copied ? t('hero.copied') : ''}
      </span>
    </div>
  )
}
