import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router'
import { UiProvider } from '../ui'
import { connectAuthProblems } from './guards'
import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter(queryClient))
  const { i18n } = useTranslation()
  useEffect(() => connectAuthProblems(router, queryClient), [router, queryClient])
  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider locale={i18n.language}>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>
  )
}
