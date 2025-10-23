import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import styles from '../styles/verify-code.module.css'

export default function VerifyCode() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const router = useRouter()
  const { email } = router.query
  const inputRefs = useRef([])

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const showErrorToast = (message) => {
    setError(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 5000)
  }

  const showSuccessMessage = (message) => {
    setSuccess(message)
    setShowSuccessToast(true)
    setTimeout(() => {
      setShowSuccessToast(false)
      router.push('/signin')
    }, 3000)
  }

  const showResendSuccess = (message) => {
    setSuccess(message)
    setShowSuccessToast(true)
    setTimeout(() => {
      setShowSuccessToast(false)
    }, 3000)
  }

  const dismissToast = () => {
    setShowToast(false)
    setShowSuccessToast(false)
  }

  const handleInputChange = (index, value) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleSubmit(newCode.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return
    
    const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
    setCode(newCode.slice(0, 6))
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newCode.findIndex(digit => digit === '')
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()
  }

  const handleSubmit = async (codeString = null) => {
    const verificationCode = codeString || code.join('')
    
    if (verificationCode.length !== 6) {
      showErrorToast('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)
    setError('')
    setIsAnimating(true)

    try {
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode }),
      })

      const data = await response.json()

      if (data.success) {
        // Check if backend returned user data for Firebase creation
        if (data.userData && data.userData.firstName && data.userData.lastName && data.userData.password) {
          try {
            const { firstName, lastName, password } = data.userData
            
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Update user profile
            await updateProfile(user, {
              displayName: `${firstName} ${lastName}`
            })

            // Save user data to Firestore Users collection (same structure as mobile app)
            await setDoc(doc(db, 'Users', user.uid), {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              displayName: `${firstName.trim()} ${lastName.trim()}`,
              verified: true,
              createdAt: serverTimestamp(),
              photoURL: null
            })

            // Success - show toast and redirect to signin
            showSuccessMessage('Account verified successfully! Redirecting to sign in...')
          } catch (firebaseError) {
            console.error('Firebase user creation error:', firebaseError)
            showErrorToast('Failed to create account. Please try again.')
          }
        } else {
          // Backend verification successful but no user data
          showSuccessMessage('Verification successful! Redirecting to sign in...')
        }
      } else {
        showErrorToast(data.error || 'Invalid verification code')
      }
    } catch (err) {
      console.error('Verification error:', err)
      showErrorToast('Network error. Please try again.')
    } finally {
      setLoading(false)
      setIsAnimating(false)
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleSubmit()
  }

  const handleResend = async () => {
    if (cooldown > 0) return

    setResending(true)
    setError('')

    try {
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setCooldown(59)
        setError('')
        showResendSuccess('Verification code resent successfully!')
      } else {
        showErrorToast(data.error || 'Failed to resend code')
      }
    } catch (err) {
      showErrorToast('Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleBack = () => {
    router.push('/signup')
  }

  if (!email) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2>Invalid Verification Link</h2>
            <p>Please try registering again or contact support if the problem persists.</p>
            <button 
              className={styles.primaryButton}
              onClick={() => router.push('/signup')}
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Verify Email | AgriLink PH</title>
        <meta name="description" content="Verify your email address to complete registration" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>

      <div className={styles.container}>
        <div className={styles.backgroundPattern}></div>
        <div className={`${styles.card} ${isAnimating ? styles.cardAnimating : ''}`}>
          <div className={styles.header}>
            <button className={styles.backButton} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </button>
            <div className={styles.logoContainer}>
              <img 
                src="/assets/images/AgrilinkLogo.png" 
                alt="AgriLink Logo" 
                className={styles.logoImage}
              />
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.iconContainer}>
              <div className={styles.verificationIcon}>
                <i className="fas fa-shield-check"></i>
              </div>
            </div>
            
            <h2 className={styles.title}>Verify Your Email</h2>
            <p className={styles.subtitle}>
              We've sent a 6-digit verification code to <span className={styles.emailText}>{email}</span>
            </p>

            <form onSubmit={handleFormSubmit} className={styles.form}>
              <div className={styles.codeInputContainer}>
                <label className={styles.label}>Enter Verification Code</label>
                <div className={styles.codeInputs} onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={digit}
                      onChange={(e) => handleInputChange(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`${styles.codeInput} ${digit ? styles.filled : ''} ${error ? styles.error : ''}`}
                      maxLength="1"
                      disabled={loading || resending}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                <p className={styles.inputHint}>Enter the 6-digit code sent to your email</p>
              </div>

              <button 
                type="submit" 
                className={`${styles.verifyButton} ${loading ? styles.loading : ''}`}
                disabled={loading || code.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner}></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle"></i>
                    <span>Verify Code</span>
                  </>
                )}
              </button>
            </form>

            <div className={styles.resendSection}>
              <p className={styles.resendText}>
                <i className="fas fa-clock"></i>
                Didn't receive the code?
              </p>
              <button 
                className={`${styles.resendButton} ${resending ? styles.loading : ''}`}
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
              >
                {resending ? (
                  <>
                    <div className={styles.smallSpinner}></div>
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <>
                    <i className="fas fa-hourglass-half"></i>
                    <span>Resend in {cooldown}s</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-redo"></i>
                    <span>Resend Code</span>
                  </>
                )}
              </button>
            </div>

            <div className={styles.securityNote}>
              <i className="fas fa-info-circle"></i>
              <span>This code will expire in 10 minutes for security purposes</span>
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

      {/* Success Toast */}
      {success && (
        <div className={`${styles.successToast} ${showSuccessToast ? styles.show : ''}`}>
          <i className={`fas fa-check-circle ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{success}</span>
          <button className={styles.toastClose} onClick={dismissToast}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      </div>
    </>
  )
}
