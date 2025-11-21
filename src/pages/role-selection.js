import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import styles from '../../styles/modules/role-selection.module.css'

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Check if user has already completed onboarding
        try {
          const userDocRef = doc(db, 'Users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const onboarding = userData.onboarding || {}
            const role = userData.role
            
            // If user has a role and completed onboarding, redirect to dashboard
            if (role) {
              if (role === 'livestock_owner' && onboarding.livestockOnboardingCompleted) {
                console.log('User already completed livestock onboarding, redirecting to dashboard')
                router.push('/dashboard')
                return
              } else if (role === 'crop_farmer' && onboarding.cropOnboardingCompleted) {
                console.log('User already completed crop farmer onboarding, redirecting to dashboard')
                router.push('/dashboard')
                return
              }
            }
          }
        } catch (error) {
          console.error('Error checking user onboarding status:', error)
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

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
  }

  const handleContinue = async () => {
    if (!selectedRole) {
      showErrorToast('Please select a role to continue')
      return
    }

    if (!user) {
      showErrorToast('Authentication required')
      return
    }

    setLoading(true)

    try {
      // Update user role in Firestore
      const userDocRef = doc(db, 'Users', user.uid)
      await updateDoc(userDocRef, {
        role: selectedRole,
        roleSelected: true,
        roleSelectedAt: new Date(),
        updatedAt: new Date()
      })

      // Get user data to check onboarding status
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}
      const onboarding = userData.onboarding || {}

      // Check if user has location decision (global, not per role)
      const hasLocationDecision = userData.locationPermissionGranted === true || userData.locationSkipped === true

      if (!hasLocationDecision) {
        router.push('/location-permission')
        return
      }

      // Role-specific onboarding navigation
      if (selectedRole === 'livestock_owner') {
        // Check if livestock onboarding is already completed
        if (onboarding.livestockOnboardingCompleted) {
          console.log('Livestock onboarding already completed, going to dashboard')
          router.push('/dashboard')
        } else {
          router.push('/livestock-onboarding')
        }
      } else if (selectedRole === 'crop_farmer') {
        // Check if crop farmer onboarding is already completed
        if (onboarding.cropOnboardingCompleted) {
          console.log('Crop farmer onboarding already completed, going to dashboard')
          router.push('/dashboard')
        } else {
          router.push('/crop-onboarding')
        }
      }
    } catch (err) {
      console.error('Error updating user role:', err)
      showErrorToast('Failed to save role selection. Please try again.')
    } finally {
      setLoading(false)
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
        <title>Select Your Role | AgriLink PH</title>
        <meta name="description" content="Choose your role to get started with AgriLink" />
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
            <h1 className={styles.title}>Welcome to AgriLink</h1>
            <p className={styles.subtitle}>
              Select your role to continue
            </p>
          </div>

          <div className={styles.roleContainer}>
            <div className={styles.roleCards}>
              {/* Livestock Owner Card */}
              <div 
                className={`${styles.roleCard} ${selectedRole === 'livestock_owner' ? styles.selected : ''}`}
                onClick={() => handleRoleSelect('livestock_owner')}
              >
                <h3 className={styles.roleTitle}>Livestock Owner</h3>
                <p className={styles.roleDescription}>
                  Raise livestock and share organic waste with crop farmers
                </p>
                {selectedRole === 'livestock_owner' && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>

              {/* Crop Farmer Card */}
              <div 
                className={`${styles.roleCard} ${selectedRole === 'crop_farmer' ? styles.selected : ''}`}
                onClick={() => handleRoleSelect('crop_farmer')}
              >
                <h3 className={styles.roleTitle}>Crop Farmer</h3>
                <p className={styles.roleDescription}>
                  Grow crops and source organic fertilizer from livestock waste
                </p>
                {selectedRole === 'crop_farmer' && (
                  <div className={styles.checkmark}>✓</div>
                )}
              </div>
            </div>

            <div className={styles.actionContainer}>
              <button 
                className={`${styles.continueButton} ${selectedRole ? styles.active : ''}`}
                onClick={handleContinue}
                disabled={!selectedRole || loading}
              >
                {loading ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
              </button>
              
              <p className={styles.helpText}>
                You can change this later in settings
              </p>
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
