import '../../styles/globals.css'
import '../../styles/error-boundary.css'
import AuthGuard from '../components/AuthGuard'
import { useRouter } from 'next/router'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  
  // Public pages that don't need authentication
  const publicPages = ['/onboarding', '/', '/signin', '/signup', '/verify-code']
  const isPublicPage = publicPages.includes(router.pathname)
  
  if (isPublicPage) {
    return <Component {...pageProps} />
  }
  
  return (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  )
}
