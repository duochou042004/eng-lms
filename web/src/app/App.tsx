import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router'
import { UiProvider } from '../ui'
import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter())
  const { i18n } = useTranslation()
  return (
    <QueryClientProvider client={queryClient}>
      <UiProvider locale={i18n.language}>
        <RouterProvider router={router} />
      </UiProvider>
    </QueryClientProvider>
  )
}
