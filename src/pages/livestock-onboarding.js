import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import StepIndicator from '../components/StepIndicator'
import styles from '../../styles/modules/livestock-onboarding.module.css'

export default function LivestockOnboarding() {
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Livestock selection, Step 2: Specific animals
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [selectedAnimals, setSelectedAnimals] = useState([])
  const [selectedSpecificAnimals, setSelectedSpecificAnimals] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const animalTypes = [
    { id: 'cattle', name: 'Cattle', icon: '/assets/images/cattle.png', description: 'Cattle and dairy cows' },
    { id: 'poultry', name: 'Poultry', icon: '/assets/images/chicken.png', description: 'Chickens, ducks, and other birds' },
    { id: 'swine', name: 'Swine', icon: '/assets/images/swine.png', description: 'Pigs and hogs' },
    { id: 'goat', name: 'Goat', icon: '/assets/images/goat.png', description: 'Goats for milk and meat' },
    { id: 'sheep', name: 'Sheep', icon: '/assets/images/sheep.png', description: 'Sheep for wool and meat' },
    { id: 'rabbit', name: 'Rabbit', icon: '/assets/images/rabbit.png', description: 'Rabbits for meat' },
    { id: 'others', name: 'Others', icon: '/assets/images/livestock.png', description: 'Other livestock animals' }
  ]

  const specificAnimals = {
    cattle: [
      { id: 'cow', name: 'Cow', tagalog: 'Baka' },
      { id: 'dairy-cow', name: 'Dairy cow', tagalog: 'Baka pang-gatas' },
      { id: 'beef-cow', name: 'Beef cow', tagalog: 'Baka pang-karne' }
    ],
    poultry: [
      { id: 'chicken', name: 'Chicken', tagalog: 'Manok' },
      { id: 'layer-chicken', name: 'Layer chicken', tagalog: 'Manok pang-itlog' },
      { id: 'broiler-chicken', name: 'Broiler chicken', tagalog: 'Manok pang-karne' },
      { id: 'duck', name: 'Duck', tagalog: 'Pato' },
      { id: 'muscovy-duck', name: 'Muscovy duck', tagalog: 'Pato Muscovy' },
      { id: 'turkey', name: 'Turkey', tagalog: 'Pabo' },
      { id: 'quail', name: 'Quail', tagalog: 'Pugo' },
      { id: 'goose', name: 'Goose', tagalog: 'Gansa' }
    ],
    swine: [
      { id: 'pig', name: 'Pig', tagalog: 'Baboy' },
      { id: 'native-pig', name: 'Native pig', tagalog: 'Baboy katutubo' },
      { id: 'crossbred-pig', name: 'Crossbred pig', tagalog: 'Baboy halong lahi' }
    ],
    goat: [
      { id: 'goat', name: 'Goat', tagalog: 'Kambing' },
      { id: 'native-goat', name: 'Native goat', tagalog: 'Kambing katutubo' },
      { id: 'boer-goat', name: 'Boer goat', tagalog: 'Kambing Boer' }
    ],
    sheep: [
      { id: 'sheep', name: 'Sheep', tagalog: 'Tupa' },
      { id: 'native-sheep', name: 'Native sheep', tagalog: 'Tupa katutubo' }
    ],
    rabbit: [
      { id: 'rabbit', name: 'Rabbit', tagalog: 'Kuneho' },
      { id: 'native-rabbit', name: 'Native rabbit', tagalog: 'Kuneho katutubo' }
    ],
    others: [
      { id: 'carabao', name: 'Carabao', tagalog: 'Kalabaw' },
      { id: 'horse', name: 'Horse', tagalog: 'Kabayo' },
      { id: 'donkey', name: 'Donkey', tagalog: 'Asno' },
      { id: 'bee', name: 'Bee', tagalog: 'Bubuyog / Maya' },
      { id: 'silkworm', name: 'Silkworm', tagalog: 'Uod ng Seda' },
      { id: 'ostrich', name: 'Ostrich', tagalog: 'Ostris' },
      { id: 'camel', name: 'Camel', tagalog: 'Kamelyo' }
    ]
  }


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
    // Clear specific animals when changing animal types
    setSelectedSpecificAnimals([])
  }

  const handleSpecificAnimalSelect = (animalId) => {
    setSelectedSpecificAnimals(prev => {
      if (prev.includes(animalId)) {
        return prev.filter(id => id !== animalId)
      } else {
        return [...prev, animalId]
      }
    })
  }


  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedAnimals.length === 0) {
        showErrorToast('Please select at least one type of livestock animal')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (selectedSpecificAnimals.length === 0) {
        showErrorToast('Please select at least one specific animal')
        return
      }
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      router.push('/location-permission')
    } else {
      setCurrentStep(currentStep - 1)
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
          animals: selectedAnimals,
          specificAnimals: selectedSpecificAnimals
        },
        'onboarding.livestockTypes': selectedAnimals,
        'onboarding.livestockTypesCompleted': true,
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

  // Filter animals based on search query
  const filteredAnimals = animalTypes.filter(animal =>
    animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get all specific animals for selected animal types
  const getAllSpecificAnimals = () => {
    let allSpecific = []
    selectedAnimals.forEach(animalType => {
      if (specificAnimals[animalType]) {
        allSpecific = [...allSpecific, ...specificAnimals[animalType]]
      }
    })
    return allSpecific
  }

  // Filter specific animals based on search query
  const filteredSpecificAnimals = getAllSpecificAnimals().filter(animal =>
    animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

      <div className={`${styles.container} ${currentStep === 2 ? styles.step2Container : ''}`}>
        <div className={styles.backgroundPattern}></div>
        
        <div className={styles.content}>
          <div className={styles.topBar}>
            <button className={styles.backButton} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <StepIndicator currentStep={currentStep + 1} totalSteps={2} variant="dots" />
            <img 
              src="/assets/images/AgrilinkLogo.png" 
              alt="AgriLink Logo" 
              className={styles.logo}
            />
          </div>
          
          <div className={styles.mainContent}>
            {/* Step 1: Livestock Type Selection */}
            {currentStep === 1 && (
              <>
                <div className={styles.leftSection}>
                  <h1 className={styles.title}>
                    What <span style={{ color: '#2d5a27' }}>Livestock</span><br />animals do you<br />raise?
                  </h1>
                  
                  <p className={styles.subtitle}>
                    Select the livestock animals you raise so we can connect you with relevant farmers and tailored opportunities.
                  </p>
                </div>
                
                <div className={styles.rightSection}>
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
                      </div>
                    ))}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Specific Animal Selection */}
            {currentStep === 2 && (
              <div className={styles.step2Content}>
                <div className={styles.topSection}>
                  <div className={styles.titleRow}>
                    <h1 className={styles.title}>
                      Select <span style={{ color: '#2d5a27' }}>Specific Animals</span>
                    </h1>
                    <div className={styles.searchContainer}>
                      <div className={styles.searchBox}>
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <p className={styles.subtitle}>
                    Choose the specific types of animals you raise from your selected categories.
                  </p>
                </div>
                
                <div className={styles.bottomSection}>
                  <div className={styles.scrollableContainer}>
                    {/* Render animals by categories */}
                    {selectedAnimals.map(animalType => {
                      const animal = animalTypes.find(a => a.id === animalType)
                      const filteredAnimals = specificAnimals[animalType]?.filter((specificAnimal) =>
                        specificAnimal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        specificAnimal.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
                      ) || []
                      
                      if (filteredAnimals.length === 0 && searchQuery) return null
                      
                      return (
                        <div key={animalType} className={styles.categorySection}>
                          <h4 className={styles.categoryTitle}>{animal.name}</h4>
                          <div className={styles.specificOptionsGrid}>
                            {filteredAnimals.map((specificAnimal) => (
                              <div
                                key={specificAnimal.id}
                                className={`${styles.optionCard} ${styles.specificCard} ${selectedSpecificAnimals.includes(specificAnimal.id) ? styles.selected : ''}`}
                                onClick={() => handleSpecificAnimalSelect(specificAnimal.id)}
                              >
                                <h4 className={styles.optionTitle}>{specificAnimal.name}</h4>
                                <p className={styles.optionTagalog}>{specificAnimal.tagalog}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Done
                  </button>
                </div>
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
