import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import styles from '../../styles/modules/onboarding-complete.module.css'

export default function OnboardingComplete() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [userName, setUserName] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Set initial username from auth immediately for faster UI
        setUserName(currentUser.displayName?.split(' ')[0] || 'User')
        
        // Get user data from Firestore
        try {
          const userDocRef = doc(db, 'users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role || '')
            // Update username with Firestore data if available
            if (userData.firstName) {
              setUserName(userData.firstName)
            }
            
            // If user hasn't completed onboarding, redirect to appropriate page
            if (!userData.onboardingCompleted) {
              if (!userData.roleSelected) {
                router.push('/role-selection')
                return
              } else if (userData.role === 'livestock_owner') {
                router.push('/livestock-onboarding')
                return
              } else if (userData.role === 'crop_farmer') {
                router.push('/crop-onboarding')
                return
              }
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err)
        }
      } else {
        // Redirect to signin if not authenticated
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleGoToDashboard = () => {
    setRedirecting(true)
    router.push('/dashboard')
  }

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'livestock_owner':
        return 'Livestock Owner'
      case 'crop_farmer':
        return 'Crop Farmer'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'livestock_owner':
        return 'fas fa-cow'
      case 'crop_farmer':
        return 'fas fa-seedling'
    }
  }

  const getRoleDescription = (role) => {
    switch (role) {
      case 'livestock_owner':
        return 'You can now list your livestock waste and connect with crop farmers who need organic fertilizer.'
      case 'crop_farmer':
        return 'You can now browse available livestock waste and connect with livestock owners in your area.'
    }
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Welcome to AgriLink! | AgriLink PH</title>
        <meta name="description" content="Your AgriLink profile is now complete" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>

      <div className={styles.container}>
        <div className={styles.backgroundPattern}></div>
        
        <div className={styles.content}>
          <div className={styles.header}>
            <div className={styles.logoContainer}>
              <img 
                src="/assets/images/AgrilinkLogo.png" 
                alt="AgriLink Logo" 
                className={styles.logo}
              />
            </div>
          </div>

          <div className={styles.mainContent}>
            <div className={styles.successAnimation}>
              <div className={styles.checkmarkContainer}>
                <div className={styles.checkmark}>
                  <i className="fas fa-check"></i>
                </div>
              </div>
            </div>

            <div className={styles.welcomeSection}>
              <h1 className={styles.title}>Nice! You're all set up!</h1>
              <p className={styles.subtitle}>
                Welcome to AgriLink, <span className={styles.userName}>{userName}</span>!
              </p>
            </div>

            {(userRole === 'livestock_owner' || userRole === 'crop_farmer') && (
              <div className={styles.roleCard}>
                <div className={styles.roleIcon}>
                  <i className={getRoleIcon(userRole)}></i>
                </div>
                <h2 className={styles.roleTitle}>
                  You're registered as a {getRoleDisplayName(userRole)}
                </h2>
                <p className={styles.roleDescription}>
                  {getRoleDescription(userRole)}
                </p>
              </div>
            )}

            <div className={styles.featuresGrid}>
              <div className={styles.feature}>
                <h3 className={styles.featureTitle}>Connect</h3>
                <p className={styles.featureDescription}>
                  Find and connect with farmers in your area
                </p>
              </div>

              <div className={styles.feature}>
                <h3 className={styles.featureTitle}>Exchange</h3>
                <p className={styles.featureDescription}>
                  Trade livestock waste for mutual benefit
                </p>
              </div>

              <div className={styles.feature}>
                <h3 className={styles.featureTitle}>Grow</h3>
                <p className={styles.featureDescription}>
                  Build a sustainable farming community
                </p>
              </div>
            </div>

            <div className={styles.actionContainer}>
              <button 
                className={`${styles.dashboardButton} ${redirecting ? styles.loading : ''}`}
                onClick={handleGoToDashboard}
                disabled={redirecting}
              >
                {redirecting ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    <span>Loading Dashboard...</span>
                  </>
                ) : (
                  <>
                    <span>Go to Dashboard</span>
                    <i className="fas fa-arrow-right"></i>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
