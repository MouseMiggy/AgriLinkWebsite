import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import styles from '../../styles/modules/location-permission.module.css'

export default function LocationPermission() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [locationStatus, setLocationStatus] = useState('pending') // pending, granted, denied
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Get user role from Firestore
        try {
          const userDocRef = doc(db, 'Users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role || '')
            
            // If user hasn't selected a role, redirect to role selection
            if (!userData.roleSelected) {
              router.push('/role-selection')
              return
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

  const showErrorToast = (message) => {
    setError(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 5000)
  }

  const dismissToast = () => {
    setShowToast(false)
  }

  const requestLocation = () => {
    setLoading(true)

    if (!navigator.geolocation) {
      showErrorToast('Geolocation is not supported by this browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          
          // Update user location in Firestore
          const userDocRef = doc(db, 'Users', user.uid)
          await updateDoc(userDocRef, {
            location: {
              latitude,
              longitude,
              timestamp: new Date()
            },
            locationPermissionGranted: true,
            updatedAt: new Date()
          })

          setLocationStatus('granted')
          
          // Wait a moment to show success, then navigate to role-specific onboarding
          setTimeout(() => {
            navigateToRoleOnboarding()
          }, 1500)
          
        } catch (err) {
          console.error('Error saving location:', err)
          showErrorToast('Failed to save location. Please try again.')
        } finally {
          setLoading(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationStatus('denied')
        setLoading(false)
        
        let errorMessage = 'Unable to get your location. '
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.'
            break
          default:
            errorMessage += 'An unknown error occurred.'
            break
        }
        
        showErrorToast(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }

  const skipLocation = async () => {
    setLoading(true)

    try {
      // Update user to indicate they skipped location
      const userDocRef = doc(db, 'Users', user.uid)
      await updateDoc(userDocRef, {
        locationPermissionGranted: false,
        locationSkipped: true,
        updatedAt: new Date()
      })

      navigateToRoleOnboarding()
    } catch (err) {
      console.error('Error updating user data:', err)
      showErrorToast('Failed to proceed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const navigateToRoleOnboarding = async () => {
    try {
      // Check if user has already completed onboarding for their role
      const userDocRef = doc(db, 'Users', user.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}
      const onboarding = userData.onboarding || {}

      // If onboarding already completed for current role, go to dashboard
      if (userRole === 'livestock_owner' && onboarding.livestockOnboardingCompleted) {
        console.log('Livestock onboarding already completed, going to dashboard')
        router.push('/dashboard')
        return
      } else if (userRole === 'crop_farmer' && onboarding.cropOnboardingCompleted) {
        console.log('Crop farmer onboarding already completed, going to dashboard')
        router.push('/dashboard')
        return
      }

      // Navigate to appropriate onboarding
      if (userRole === 'livestock_owner') {
        router.push('/livestock-onboarding')
      } else if (userRole === 'crop_farmer') {
        router.push('/crop-onboarding')
      } else {
        // Fallback to dashboard if role is unclear
        router.push('/dashboard')
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err)
      // Fallback navigation on error
      if (userRole === 'livestock_owner') {
        router.push('/livestock-onboarding')
      } else if (userRole === 'crop_farmer') {
        router.push('/crop-onboarding')
      } else {
        router.push('/dashboard')
      }
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
        <title>Location Permission | AgriLink PH</title>
        <meta name="description" content="Allow location access to connect with nearby farmers" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
            <div className={styles.iconContainer}>
              <div className={`${styles.locationIcon} ${locationStatus === 'granted' ? styles.success : ''}`}>
                {locationStatus === 'granted' ? (
                  <i className="fas fa-check-circle"></i>
                ) : (
                  <i className="fas fa-map-marker-alt"></i>
                )}
              </div>
            </div>

            <h1 className={styles.title}>
              {locationStatus === 'granted' ? 'Location Saved' : 'Allow Location Access'}
            </h1>
            
            <p className={styles.subtitle}>
              {locationStatus === 'granted' 
                ? 'Your location details are now securely stored so we can suggest relevant connections nearby.'
                : 'Turn on location so AgriLink can match you with farmers and listings that are truly close to you.'
              }
            </p>

            <div className={styles.benefitsContainer}>
              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-users"></i>
                </div>
                <div className={styles.benefitText}>
                  <h3>Discover Nearby Farmers</h3>
                  <p>Quickly find livestock owners and crop farmers operating around your location.</p>
                </div>
              </div>

              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-truck"></i>
                </div>
                <div className={styles.benefitText}>
                  <h3>Lower Transport Costs</h3>
                  <p>Exchange waste and inputs with nearby farmers to reduce delivery time and expenses.</p>
                </div>
              </div>

              <div className={styles.benefit}>
                <div className={styles.benefitIcon}>
                  <i className="fas fa-leaf"></i>
                </div>
                <div className={styles.benefitText}>
                  <h3>Support Local Agriculture</h3>
                  <p>Strengthen a sustainable farming network within your community and province.</p>
                </div>
              </div>
            </div>

            {locationStatus !== 'granted' && (
              <div className={styles.actionContainer}>
                <button 
                  className={styles.allowButton}
                  onClick={requestLocation}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className={styles.buttonSpinner}></div>
                      <span>Getting Location...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-location-arrow"></i>
                      <span>Allow Location Access</span>
                    </>
                  )}
                </button>

                <button 
                  className={styles.skipButton}
                  onClick={skipLocation}
                  disabled={loading}
                >
                  Skip for Now
                </button>

                <p className={styles.privacyNote}>
                  <i className="fas fa-shield-alt"></i>
                  Your location is kept private and only used to show nearby farmers
                </p>
              </div>
            )}

            {locationStatus === 'granted' && (
              <div className={styles.successContainer}>
                <div className={styles.successAnimation}>
                  <i className="fas fa-check"></i>
                </div>
                <p className={styles.successText}>Redirecting to complete your profile...</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
            <i className={`fas fa-exclamation-circle ${styles.toastIcon}`}></i>
            <span className={styles.toastMessage}>{error}</span>
            <button className={styles.toastClose} onClick={dismissToast}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
