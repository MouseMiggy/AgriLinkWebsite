import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import styles from '../styles/verify-code.module.css'

export default function VerifyCode() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const { email } = router.query

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      showErrorToast('Please enter the 6-digit code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://192.168.0.109:3000/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
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
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return

    setResending(true)
    setError('')

    try {
      const response = await fetch('http://192.168.0.109:3000/resend-code', {
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
          <p>Invalid verification link. Please try registering again.</p>
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
      <div className={styles.card}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Back
          </button>
          <h1 className={styles.logo}>AgriLink</h1>
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>Enter Verification Code</h2>
          <p className={styles.subtitle}>
            We've sent a 6-digit verification code to{' '}
            <span className={styles.emailText}>{email}</span>
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="code" className={styles.label}>Verification Code</label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={styles.input}
                placeholder="Enter 6-digit code"
                maxLength="6"
                disabled={loading || resending}
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className={styles.verifyButton}
              disabled={loading || !code.trim()}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          <div className={styles.resendSection}>
            <p className={styles.resendText}>Didn't receive the code?</p>
            <button 
              className={styles.resendButton}
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {resending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
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
