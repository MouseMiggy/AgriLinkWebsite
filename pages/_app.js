import '../styles/globals.css'
import '../styles/error-boundary.css'
import AuthGuard from '../components/AuthGuard'

export default function App({ Component, pageProps }) {
  return (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  )
}
