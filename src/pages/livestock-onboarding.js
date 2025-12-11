import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import StepIndicator from '../components/StepIndicator'
import styles from '../../styles/modules/livestock-onboarding.module.css'

export default function LivestockOnboarding() {
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Livestock selection
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [selectedAnimals, setSelectedAnimals] = useState([])
  const [selectedWasteRange, setSelectedWasteRange] = useState('')
  const router = useRouter()

  const animalTypes = [
    { id: 'cattle', name: 'Cattle', icon: '/assets/images/cattle.png', description: 'Dairy cows, Beef cattle, Buffalo' },
    { id: 'poultry', name: 'Poultry', icon: '/assets/images/chicken.png', description: 'Chickens, Ducks, Turkeys, Quails' },
    { id: 'swine', name: 'Swine', icon: '/assets/images/swine.png', description: 'Pigs, Hogs' },
    { id: 'goats', name: 'Goats', icon: '/assets/images/goat.png', description: 'Dairy goats, Meat goats' },
    { id: 'sheep', name: 'Sheep', icon: '/assets/images/sheep.png', description: 'Meat sheep, Wool sheep' },
    { id: 'rabbits', name: 'Rabbits', icon: '/assets/images/rabbit.png', description: 'Meat rabbits, Backyard rabbits' },
    { id: 'others', name: 'Others', icon: '/assets/images/livestock.png', description: 'Horses, Carabaos, Aquaculture' }
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
                  <>What <span style={{ color: '#2d5a27' }}>Livestock</span><br />animals do you<br />raise?</>
                ) : (
                  <>How much <span style={{ color: '#2d5a27' }}>waste</span> does your <br />Livestock animals<br />produce daily?</>
                )}
              </h1>
              
              {currentStep === 1 && (
                <p className={styles.subtitle}>
                  Select the livestock animals you raise so we can connect you with relevant farmers and tailored opportunities.
                </p>
              )}
              
              {currentStep === 2 && (
                <p className={styles.subtitle}>
                  Tell us about your daily waste production to find the best recycling and exchange opportunities.
                </p>
              )}
            </div>
            
            <div className={styles.rightSection}>
              {currentStep === 1 && (
                <>
                  <div className={styles.optionsGrid}>
                    {animalTypes.map((animal) => (
                      <div
                        key={animal.id}
                        className={`${styles.optionCard} ${selectedAnimals.includes(animal.id) ? styles.selected : ''}`}
                        onClick={() => handleAnimalSelect(animal.id)}
                      >
                        <div className={styles.optionIcon}>
                          <img 
                            src={animal.icon} 
                            alt={animal.name} 
                            className={`${styles.animalIcon} ${animal.id === 'goats' || animal.id === 'sheep' ? styles.flipHorizontal : ''}`} 
                          />
                        </div>
                        <h3 className={styles.optionTitle}>{animal.name}</h3>
                        <p className={styles.optionDescription}>{animal.description}</p>
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
                  <div className={styles.optionsGrid}>
                    {wasteRanges.map((range) => (
                      <div
                        key={range.id}
                        className={`${styles.optionCard} ${styles.noIcon} ${selectedWasteRange === range.id ? styles.selected : ''}`}
                        onClick={() => handleWasteRangeSelect(range.id)}
                      >
                        <h3 className={styles.optionTitle}>{range.label}</h3>
                        <p className={styles.optionDescription}>{range.description}</p>
                        <div className={styles.selectIndicator}>
                          <i className="fas fa-check-circle"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Done
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
