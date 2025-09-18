import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Clear any existing onboarding completion flag to ensure fresh start
    localStorage.removeItem('agrilink_onboarding_completed')
    
    // Always redirect to onboarding first
    router.push('/onboarding')
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #2d5a27 0%, #4a7c59 50%, #6b9b7f 100%)',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            marginBottom: '10px',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            AgriLink
          </div>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>Loading...</p>
        </div>
      </div>
    )
  }

  return null
}
