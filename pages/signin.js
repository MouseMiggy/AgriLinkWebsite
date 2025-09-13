import { useState } from 'react'
import { useRouter } from 'next/router'
import styles from '../styles/signin.module.css'

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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

      // Redirect to dashboard after successful signin
      router.push('/dashboard')
    } catch (err) {
      console.error('Sign in error:', err)
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address')
      } else if (err.code === 'auth/wrong-password') {
        setError('Invalid password')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/user-disabled') {
        setError('This account has been disabled')
      } else {
        setError('Invalid email or password')
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
        // Create user profile in Firestore
        await setDoc(userDocRef, {
          firstName: user.displayName?.split(' ')[0] || 'User',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          role: 'crop_farmer', // Default role
          createdAt: new Date(),
          photoURL: user.photoURL || null
        })
      }

      // Redirect to dashboard after successful signin
      router.push('/dashboard')
    } catch (err) {
      console.error('Google sign in error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in was cancelled')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by browser')
      } else {
        setError('Failed to sign in with Google')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.logo}>AgriLink</h1>
          <p className={styles.subtitle}>Connect with the farming community</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <h2 className={styles.title}>Welcome Back</h2>
          
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>

          <div className={styles.options}>
            <label className={styles.checkbox}>
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="#" className={styles.forgotPassword}>Forgot password?</a>
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button 
            type="button"
            className={styles.googleButton}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img src="/assets/icons/google.png" alt="Google" className={styles.googleIcon} />
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>Don't have an account?</span>
          </div>

          <button 
            type="button"
            className={styles.secondaryButton}
            onClick={() => router.push('/signup')}
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  )
}
