import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function AuthGuard({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      
      // Redirect to signin if not authenticated and not on public pages
      if (!user && !['/signin', '/signup', '/verify-code', '/onboarding', '/'].includes(router.pathname)) {
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  if (loading) {
    return null
  }

  return children
}
