import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Sets `document.title` to `<page title> · <app name>` (frontend-architecture §3). Every route component calls it with
 * its translated title, so the title follows a language change without a navigation. In `lib`, so feature pages can
 * use it too (features do not import `app/`, frontend-architecture §1).
 */
export function usePageTitle(pageTitle: string) {
  const { t } = useTranslation()
  const documentTitle = t('app.documentTitle', { page: pageTitle, app: t('app.name') })
  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])
}
