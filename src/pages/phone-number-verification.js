import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/modules/phone-number-verification.module.css'

export default function PhoneNumberVerification() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [autoSent, setAutoSent] = useState(false)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const inputRefs = useRef([])
  const router = useRouter()

  useEffect(() => {
    // Get query parameters from signup
    if (router.isReady) {
      const { phoneNumber: phone, firstName: fname, lastName: lname, password: pwd, autoSent: sent } = router.query
      
      if (phone) setPhoneNumber(phone)
      if (fname) setFirstName(fname)
      if (lname) setLastName(lname)
      if (pwd) setPassword(pwd)
      if (sent === 'true') setAutoSent(true)
    }
  }, [router.isReady, router.query])

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
      setError('')
    }, 5000)
  }

  const handleBack = () => {
    router.push('/signup')
  }

  const handleCodeChange = (text, index) => {
    if (text.length > 1) {
      text = text[0]
    }
    
    const newCode = [...code]
    newCode[index] = text
    setCode(newCode)

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      
      if (code[index]) {
        const newCode = [...code]
        newCode[index] = ''
        setCode(newCode)
      } else if (index > 0) {
        const newCode = [...code]
        newCode[index - 1] = ''
        setCode(newCode)
        inputRefs.current[index - 1]?.focus()
      }
    }
  }

  const verifyCode = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      showErrorToast('Please enter the complete 6-digit code')
      return
    }

    setVerifying(true)
    try {
      console.log('🔍 Verifying phone number registration code for:', phoneNumber)
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          code: fullCode,
          firstName: firstName,
          lastName: lastName,
          password: password
        }),
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('Non-JSON response:', textResponse)
        throw new Error('Server returned an invalid response. Please try again later.')
      }

      const responseData = await response.json()

      if (response.ok && responseData.success) {
        console.log('✅ Phone verification successful, user created:', responseData.user?.uid)
        
        // Show success message
        showErrorToast('Phone number verified successfully! Account created.')
        
        // Wait a moment then redirect to signin
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
      } else {
        throw new Error(responseData.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      showErrorToast(error.message || 'Failed to verify code. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const resendCode = async () => {
    if (cooldown > 0) return
    setResending(true)
    
    try {
      console.log('🔄 Resending SMS verification code for:', phoneNumber)
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          password: password
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setCooldown(59)
        showErrorToast('Verification code resent successfully!')
      } else {
        throw new Error(result.error || 'Failed to resend verification code')
      }
    } catch (error) {
      console.error('Error resending code:', error)
      showErrorToast(error.message || 'Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const formatPhoneDisplay = (phone) => {
    // Format phone number for display
    if (phone.startsWith('09')) {
      return phone
    } else if (phone.startsWith('+639')) {
      return phone.replace('+63', '0')
    }
    return phone
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Phone Verification</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.step}>
          <h2>Verify Your Phone Number</h2>
          <p>
            We sent a 6-digit verification code to <strong>{formatPhoneDisplay(phoneNumber)}</strong>
          </p>
          {autoSent && (
            <p className={styles.autoSentNotice}>
              ✅ Code has been automatically sent to your phone
            </p>
          )}

          <div className={styles.codeInputContainer}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={styles.codeInput}
                disabled={verifying}
              />
            ))}
          </div>

          <button
            onClick={verifyCode}
            disabled={verifying || code.join('').length !== 6}
            className={styles.verifyButton}
          >
            {verifying ? 'Verifying...' : 'Verify Phone & Create Account'}
          </button>

          <div className={styles.resendContainer}>
            {cooldown > 0 ? (
              <p className={styles.cooldownText}>
                Resend code in {cooldown}s
              </p>
            ) : (
              <button
                onClick={resendCode}
                disabled={resending}
                className={styles.resendButton}
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          <div className={styles.helpText}>
            <p>Didn't receive the code?</p>
            <ul>
              <li>Check your phone number is correct</li>
              <li>Wait a few moments for delivery</li>
              <li>Make sure your phone can receive SMS</li>
              <li>Try resending the code above</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {error && (
        <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
          <i className={`fas fa-${error.includes('success') ? 'check-circle' : 'exclamation-circle'} ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{error}</span>
          <button className={styles.toastClose} onClick={() => setShowToast(false)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  )
}
