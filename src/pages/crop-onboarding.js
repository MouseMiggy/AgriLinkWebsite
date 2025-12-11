import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import StepIndicator from '../components/StepIndicator'
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
    { id: 'rice', name: 'Rice', icon: '/assets/images/wheat.png', description: 'Palay, Bigas' },
    { id: 'corn', name: 'Corn', icon: '/assets/images/corn.png', description: 'Green corn, Yellow corn' },
    { id: 'vegetables', name: 'Vegetables', icon: '/assets/images/lettuce.png', description: 'Leafy vegetables, Other vegetables' },
    { id: 'fruits', name: 'Fruits', icon: '/assets/images/fruits.png', description: 'Tropical fruits, Other fruits' },
    { id: 'root-tuber', name: 'Root Crops', icon: '/assets/images/rootcrop.png', description: 'Cassava, Other roots' },
    { id: 'plantation', name: 'Plantation Crops', icon: '/assets/images/sugarcane.png', description: 'Sugarcane, Coffee' },
    { id: 'other', name: 'Other Crops', icon: '/assets/images/other.png', description: 'Other crops' }
  ]

  const farmSizes = [
    { id: 'small', label: '0.5 - 2 hectares', description: 'Small scale farming', fences: 1 },
    { id: 'medium', label: '2 - 10 hectares', description: 'Medium scale farming', fences: 2 },
    { id: 'large', label: '10 - 50 hectares', description: 'Large scale farming', fences: 3 },
    { id: 'commercial', label: '50+ hectares', description: 'Commercial scale farming', fences: 4 }
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
          <div className={styles.topBar}>
            <button className={styles.backButton} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <StepIndicator currentStep={currentStep + 1} totalSteps={4} variant="dots" />
            <img 
              src="/assets/images/AgrilinkLogo.png" 
              alt="AgriLink Logo" 
              className={styles.logo}
            />
          </div>
          
          <div className={styles.mainContent}>
            <div className={styles.leftSection}>
              <h1 className={styles.title}>
                {currentStep === 1 ? (
                  <>What <span style={{ color: '#2d5a27' }}>Crops</span><br />do you grow?</>
                ) : (
                  <>How big is<br />your <span style={{ color: '#2d5a27' }}>Farm</span>?</>
                )}
              </h1>
              
              {currentStep === 1 && (
                <p className={styles.subtitle}>
                  Select the crops you grow so we can connect you with relevant livestock owners and tailored opportunities.
                </p>
              )}
              
              {currentStep === 2 && (
                <p className={styles.subtitle}>
                  This helps us estimate your fertilizer needs and match you with appropriate livestock owners.
                </p>
              )}
            </div>
            
            <div className={styles.rightSection}>
              {currentStep === 1 && (
                <>
                  <div className={styles.optionsGrid}>
                    {cropTypes.map((crop) => (
                      <div
                        key={crop.id}
                        className={`${styles.optionCard} ${selectedCrops.includes(crop.id) ? styles.selected : ''}`}
                        onClick={() => handleCropSelect(crop.id)}
                      >
                        <div className={styles.optionIcon}>
                          <img 
                            src={crop.icon} 
                            alt={crop.name} 
                            className={styles.cropIcon} 
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.innerHTML = '<i class="fas fa-seedling" style="font-size: 2.5rem; color: #2d5a27;"></i>'
                            }}
                          />
                        </div>
                        <h3 className={styles.optionTitle}>{crop.name}</h3>
                        <p className={styles.optionDescription}>{crop.description}</p>
                        <div className={styles.selectIndicator}>
                          <i className="fas fa-check-circle"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Next
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className={styles.farmSizeGrid}>
                    {farmSizes.map((size) => (
                      <div
                        key={size.id}
                        className={`${styles.optionCard} ${styles.noIcon} ${selectedFarmSize === size.id ? styles.selected : ''}`}
                        onClick={() => handleFarmSizeSelect(size.id)}
                      >
                        <div className={styles.fenceContainer}>
                          {Array.from({ length: size.fences }).map((_, index) => (
                            <img 
                              key={index} 
                              src="/assets/images/fence.png" 
                              alt="Fence" 
                              className={styles.fenceIcon}
                            />
                          ))}
                        </div>
                        <h3 className={styles.optionTitle}>{size.label}</h3>
                        <p className={styles.optionDescription}>{size.description}</p>
                        <div className={styles.selectIndicator}>
                          <i className="fas fa-check-circle"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    {loading ? 'Saving...' : 'Done'}
                  </button>
                </>
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
