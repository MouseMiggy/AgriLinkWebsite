import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import styles from '../../styles/modules/livestock-onboarding.module.css'

export default function LivestockOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [selectedAnimals, setSelectedAnimals] = useState([])
  const [selectedWasteRange, setSelectedWasteRange] = useState('')
  const router = useRouter()

  const animalTypes = [
    { id: 'cattle', name: 'Cattle/Cows', icon: 'fas fa-cow', description: 'Beef cattle, dairy cows' },
    { id: 'pigs', name: 'Pigs', icon: 'fas fa-pig', description: 'Swine, hogs' },
    { id: 'chickens', name: 'Chickens', icon: 'fas fa-egg', description: 'Broilers, layers' },
    { id: 'goats', name: 'Goats', icon: 'fas fa-mountain', description: 'Dairy goats, meat goats' },
    { id: 'sheep', name: 'Sheep', icon: 'fas fa-sheep', description: 'Wool sheep, meat sheep' },
    { id: 'ducks', name: 'Ducks', icon: 'fas fa-duck', description: 'Meat ducks, egg ducks' },
    { id: 'rabbits', name: 'Rabbits', icon: 'fas fa-rabbit', description: 'Meat rabbits, breeding rabbits' },
    { id: 'other', name: 'Other', icon: 'fas fa-paw', description: 'Other livestock animals' }
  ]

  const wasteRanges = [
    { id: '1-3', label: '1-3 sacks per day', description: 'Small scale operation' },
    { id: '4-10', label: '4-10 sacks per day', description: 'Medium scale operation' },
    { id: '11-25', label: '11-25 sacks per day', description: 'Large scale operation' },
    { id: '26-50', label: '26-50 sacks per day', description: 'Very large scale operation' },
    { id: '50+', label: '50+ sacks per day', description: 'Industrial scale operation' }
  ]

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Verify user role and onboarding status
        try {
          const userDocRef = doc(db, 'Users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const onboarding = userData.onboarding || {}
            
            // If user hasn't selected livestock owner role, redirect to role selection
            if (userData.role !== 'livestock_owner') {
              router.push('/role-selection')
              return
            }

            // If user already completed livestock onboarding, redirect to dashboard
            if (onboarding.livestockOnboardingCompleted) {
              router.push('/dashboard')
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

  const handleAnimalSelect = (animalId) => {
    setSelectedAnimals(prev => {
      if (prev.includes(animalId)) {
        return prev.filter(id => id !== animalId)
      } else {
        return [...prev, animalId]
      }
    })
  }

  const handleWasteRangeSelect = (rangeId) => {
    setSelectedWasteRange(rangeId)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedAnimals.length === 0) {
        showErrorToast('Please select at least one type of livestock animal')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!selectedWasteRange) {
        showErrorToast('Please select your daily waste production range')
        return
      }
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    } else {
      router.push('/location-permission')
    }
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      // Update user profile with livestock information matching mobile app structure
      const userDocRef = doc(db, 'Users', user.uid)
      await updateDoc(userDocRef, {
        role: 'livestock_owner',
        livestock: {
          animals: selectedAnimals
        },
        wasteProductionRange: selectedWasteRange,
        'onboarding.livestockTypes': selectedAnimals,
        'onboarding.livestockTypesCompleted': true,
        'onboarding.wasteProductionCompleted': true,
        'onboarding.livestockOnboardingCompleted': true,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date()
      })

      // Navigate to completion screen
      router.push('/onboarding-complete')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      showErrorToast('Failed to save your information. Please try again.')
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
        <title>Livestock Setup | AgriLink PH</title>
        <meta name="description" content="Tell us about your livestock operation" />
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
            
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${(currentStep / 2) * 100}%` }}
                ></div>
              </div>
              <p className={styles.progressText}>Step {currentStep} of 2</p>
            </div>
          </div>

          <div className={styles.stepContainer}>
            {currentStep === 1 && (
              <div className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepIcon}>
                    <i className="fas fa-cow"></i>
                  </div>
                  <h1 className={styles.stepTitle}>What livestock do you raise?</h1>
                  <p className={styles.stepSubtitle}>
                    Select all the types of animals you currently have on your farm
                  </p>
                </div>

                <div className={styles.optionsGrid}>
                  {animalTypes.map((animal) => (
                    <div
                      key={animal.id}
                      className={`${styles.optionCard} ${selectedAnimals.includes(animal.id) ? styles.selected : ''}`}
                      onClick={() => handleAnimalSelect(animal.id)}
                    >
                      <div className={styles.optionIcon}>
                        <i className={animal.icon}></i>
                      </div>
                      <h3 className={styles.optionTitle}>{animal.name}</h3>
                      <p className={styles.optionDescription}>{animal.description}</p>
                      <div className={styles.selectIndicator}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepIcon}>
                    <i className="fas fa-weight-hanging"></i>
                  </div>
                  <h1 className={styles.stepTitle}>How much waste do you produce daily?</h1>
                  <p className={styles.stepSubtitle}>
                    This helps us match you with crop farmers who need the right amount of fertilizer
                  </p>
                </div>

                <div className={styles.wasteOptions}>
                  {wasteRanges.map((range) => (
                    <div
                      key={range.id}
                      className={`${styles.wasteOption} ${selectedWasteRange === range.id ? styles.selected : ''}`}
                      onClick={() => handleWasteRangeSelect(range.id)}
                    >
                      <div className={styles.wasteOptionContent}>
                        <h3 className={styles.wasteOptionLabel}>{range.label}</h3>
                        <p className={styles.wasteOptionDescription}>{range.description}</p>
                      </div>
                      <div className={styles.selectIndicator}>
                        <i className="fas fa-check-circle"></i>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={styles.actionContainer}>
            <button 
              className={styles.backButton}
              onClick={handleBack}
              disabled={loading}
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </button>

            <button 
              className={`${styles.nextButton} ${
                (currentStep === 1 && selectedAnimals.length > 0) || 
                (currentStep === 2 && selectedWasteRange) ? styles.active : ''
              }`}
              onClick={handleNext}
              disabled={
                loading || 
                (currentStep === 1 && selectedAnimals.length === 0) ||
                (currentStep === 2 && !selectedWasteRange)
              }
            >
              {loading ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{currentStep === 2 ? 'Complete Setup' : 'Next'}</span>
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>
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
