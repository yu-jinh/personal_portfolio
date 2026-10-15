import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../components/Icon.jsx'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <section className="not-found">
      <div className="container container-narrow">
        <p className="item-meta"><span className="item-index">404</span></p>
        <h1>{t('notFound.title')}</h1>
        <p className="not-found-text">{t('notFound.text')}</p>
        <Link className="btn btn-primary" to="/">
          <Icon name="arrowLeft" size={16} /> {t('notFound.home')}
        </Link>
      </div>
    </section>
  )
}
