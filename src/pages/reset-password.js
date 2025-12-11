import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth'
import Toast from '../components/Toast'
import styles from '../../styles/modules/reset-password.module.css'

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const router = useRouter()
  const { identifier, type, code } = router.query

  useEffect(() => {
    if (!identifier || !type || !code) {
      router.push('/forgot-password')
    }
  }, [identifier, type, code, router])

  const showToast = (message, toastType = 'info') => {
    setToast({ message, type: toastType })
  }

  const validatePassword = () => {
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error')
      return false
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'error')
      return false
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return false
    }

    return true
  }

  const handleResetPassword = async () => {
    if (!validatePassword()) return

    setLoading(true)
    try {
      // Call backend to reset password using the mobile app's working endpoint
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: identifier,
          newPassword: newPassword,
          resetMethod: type || 'email'
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('Non-JSON response:', textResponse)
        throw new Error('Server returned an invalid response. Please try again later.')
      }

      const data = await response.json()

      if (response.ok && data.success) {
        showToast('Password reset successfully!', 'success')
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      showToast(error.message || 'Failed to reset password. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/verify-reset-code')
  }

  return (
    <div className={styles.container}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3000}
        />
      )}

      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Reset Password</h1>
      </div>

      <div className={styles.content}>
        <h2 className={styles.subtitle}>Create New Password</h2>
        <p className={styles.description}>
          Your new password must be different from previously used passwords.
        </p>

        <div className={styles.inputContainer}>
          <label className={styles.label}>New Password</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
            <i 
              className={`fas ${showNewPassword ? 'fa-eye' : 'fa-eye-slash'} ${styles.eyeIcon}`}
              onClick={() => setShowNewPassword(!showNewPassword)}
            ></i>
          </div>
          <span className={styles.hint}>Must be at least 6 characters</span>
        </div>

        <div className={styles.inputContainer}>
          <label className={styles.label}>Confirm Password</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              disabled={loading}
            />
            <i 
              className={`fas ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'} ${styles.eyeIcon}`}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            ></i>
          </div>
        </div>

        <button
          onClick={handleResetPassword}
          disabled={loading || !newPassword || !confirmPassword}
          className={styles.resetButton}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  )
}
