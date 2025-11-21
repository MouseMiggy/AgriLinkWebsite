import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../../styles/modules/signin.module.css'

export default function SignIn() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('home')
  
  // Signin form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)

  // Photo carousel data
  const photos = [
    {
      src: "https://images.unsplash.com/photo-1707235164180-85fa316ce0ab?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Sustainable Farming",
      description: "Transform organic waste into valuable fertilizer for healthier crops and sustainable agriculture practices."
    },
    {
      src: "https://images.unsplash.com/photo-1737960310641-650b8bf5ae87?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", 
      title: "Community Connection",
      description: "Connect with local farmers and build a network that supports sustainable agricultural practices."
    },
    {
      src: "https://plus.unsplash.com/premium_photo-1680125265832-ffaf364a8aca?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Waste Exchange",
      description: "Efficiently exchange livestock waste with crop farmers to create a circular economy in agriculture."
    },
    {
      src: "https://images.unsplash.com/photo-1524486361537-8ad15938e1a3?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Modern Agriculture",
      description: "Embrace modern farming techniques while maintaining environmental sustainability and community values."
    },
    {
      src: "https://images.unsplash.com/photo-1611801675859-fcace7a158cc?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Growing Together",
      description: "Join thousands of farmers across the Philippines in creating a more sustainable agricultural future."
    }
  ]

  const goToSignIn = () => {
    router.push('/signin')
  }

  const getStarted = () => {
    // Navigate to signup page
    router.push('/signup')
  }

  const goToOnboardingSection = (section) => {
    router.push(`/onboarding#${section}`)
  }

  // For testing - clear localStorage to always show onboarding
  const resetOnboarding = () => {
    localStorage.removeItem('agrilink_onboarding_completed')
    window.location.reload()
  }

  // Signin form handlers
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const showErrorToast = (message) => {
    setError(message)
    setShowToast(true)
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setShowToast(false)
    }, 5000)
  }

  const dismissToast = () => {
    setShowToast(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Import Firebase auth functions
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('../lib/firebase')
      
      // Sign in with Firebase (same as mobile app)
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Check user onboarding status and redirect appropriately
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('../lib/firebase')
      
      const userDocRef = doc(db, 'Users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        const onboarding = userData.onboarding || {}

        // Role not selected yet
        if (!userData.roleSelected) {
          router.push('/role-selection')
          return
        }

        const hasLocation = userData.locationPermissionGranted || userData.locationSkipped

        // Check per-role onboarding status for current role
        if (userData.role === 'livestock_owner' && !onboarding.livestockOnboardingCompleted) {
          if (!hasLocation) {
            router.push('/location-permission')
          } else {
            router.push('/livestock-onboarding')
          }
          return
        }

        if (userData.role === 'crop_farmer' && !onboarding.cropOnboardingCompleted) {
          if (!hasLocation) {
            router.push('/location-permission')
          } else {
            router.push('/crop-onboarding')
          }
          return
        }
      }

      // Redirect to dashboard after successful signin
      router.push('/dashboard')
    } catch (err) {
      console.error('Sign in error:', err)
      if (err.code === 'auth/user-not-found') {
        showErrorToast('No account found with this email address')
      } else if (err.code === 'auth/wrong-password') {
        showErrorToast('Invalid password')
      } else if (err.code === 'auth/invalid-email') {
        showErrorToast('Invalid email address')
      } else if (err.code === 'auth/user-disabled') {
        showErrorToast('This account has been disabled')
      } else {
        showErrorToast('Invalid email or password')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      // Import Firebase auth functions
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth')
      const { auth, db } = await import('../lib/firebase')
      const { doc, setDoc, getDoc } = await import('firebase/firestore')
      
      // Create Google provider
      const provider = new GoogleAuthProvider()
      
      // Sign in with Google popup
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if user exists in Firestore, if not create profile
      const userDocRef = doc(db, 'Users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        // Create user profile in Firestore for new Google users
        await setDoc(userDocRef, {
          firstName: user.displayName?.split(' ')[0] || 'User',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          createdAt: new Date(),
          photoURL: user.photoURL || null,
          verified: true
        })
        
        // New Google user - redirect to role selection
        router.push('/role-selection')
        return
      } else {
        // Existing user - check onboarding status
        const userData = userDoc.data()
        const onboarding = userData.onboarding || {}

        if (!userData.roleSelected) {
          router.push('/role-selection')
          return
        }

        const hasLocation = userData.locationPermissionGranted || userData.locationSkipped

        if (userData.role === 'livestock_owner' && !onboarding.livestockOnboardingCompleted) {
          if (!hasLocation) {
            router.push('/location-permission')
          } else {
            router.push('/livestock-onboarding')
          }
          return
        }

        if (userData.role === 'crop_farmer' && !onboarding.cropOnboardingCompleted) {
          if (!hasLocation) {
            router.push('/location-permission')
          } else {
            router.push('/crop-onboarding')
          }
          return
        }
      }

      // Redirect to dashboard after successful signin
      router.push('/dashboard')
    } catch (err) {
      console.error('Google sign in error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        showErrorToast('Sign in was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        showErrorToast('Popup was blocked by browser')
      } else {
        showErrorToast('Failed to sign in with Google')
      }
    } finally {
      setLoading(false)
    }
  }

  // Modal handlers
  const closeSignupModal = () => {
    setShowSignupModal(false)
  }

  const goToSignUpFromModal = () => {
    setShowSignupModal(false)
    router.push('/signup')
  }

  // Photo carousel handlers
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const goToPhoto = (index) => {
    setCurrentPhotoIndex(index)
  }

  // Touch handlers for swipe functionality
  const handleTouchStart = (e) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      nextPhoto()
    } else if (isRightSwipe) {
      prevPhoto()
    }
  }

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(nextPhoto, 5000) // Change photo every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navHeight = 30 // Fixed navigation bar height
      const elementPosition = element.offsetTop
      const offsetPosition = elementPosition - navHeight - 20 // Add 20px padding for better visibility
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      
      // Update active section after scroll
      setTimeout(() => {
        setActiveSection(sectionId)
      }, 500)
    }
  }

  useEffect(() => {
    // Hide scrollbar globally while keeping scroll functionality
    const originalStyle = window.getComputedStyle(document.body).overflow
    const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow
    
    // Create and inject global styles to hide scrollbar
    const style = document.createElement('style')
    style.id = 'hide-scrollbar-style'
    style.textContent = `
      html, body {
        -ms-overflow-style: none !important;  /* IE and Edge */
        scrollbar-width: none !important;  /* Firefox */
        overflow-x: hidden !important;
      }
      
      html::-webkit-scrollbar, 
      body::-webkit-scrollbar {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    const updateActiveNav = () => {
      const sections = document.querySelectorAll('section, header')
      let current = ''
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop
        const sectionHeight = section.clientHeight
        if (window.pageYOffset >= (sectionTop - 200)) {
          current = section.getAttribute('id')
        }
      })
      
      setActiveSection(current)
    }

    window.addEventListener('scroll', updateActiveNav)
    window.addEventListener('load', updateActiveNav)
    
    return () => {
      // Cleanup: remove injected styles and restore original overflow
      const injectedStyle = document.getElementById('hide-scrollbar-style')
      if (injectedStyle) {
        document.head.removeChild(injectedStyle)
      }
      
      window.removeEventListener('scroll', updateActiveNav)
      window.removeEventListener('load', updateActiveNav)
    }
  }, [])

  return (
    <div className={styles.onboardingWrapper}>
      <Head>
        <title>AgriLink PH | Livestock Waste Exchange Platform</title>
        <meta name="description" content="Connect livestock farmers with crop farmers to exchange organic waste materials in the Philippines. AgriLink helps turn waste into valuable fertilizer." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>

      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <a href="/onboarding" className={styles.logo} onClick={(e) => { e.preventDefault(); router.push('/onboarding') }}>
            <img src="/assets/images/AgrilinkLogo.png" alt="AgriLink Logo" />
          </a>
          <ul className={styles.navLinks}>
            <li><a href="/onboarding" onClick={(e) => { e.preventDefault(); router.push('/onboarding') }}>Home</a></li>
            <li><a href="/onboarding#how-it-works" onClick={(e) => { e.preventDefault(); goToOnboardingSection('how-it-works') }}>How it works</a></li>
            <li><a href="/onboarding#benefits" onClick={(e) => { e.preventDefault(); goToOnboardingSection('benefits') }}>Benefits</a></li>
            <li><a href="/onboarding#suggestion-list" onClick={(e) => { e.preventDefault(); goToOnboardingSection('suggestion-list') }}>Listings</a></li>
          </ul>
          <div className={styles.navButtons}>
            <button className={styles.signinBtn} onClick={goToSignIn}>Sign In</button>
            <button className={styles.signupBtn} onClick={getStarted}>Sign Up</button>
          </div>
        </div>
      </nav>
      
      <div className={styles.container}>
        <div className={styles.backgroundPattern}></div>
        
        {/* Left Side - Photo Carousel */}
        <div className={styles.leftSide}>
          <div className={styles.carouselContainer}>
            <div 
              className={styles.carousel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className={`${styles.carouselSlide} ${
                    index === currentPhotoIndex ? styles.active : ''
                  }`}
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className={styles.carouselImage}
                  />
                  <div className={styles.carouselOverlay}>
                    <div className={styles.carouselContent}>
                      <h3 className={styles.carouselTitle}>{photo.title}</h3>
                      <p className={styles.carouselDescription}>{photo.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Navigation Arrows */}
              <button className={styles.carouselArrow} onClick={prevPhoto}>
                <i className="fas fa-chevron-left"></i>
              </button>
              <button className={`${styles.carouselArrow} ${styles.next}`} onClick={nextPhoto}>
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
            
            {/* Dots Indicator */}
            <div className={styles.carouselDots}>
              {photos.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.carouselDot} ${
                    index === currentPhotoIndex ? styles.active : ''
                  }`}
                  onClick={() => goToPhoto(index)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className={styles.rightSide}>
          <div className={styles.formContent}>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.passwordInput}
                    placeholder="Enter your password"
                    required
                  />
                  <i 
                    className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'} ${styles.eyeIcon}`}
                    onClick={togglePasswordVisibility}
                  ></i>
                </div>
              </div>

              <div className={styles.formOptions}>
                <label className={styles.checkboxWrapper}>
                  <input type="checkbox" className={styles.checkbox} />
                  <span className={styles.checkboxLabel}>Remember me</span>
                </label>
                <a href="#" className={styles.forgotLink}>Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className={styles.primaryButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Signing In...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className={styles.divider}>
              <span className={styles.dividerText}>or continue with</span>
            </div>

            <button 
              type="button"
              className={styles.googleButton}
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <img src="../assets/images/Google.png" alt="Google" className={styles.googleIcon} />
            </button>

            <div className={styles.signupPrompt}>
              <span>Don't have an account? </span>
              <button 
                type="button"
                className={styles.signupLink}
                onClick={() => router.push('/signup')}
              >
                Create Account
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {error && (
        <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
          <i className={`fas fa-exclamation-circle ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{error}</span>
          <button className={styles.toastClose} onClick={dismissToast}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Email Not Registered Modal */}
      <div className={`${styles.modalOverlay} ${showSignupModal ? styles.show : ''}`}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalIcon}>
              <i className="fas fa-user-plus"></i>
            </div>
            <h3 className={styles.modalTitle}>Email Not Registered</h3>
          </div>
          <p className={styles.modalMessage}>
            This email address is not registered yet. Would you like to create an account?
          </p>
          <div className={styles.modalActions}>
            <button 
              className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              onClick={closeSignupModal}
            >
              Cancel
            </button>
            <button 
              className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              onClick={goToSignUpFromModal}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
      
    </div>
  )
}
