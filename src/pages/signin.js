import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../../styles/modules/signin.module.css'
import { validateEmailOrPhone, formatPhoneForLookup } from '../utils/authValidation'

export default function SignIn() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('home')
  
  // Signin form state
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showSignupModal, setShowSignupModal] = useState(false)
  const [inputType, setInputType] = useState(null)
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
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Validate email/phone input and update type
    if (name === 'emailOrPhone') {
      const validation = validateEmailOrPhone(value)
      setInputType(validation.type)
    }
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

    // Validation
    if (!formData.emailOrPhone.trim() || !formData.password.trim()) {
      showErrorToast('Please enter email/phone and password.')
      setLoading(false)
      return
    }

    // Validate email or phone format
    const validation = validateEmailOrPhone(formData.emailOrPhone)
    if (!validation.isValid) {
      showErrorToast(validation.error)
      setLoading(false)
      return
    }

    try {
      console.log('🚀 Starting secure login process for:', formData.emailOrPhone)
      
      // Format phone number to +63 format if it's a phone number (matching mobile app)
      let formattedIdentifier = formData.emailOrPhone
      if (validation.type === 'phone') {
        formattedIdentifier = formatPhoneForLookup(formData.emailOrPhone)
        console.log('📱 Formatted phone for login:', formattedIdentifier)
      }
      
      // Step 1: Validate password against stored hash (same as mobile app)
      let response;
      try {
        response = await fetch('https://api-tykddqtfpa-uc.a.run.app/validate-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailOrPhone: formattedIdentifier,
            password: formData.password
          }),
        });
      } catch (fetchError) {
        console.error('❌ Network error during password validation:', fetchError);
        setLoading(false);
        showErrorToast('Unable to connect to the server. Please check your internet connection and try again.');
        return;
      }

      if (!response.ok) {
        console.log('⚠️ Password validation response not OK:', response.status);
        setLoading(false);
        
        // Handle different HTTP status codes appropriately
        let errorMessage = 'An error occurred during login. Please try again.';
        
        if (response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your email/phone and password.';
        } else if (response.status === 404) {
          errorMessage = 'No account found with this email or phone number. Please check your credentials or register a new account.';
        } else if (response.status >= 500) {
          errorMessage = 'The server is temporarily unavailable. Please try again in a few moments.';
        } else if (response.status === 429) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else {
          errorMessage = 'Unable to complete login. Please try again.';
        }
        
        showErrorToast(errorMessage);
        return;
      }

      // Parse JSON response - only if response is OK
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.log('⚠️ Failed to parse JSON response:', jsonError);
        setLoading(false);
        showErrorToast('Invalid response from server. Please try again.');
        return;
      }

      if (!result.success) {
        console.log('❌ Password validation failed:', result.error);
        setLoading(false);
        showErrorToast('Invalid credentials. Please check your email/phone and password.');
        return;
      }

      console.log('✅ Password validation successful for user:', result.user.uid);
      
      // Step 2: Sign in with Firebase Auth using the validated user's email
      let userCredential;
      const userData = result.user;
      
      // Determine Firebase Auth email based on registration method
      let firebaseEmail;
      if (userData.registrationMethod === 'email' && userData.email && !userData.email.includes('@temp.agrilink.com')) {
        firebaseEmail = userData.email;
      } else if (userData.registrationMethod === 'phone') {
        // For phone users, use the stored Firebase Auth email
        firebaseEmail = userData.firebaseEmail || userData.email;
      } else {
        firebaseEmail = userData.firebaseEmail || userData.email || `${userData.uid}@temp.agrilink.com`;
      }

      console.log('🔐 Attempting Firebase Auth with email:', firebaseEmail);
      
      try {
        // Import Firebase auth functions
        const { signInWithEmailAndPassword } = await import('firebase/auth')
        const { auth } = await import('../lib/firebase')
        
        userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, formData.password);
        console.log('✅ Firebase Auth successful');
      } catch (authError) {
        console.log('❌ Firebase Auth failed:', authError.code);
        
        // If Firebase Auth fails but password validation succeeded, 
        // create Firebase Auth account and use custom token for authentication
        try {
          console.log('🔧 Creating Firebase Auth account for user...');
          const createResponse = await fetch('https://api-tykddqtfpa-uc.a.run.app/create-firebase-auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userData.uid,
              email: firebaseEmail,
              password: formData.password,
              displayName: userData.displayName
            }),
          });
          
          const createResult = await createResponse.json();
          
          if (createResult.success) {
            console.log('✅ Firebase Auth account created, attempting custom token authentication...');
            
            // Try custom token authentication first
            try {
              const tokenResponse = await fetch('https://api-tykddqtfpa-uc.a.run.app/create-custom-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  uid: userData.uid
                }),
              });
              
              const tokenResult = await tokenResponse.json();
              
              if (tokenResult.success && tokenResult.customToken) {
                // Import Firebase auth functions
                const { signInWithCustomToken } = await import('firebase/auth')
                const { auth } = await import('../lib/firebase')
                
                // Sign in with custom token
                userCredential = await signInWithCustomToken(auth, tokenResult.customToken);
                console.log('✅ Login successful with custom token');
              } else {
                console.log('⚠️ Custom token failed, trying direct Firebase Auth...');
                throw new Error(`Custom token generation failed: ${tokenResult.error}`);
              }
            } catch (tokenError) {
              console.log('⚠️ Custom token authentication failed, attempting direct Firebase Auth...');
              console.log('Token error details:', tokenError.message);
              
              // Fallback: Try direct Firebase Auth with a temporary password
              try {
                // Generate a temporary password for this session
                const tempPassword = `temp_${userData.uid}_${Date.now()}`;
                
                // Update Firebase Auth user with temporary password
                const updateResponse = await fetch('https://api-tykddqtfpa-uc.a.run.app/update-firebase-password', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    uid: userData.uid,
                    tempPassword: tempPassword
                  }),
                });
                
                const updateResult = await updateResponse.json();
                
                if (updateResult.success) {
                  // Import Firebase auth functions
                  const { signInWithEmailAndPassword } = await import('firebase/auth')
                  const { auth } = await import('../lib/firebase')
                  
                  // Try to sign in with temporary password
                  userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, tempPassword);
                  console.log('✅ Login successful with temporary password fallback');
                } else {
                  throw new Error('Failed to update Firebase Auth password');
                }
              } catch (fallbackError) {
                console.error('❌ All authentication methods failed:', fallbackError);
                throw new Error('Unable to complete login. Please try again or contact support if the problem persists.');
              }
            }
          } else {
            throw new Error(`Failed to create Firebase Auth account: ${createResult.error}`);
          }
        } catch (createError) {
          console.error('❌ Authentication process failed:', createError);
          console.log('🔄 Attempting offline authentication fallback...');
          
          // Fallback: Try direct Firebase Auth with email/password for existing users
          try {
            console.log('🔧 Attempting direct Firebase Auth as fallback...');
            const { signInWithEmailAndPassword } = await import('firebase/auth')
            const { auth } = await import('../lib/firebase')
            
            userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, formData.password);
            console.log('✅ Fallback Firebase Auth successful');
          } catch (fallbackAuthError) {
            console.log('❌ Fallback Firebase Auth also failed:', fallbackAuthError.code);
            
            // Final fallback: Create Firebase Auth account directly (for new users)
            try {
              console.log('🔧 Creating Firebase Auth account directly as final fallback...');
              const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth')
              const { auth } = await import('../lib/firebase')
              
              userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, formData.password);
              console.log('✅ Direct Firebase Auth account creation successful');
              
              // Update the user's display name
              if (userData.displayName) {
                await updateProfile(userCredential.user, {
                  displayName: userData.displayName
                });
              }
            } catch (finalError) {
              console.error('❌ All authentication methods failed:', finalError);
              
              // Provide user-friendly error message
              let errorMessage = 'Authentication error. Please try again.';
              if (createError.message.includes('Custom token')) {
                errorMessage = 'Authentication service is temporarily unavailable. Please try again in a few moments.';
              } else if (createError.message.includes('Firebase Auth')) {
                errorMessage = 'Account setup failed. Please contact support if this persists.';
              } else if (finalError.code === 'auth/network-request-failed') {
                errorMessage = 'Network connection error. Please check your internet connection and try again.';
              } else if (finalError.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered. Please try logging in instead.';
              }
              
              setLoading(false);
              showErrorToast(errorMessage);
              return;
            }
          }
        }
      }

      // Step 3: Store user data and complete login
      console.log('✅ Login successful! User authenticated:', userData.uid);
      
      // Check user onboarding status and redirect appropriately
      const { doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('../lib/firebase')
      
      const userDocRef = doc(db, 'Users', userData.uid)
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
      console.error('❌ Login error:', err)
      setLoading(false)
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'An error occurred during login. Please try again.'
      
      if (err.message && err.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.'
      } else if (err.message && err.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network connection error. Please check your internet connection and try again.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      showErrorToast(errorMessage)
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
                <label htmlFor="emailOrPhone" className={styles.label}>
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  id="emailOrPhone"
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder={inputType ? 
                    (inputType === 'email' ? 'Enter your email address' : 'Enter your phone number (09 format)') : 
                    'Enter your email or phone number'}
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
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push('/forgot-password')
                  }} 
                  className={styles.forgotLink}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
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
