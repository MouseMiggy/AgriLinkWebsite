import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import styles from '../../styles/modules/crop-onboarding.module.css'

export default function CropOnboarding() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [selectedCrops, setSelectedCrops] = useState([])
  const [selectedFarmSize, setSelectedFarmSize] = useState('')
  const router = useRouter()

  const cropTypes = [
    { id: 'rice', name: 'Rice', icon: 'fas fa-seedling', description: 'Palay, bigas' },
    { id: 'corn', name: 'Corn', icon: 'fas fa-corn', description: 'Yellow corn, white corn' },
    { id: 'vegetables', name: 'Vegetables', icon: 'fas fa-carrot', description: 'Leafy greens, root vegetables' },
    { id: 'fruits', name: 'Fruits', icon: 'fas fa-apple-alt', description: 'Tropical fruits, citrus' },
    { id: 'coconut', name: 'Coconut', icon: 'fas fa-tree', description: 'Coconut palms' },
    { id: 'sugarcane', name: 'Sugarcane', icon: 'fas fa-leaf', description: 'Sugar production' },
    { id: 'coffee', name: 'Coffee', icon: 'fas fa-coffee', description: 'Arabica, robusta' },
    { id: 'banana', name: 'Banana', icon: 'fas fa-banana', description: 'Cavendish, saba' },
    { id: 'cassava', name: 'Cassava', icon: 'fas fa-potato', description: 'Root crop, kamote' },
    { id: 'other', name: 'Other Crops', icon: 'fas fa-spa', description: 'Other agricultural crops' }
  ]

  const farmSizes = [
    { id: 'small', label: '0.5 - 2 hectares', description: 'Small scale farming' },
    { id: 'medium', label: '2 - 10 hectares', description: 'Medium scale farming' },
    { id: 'large', label: '10 - 50 hectares', description: 'Large scale farming' },
    { id: 'commercial', label: '50+ hectares', description: 'Commercial scale farming' }
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
            
            // If user hasn't selected crop farmer role, redirect to role selection
            if (userData.role !== 'crop_farmer') {
              router.push('/role-selection')
              return
            }

            // If user already completed crop onboarding, redirect to dashboard
            if (onboarding.cropOnboardingCompleted) {
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

  const handleCropSelect = (cropId) => {
    setSelectedCrops(prev => {
      if (prev.includes(cropId)) {
        return prev.filter(id => id !== cropId)
      } else {
        return [...prev, cropId]
      }
    })
  }

  const handleFarmSizeSelect = (sizeId) => {
    setSelectedFarmSize(sizeId)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedCrops.length === 0) {
        showErrorToast('Please select at least one type of crop you grow')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!selectedFarmSize) {
        showErrorToast('Please select your farm size')
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
      // Update user profile with crop farming information matching mobile app structure
      const userDocRef = doc(db, 'Users', user.uid)
      await updateDoc(userDocRef, {
        role: 'crop_farmer',
        cropFarmer: {
          cropType: selectedCrops
        },
        farmSize: selectedFarmSize,
        'onboarding.cropTypes': selectedCrops,
        'onboarding.cropTypesCompleted': true,
        'onboarding.farmSizeCompleted': true,
        'onboarding.cropOnboardingCompleted': true,
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
        <title>Crop Farm Setup | AgriLink PH</title>
        <meta name="description" content="Tell us about your crop farming operation" />
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
                    <i className="fas fa-seedling"></i>
                  </div>
                  <h1 className={styles.stepTitle}>What crops do you grow?</h1>
                  <p className={styles.stepSubtitle}>
                    Select all the types of crops you currently cultivate on your farm
                  </p>
                </div>

                <div className={styles.optionsGrid}>
                  {cropTypes.map((crop) => (
                    <div
                      key={crop.id}
                      className={`${styles.optionCard} ${selectedCrops.includes(crop.id) ? styles.selected : ''}`}
                      onClick={() => handleCropSelect(crop.id)}
                    >
                      <div className={styles.optionIcon}>
                        <i className={crop.icon}></i>
                      </div>
                      <h3 className={styles.optionTitle}>{crop.name}</h3>
                      <p className={styles.optionDescription}>{crop.description}</p>
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
                    <i className="fas fa-ruler-combined"></i>
                  </div>
                  <h1 className={styles.stepTitle}>How big is your farm?</h1>
                  <p className={styles.stepSubtitle}>
                    This helps us estimate your fertilizer needs and match you with appropriate livestock owners
                  </p>
                </div>

                <div className={styles.farmSizeOptions}>
                  {farmSizes.map((size) => (
                    <div
                      key={size.id}
                      className={`${styles.farmSizeOption} ${selectedFarmSize === size.id ? styles.selected : ''}`}
                      onClick={() => handleFarmSizeSelect(size.id)}
                    >
                      <div className={styles.farmSizeOptionContent}>
                        <h3 className={styles.farmSizeOptionLabel}>{size.label}</h3>
                        <p className={styles.farmSizeOptionDescription}>{size.description}</p>
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
                (currentStep === 1 && selectedCrops.length > 0) || 
                (currentStep === 2 && selectedFarmSize) ? styles.active : ''
              }`}
              onClick={handleNext}
              disabled={
                loading || 
                (currentStep === 1 && selectedCrops.length === 0) ||
                (currentStep === 2 && !selectedFarmSize)
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
