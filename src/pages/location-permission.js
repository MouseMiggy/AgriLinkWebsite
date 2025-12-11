import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import StepIndicator from '../components/StepIndicator'
import styles from '../../styles/modules/location-permission.module.css'

export default function LocationPermission() {
  const [loading, setLoading] = useState(false)
  const [allowLocationLoading, setAllowLocationLoading] = useState(false)
  const [skipLocationLoading, setSkipLocationLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Location permission
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
    setAllowLocationLoading(true)
    setLocationStatus('pending')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          
          // Update user's location in Firestore
          const userDocRef = doc(db, 'Users', user.uid)
          await updateDoc(userDocRef, {
            location: {
              latitude,
              longitude,
              timestamp: new Date()
            },
            locationPermissionGranted: true,
            locationSkipped: false,
            updatedAt: new Date()
          })
          
          setLocationStatus('granted')
          
          // Navigate to appropriate onboarding after a short delay
          setTimeout(() => {
            navigateToRoleOnboarding()
          }, 2000)
          
        } catch (err) {
          console.error('Error saving location:', err)
          showErrorToast('Failed to save location. Please try again.')
        } finally {
          setAllowLocationLoading(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationStatus('denied')
        setAllowLocationLoading(false)
        
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

  const handleBack = () => {
    router.push('/role-selection')
  }

  const skipLocation = async () => {
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
    }
  }

  const navigateToRoleOnboarding = async () => {
    // Go directly to livestock onboarding (step 2) after location permission
    router.push('/livestock-onboarding')
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
          <div className={styles.topBar}>
            <button className={styles.backButton} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <StepIndicator currentStep={currentStep} totalSteps={4} variant="dots" />
            <img 
              src="/assets/images/AgrilinkLogo.png" 
              alt="AgriLink Logo" 
              className={styles.logo}
            />
          </div>
          
          <div className={styles.mainContent}>
            <div className={styles.leftSection}>
              <h1 className={styles.title}>
                <div>
                  <div>Allow <span style={{ color: '#2d5a27' }}>Location</span></div>
                  <div>Access</div>
                </div>
              </h1>
              
              <p className={styles.subtitle}>
                Turn on location so AgriLink can match you with farmers and listings that are truly close to you.
              </p>
            </div>

            <div className={styles.rightSection}>
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

              {locationStatus === 'granted' && (
                <div className={styles.successIndicator}>
                  <i className="fas fa-check-circle"></i>
                  <span>Location Access Granted</span>
                </div>
              )}

              {locationStatus !== 'granted' && (
                <div className={styles.actionContainer}>
                  <button 
                    className={styles.skipButton}
                    onClick={skipLocation}
                  >
                    Skip for Now
                  </button>

                  <button 
                    className={styles.allowButton}
                    onClick={requestLocation}
                    disabled={allowLocationLoading}
                  >
                    {allowLocationLoading ? (
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
                </div>
              )}

            </div>
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
