import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Clear any existing onboarding completion flag to ensure fresh start
    localStorage.removeItem('agrilink_onboarding_completed')
    
    // Show loading for 22 seconds before redirecting
    const timer = setTimeout(() => {
      router.push('/onboarding')
      setIsLoading(false)
    }, 1000) // 22 seconds

    return () => clearTimeout(timer)
  }, [router])

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        width: '100vw',
        backgroundColor: '#ffffff',
        background: '#ffffff',
        color: '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{ 
          textAlign: 'center',
          backgroundColor: 'transparent'
        }}>
          <img 
            src="/assets/images/AgrilinkLogo.png" 
            alt="AgriLink Logo" 
            style={{ 
              maxWidth: '200px', 
              height: 'auto',
              marginBottom: '20px',
              display: 'block',
              animation: 'fadeInScale 1.5s ease-in-out infinite alternate'
            }} 
          />
          <style jsx>{`
            @keyframes fadeInScale {
              0% {
                opacity: 0.7;
                transform: scale(0.95);
              }
              100% {
                opacity: 1;
                transform: scale(1.05);
              }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return null
}
