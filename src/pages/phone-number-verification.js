import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Toast from '../components/Toast'
import styles from '../../styles/modules/verify-reset-code.module.css'

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
  const [toast, setToast] = useState(null)
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

  const showToast = (message, toastType = 'info') => {
    setToast({ message, type: toastType })
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
      showToast('Please enter the complete 6-digit code', 'error')
      return
    }

    setVerifying(true)
    try {
      // Format phone number to +63 format (matching mobile app)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+63${phoneNumber.replace(/^0/, '')}`
      
      console.log('🔍 Verifying phone number registration code for:', formattedPhone)
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          code: fullCode
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
        showToast('Phone number verified successfully! Account created.', 'success')
        
        // Wait a moment then redirect to signin
        setTimeout(() => {
          router.push('/signin')
        }, 1500)
      } else {
        throw new Error(responseData.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      showToast(error.message || 'Failed to verify code. Please try again.', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const resendCode = async () => {
    if (cooldown > 0) return
    setResending(true)
    
    try {
      // Format phone number to +63 format (matching mobile app)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+63${phoneNumber.replace(/^0/, '')}`
      
      console.log('🔄 Resending SMS verification code for:', formattedPhone)
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName,
          lastName: lastName,
          phoneNumber: formattedPhone,
          password: password
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        setCooldown(59)
        showToast('Verification code resent successfully!', 'success')
      } else {
        throw new Error(result.error || 'Failed to resend verification code')
      }
    } catch (error) {
      console.error('Error resending code:', error)
      showToast(error.message || 'Failed to resend code. Please try again.', 'error')
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
        <h1 className={styles.title}>Verify Phone Number</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.step}>
          <h2>Enter Verification Code</h2>
          <p>We sent a 6-digit code to {formatPhoneDisplay(phoneNumber)}</p>

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
            {verifying ? 'Verifying...' : 'Verify Code'}
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

        </div>
      </div>
    </div>
  )
}
