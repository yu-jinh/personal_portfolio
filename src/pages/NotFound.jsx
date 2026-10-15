import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon.jsx'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="section not-found">
      <div className="container container-narrow">
        <p className="eyebrow">404</p>
        <h1>{t('notFound.title')}</h1>
        <p className="section-subtitle">{t('notFound.text')}</p>
        <Link className="btn btn-primary" to="/">
          <Icon name="arrowLeft" size={16} /> {t('notFound.home')}
        </Link>
      </div>
    </section>
  )
}
