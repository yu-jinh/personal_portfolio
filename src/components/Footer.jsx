import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="footer">
      <p>{t('footer.builtWith')}</p>
    </footer>
  )
}
