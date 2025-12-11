import '../../styles/globals.css'
import '../../styles/error-boundary.css'
import AuthGuard from '../components/AuthGuard'
import { PopupProvider } from '../contexts/PopupContext'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  // Public pages that don't need authentication
  const publicPages = ['/onboarding', '/', '/signin', '/signup', '/verify-code', '/phone-number-verification', '/forgot-password', '/verify-reset-code', '/reset-password']
  const isPublicPage = publicPages.includes(router.pathname)
  
  if (isPublicPage) {
    return (
      <PopupProvider>
        <Component {...pageProps} />
      </PopupProvider>
    )
  }
  
  return (
    <PopupProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </PopupProvider>
  )
}
