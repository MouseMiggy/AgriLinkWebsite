import { useState } from 'react'
import { useRouter } from 'next/router'
import Toast from '../components/Toast'
import styles from '../../styles/modules/forgot-password.module.css'

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('') // email or phone
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [inputType, setInputType] = useState(null) // 'email' or 'phone'
  const router = useRouter()

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
  }

  const detectInputType = (value) => {
    if (!value) {
      setInputType(null)
      return null
    }
    
    // Check if it's a phone number (starts with 0 or + and contains only digits)
    const phonePattern = /^[0+][0-9]*$/
    if (phonePattern.test(value.replace(/\s/g, ''))) {
      setInputType('phone')
      return 'phone'
    }
    
    // Check if it contains @ (email)
    if (value.includes('@')) {
      setInputType('email')
      return 'email'
    }
    
    setInputType(null)
    return null
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setIdentifier(value)
    detectInputType(value)
  }

  const validateInput = () => {
    if (!identifier.trim()) {
      showToast('Please enter your email or phone number', 'error')
      return false
    }

    const type = detectInputType(identifier)
    
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(identifier)) {
        showToast('Please enter a valid email address', 'error')
        return false
      }
    } else if (type === 'phone') {
      const cleanedPhone = identifier.replace(/\s/g, '').replace(/^0/, '')
      if (cleanedPhone.length !== 10) {
        showToast('Please enter a valid 10-digit phone number', 'error')
        return false
      }
    } else {
      showToast('Please enter a valid email or phone number', 'error')
      return false
    }

    return true
  }

  const handleSendResetCode = async () => {
    if (!validateInput()) return

    setLoading(true)
    try {
      const type = detectInputType(identifier)
      let formattedIdentifier = identifier

      if (type === 'phone') {
        // Format phone number for Philippines (+63 format to match registration)
        const cleanedPhone = identifier.replace(/\s/g, '').replace(/^0/, '')
        formattedIdentifier = `+63${cleanedPhone}`
      }

      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrPhone: formattedIdentifier
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', response.status, response.statusText)
        throw new Error('Server error: The password reset feature is currently unavailable. Please try again later or contact support.')
      }

      const data = await response.json()

      if (response.ok && data.success) {
        showToast(`Reset code sent to your ${type}!`, 'success')
        // Navigate to verification page with identifier
        setTimeout(() => {
          router.push({
            pathname: '/verify-reset-code',
            query: { 
              identifier: formattedIdentifier,
              type: type,
              display: type === 'phone' ? `+63${identifier.replace(/\s/g, '').replace(/^0/, '')}` : identifier
            }
          })
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to send reset code')
      }
    } catch (error) {
      console.error('Error sending reset code:', error)
      showToast(error.message || 'Failed to send reset code. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/signin')
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
          ← Back to Sign In
        </button>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>Forgot Password?</h1>
        <p className={styles.description}>
          Enter your email address or phone number and we'll send you a code to reset your password.
        </p>

        <div className={styles.inputContainer}>
          <label className={styles.label}>Email or Phone Number</label>
          <input
            type="text"
            placeholder="Enter email or phone number"
            value={identifier}
            onChange={handleInputChange}
            className={styles.input}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleSendResetCode}
          disabled={loading || !identifier.trim()}
          className={styles.sendButton}
        >
          {loading ? 'Sending...' : 'Send Reset Code'}
        </button>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Remember your password?{' '}
            <button onClick={handleBack} className={styles.linkButton}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
