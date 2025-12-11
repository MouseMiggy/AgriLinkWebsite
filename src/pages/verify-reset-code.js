import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Toast from '../components/Toast'
import styles from '../../styles/modules/verify-reset-code.module.css'

export default function VerifyResetCode() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(59)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [toast, setToast] = useState(null)
  const inputRefs = useRef([])
  const router = useRouter()
  const { identifier, type, display } = router.query

  useEffect(() => {
    if (!identifier || !type) {
      router.push('/forgot-password')
    }
  }, [identifier, type, router])

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
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-password-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier,
          code: fullCode,
          type: type
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text()
        console.error('Non-JSON response:', textResponse)
        throw new Error('Server returned an invalid response. Please try again later.')
      }

      const responseData = await response.json()

      if (response.ok && responseData.success) {
        showToast('Code verified successfully!', 'success')
        setTimeout(() => {
          router.push({
            pathname: '/reset-password',
            query: { 
              identifier: identifier,
              type: type,
              resetToken: responseData.resetToken
            }
          })
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
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-password-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier,
          type: type
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setCooldown(59)
        showToast('Reset code resent successfully!', 'success')
      } else {
        throw new Error(data.error || 'Failed to resend code')
      }
    } catch (error) {
      console.error('Error resending code:', error)
      showToast(error.message || 'Failed to resend code. Please try again.', 'error')
    } finally {
      setResending(false)
    }
  }

  const handleBack = () => {
    router.push('/forgot-password')
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
        <h1 className={styles.title}>Verify Reset Code</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.step}>
          <h2>Enter Verification Code</h2>
          <p>We sent a 6-digit code to {display || identifier}</p>

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
