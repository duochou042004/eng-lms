import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../../lib/i18n/pageTitle'
import { Button, ButtonLink, PageHeader, Stack } from '../../../ui'
import type { CreatedStudent } from '../api/students'
import { AddStudentForm } from '../components/AddStudentForm'
import { CredentialsCard } from '../components/CredentialsCard'
import '../i18n'

/**
 * `/tutor/students/new` (FR-STU-01, ux-flows F2; T-M2.5 scopes 4–5): the form, then, after a create, the credentials
 * card in its place. The credentials exist only in this component's state (never the query cache, the URL, history
 * state or storage): Back or leaving the page drops them, and a later visit shows an empty form.
 */
export function AddStudentPage() {
  const { t } = useTranslation('students')
  usePageTitle(t('form.title'))
  const [created, setCreated] = useState<CreatedStudent | null>(null)
  const [round, setRound] = useState(0)
  // Leaving the document (also into the back/forward cache) drops the credentials, so a restore never shows them
  // (AC12 (m)); committed synchronously, before the page is frozen.
  useEffect(() => {
    const drop = () => flushSync(() => setCreated(null))
    window.addEventListener('pagehide', drop)
    return () => window.removeEventListener('pagehide', drop)
  }, [])
  return (
    <Stack gap={6}>
      <PageHeader title={t('form.title')} description={created ? undefined : t('form.description')} />
      {created ? (
        <CredentialsCard
          credentials={{ ...created.credentials, fullName: created.student.fullName }}
          title={t('card.title')}
          intro={t('card.intro', { name: created.student.fullName })}
          actions={
            <>
              <ButtonLink variant="secondary" to={`/tutor/students/${created.student.id}`}>
                {t('card.openWorkspace')}
              </ButtonLink>
              <Button
                variant="quiet"
                onPress={() => {
                  setCreated(null)
                  setRound((n) => n + 1)
                }}
              >
                {t('card.addAnother')}
              </Button>
            </>
          }
        />
      ) : (
        <AddStudentForm key={round} onCreated={setCreated} focusFirstField={round > 0} />
      )}
    </Stack>
  )
}
