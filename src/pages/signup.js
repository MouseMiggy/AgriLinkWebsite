import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../../styles/modules/signup.module.css'

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [isEmailExistsError, setIsEmailExistsError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const router = useRouter()

  // Photo carousel data
  const photos = [
    {
      src: "https://images.unsplash.com/photo-1734261780213-765e29537e1f?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Join Our Community",
      description: "Become part of a thriving network of farmers dedicated to sustainable agriculture and resource sharing."
    },
    {
      src: "https://images.unsplash.com/photo-1590682680695-43b964a3ae17?q=80&w=1000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", 
      title: "Start Your Journey",
      description: "Begin your agricultural transformation journey with access to innovative farming solutions and partnerships."
    },
    {
      src: "https://images.unsplash.com/photo-1649426710526-861371557a47?q=80&w=1270&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Build Connections",
      description: "Create meaningful partnerships with fellow farmers and expand your agricultural network across the Philippines."
    },
    {
      src: "https://images.unsplash.com/photo-1746106434965-da8cdec51da6?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Unlock Opportunities",
      description: "Discover new opportunities for growth, collaboration, and sustainable farming practices in your area."
    },
    {
      src: "https://images.unsplash.com/photo-1710563849800-73af5bfc9f36?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      title: "Create Your Account",
      description: "Take the first step towards a more sustainable and profitable farming future by joining AgriLink today."
    }
  ]

  const goToOnboardingSection = (section) => {
    router.push(`/onboarding#${section}`)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const showErrorToast = (message, isEmailExists = false) => {
    setError(message)
    setIsEmailExistsError(isEmailExists)
    setShowToast(true)
    // Auto dismiss after 8 seconds for email exists error, 5 seconds for others
    setTimeout(() => {
      setShowToast(false)
      setIsEmailExistsError(false)
    }, isEmailExists ? 8000 : 5000)
  }

  const dismissToast = () => {
    setShowToast(false)
    setIsEmailExistsError(false)
  }

  const goToSignIn = () => {
    dismissToast()
    router.push('/signin')
  }

  const showEmailExistsModal = () => {
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const goToSignInFromModal = () => {
    setShowModal(false)
    router.push('/signin')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
      showErrorToast('Please fill all fields')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      showErrorToast('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      showErrorToast('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (!agreedToTerms) {
      showErrorToast('Please agree to the Terms and Conditions')
      setLoading(false)
      return
    }

    try {
      // Send registration data to backend (same as mobile app)
      console.log('Attempting to register user:', formData.email)
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      console.log('Server response:', data)

      if (!data.success) {
        const errorMessage = data.error || 'Failed to send verification code'
        // Check if it's specifically an email already exists error
        if (errorMessage.toLowerCase().includes('already') || 
            errorMessage.toLowerCase().includes('exists') || 
            errorMessage.toLowerCase().includes('taken') ||
            errorMessage.toLowerCase().includes('duplicate') ||
            errorMessage.toLowerCase().includes('registered') ||
            errorMessage.toLowerCase().includes('in use') ||
            errorMessage.toLowerCase().includes('conflict') ||
            errorMessage.toLowerCase().includes('email address is already in use') ||
            errorMessage.toLowerCase().includes('email-already-in-use') ||
            errorMessage.toLowerCase().includes('auth/email-already-in-use')) {
          showEmailExistsModal()
        } else {
          showErrorToast(errorMessage)
        }
        return
      }

      // Navigate to code verification page
      router.push({
        pathname: '/verify-code',
        query: { email: formData.email }
      })
    } catch (err) {
      console.error('Registration error:', err)
      const errorMessage = err.message || err.toString()
      
      // Check for email already in use errors first
      if (errorMessage.toLowerCase().includes('email address is already in use') ||
          errorMessage.toLowerCase().includes('email-already-in-use') ||
          errorMessage.toLowerCase().includes('auth/email-already-in-use') ||
          errorMessage.toLowerCase().includes('already') ||
          errorMessage.toLowerCase().includes('exists') ||
          errorMessage.toLowerCase().includes('in use')) {
        showEmailExistsModal()
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        showErrorToast('Unable to connect to server. Please check if the backend server is running.')
      } else if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
        // HTTP 409 Conflict usually indicates email already exists
        showEmailExistsModal()
      } else if (errorMessage.includes('400') && errorMessage.toLowerCase().includes('email')) {
        // HTTP 400 with email-related error might be duplicate email
        showEmailExistsModal()
      } else if (errorMessage.includes('500')) {
        showErrorToast('Server error. Please try again later.')
      } else if (errorMessage.includes('404')) {
        showErrorToast('Registration endpoint not found. Please check server configuration.')
      } else if (errorMessage.includes('status:')) {
        showErrorToast(`Server error: ${errorMessage}`)
      } else {
        showErrorToast('Registration failed. Please try again or contact support.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up | AgriLink PH</title>
        <meta name="description" content="Join AgriLink - Connect livestock farmers with crop farmers across the Philippines" />
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
            <button className={styles.signinBtn} onClick={() => router.push('/signin')}>Sign In</button>
            <button className={styles.signupBtn}>Sign Up</button>
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

        {/* Right Side - Sign Up Form */}
        <div className={styles.rightSide}>
          <div className={styles.formContent}>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="firstName" className={styles.label}>
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="lastName" className={styles.label}>
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter your last name"
                  required
                />
              </div>

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

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirm Password
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={styles.passwordInput}
                    placeholder="Confirm your password"
                    required
                  />
                  <i 
                    className={`fas ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'} ${styles.eyeIcon}`}
                    onClick={toggleConfirmPasswordVisibility}
                  ></i>
                </div>
              </div>

              <div className={styles.formOptions}>
                <label className={styles.checkboxWrapper}>
                  <input 
                    type="checkbox" 
                    className={styles.checkbox}
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                  />
                  <span className={styles.checkboxLabel}>
                    I agree to the <a href="#" className={styles.termsLink}>Terms and Conditions</a>
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                className={styles.primaryButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {error && (
        <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
          <i className={`fas fa-exclamation-circle ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{error}</span>
          {isEmailExistsError && (
            <button className={styles.toastButton} onClick={goToSignIn}>
              Sign In Instead
            </button>
          )}
          <button className={styles.toastClose} onClick={dismissToast}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Email Exists Modal */}
      <div className={`${styles.modalOverlay} ${showModal ? styles.show : ''}`}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <div className={styles.modalIcon}>
              <i className="fas fa-user-check"></i>
            </div>
            <h3 className={styles.modalTitle}>Email Already Registered</h3>
          </div>
          <p className={styles.modalMessage}>
            This email address is already registered with an existing account. 
            Would you like to sign in instead?
          </p>
          <div className={styles.modalActions}>
            <button 
              className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button 
              className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              onClick={goToSignInFromModal}
            >
              Sign In Instead
            </button>
          </div>
        </div>
      </div>
      
    </>
  )
}
