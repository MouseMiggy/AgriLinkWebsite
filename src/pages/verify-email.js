import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import styles from '../../styles/modules/verify-email.module.css'

export default function VerifyEmail() {
  const [user, setUser] = useState(null)
  const [emailToVerify, setEmailToVerify] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [step, setStep] = useState(1) // 1: Enter Email, 2: Enter Code
  const inputRefs = useRef([])
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  useEffect(() => {
    let timer
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setCode(['', '', '', '', '', ''])
    } else {
      router.push('/account-settings')
    }
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

  const sendVerificationCode = async () => {
    if (!emailToVerify.trim()) {
      alert('Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailToVerify)) {
      alert('Please enter a valid email address')
      return
    }

    setVerifying(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToVerify,
          userId: user.uid
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setStep(2)
        setCooldown(59)
        alert(`Verification code sent to ${emailToVerify}! Check your email inbox.`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send verification code')
      }
    } catch (error) {
      console.error('Error sending email verification:', error)
      if (error.name === 'AbortError') {
        alert('Request timed out. Please check if the backend server is running and try again.')
      } else if (error.message.includes('Network request failed')) {
        alert('Cannot connect to server. Please ensure the backend server is running.')
      } else {
        alert(error.message || 'Failed to send verification code. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const verifyCode = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      alert('Please enter the complete 6-digit code')
      return
    }

    setVerifying(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToVerify,
          code: fullCode,
          userId: user.uid
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseData = await response.json()

      if (response.ok && responseData.success) {
        // Update Firestore document
        try {
          await updateDoc(doc(db, 'Users', user.uid), {
            email: emailToVerify,
            emailVerified: true,
            updatedAt: new Date()
          })
          console.log('✅ Email verified and updated:', emailToVerify)
          alert('Email verified successfully!')
          router.push('/account-settings')
        } catch (updateError) {
          console.error('Error updating Firestore:', updateError)
          alert('Verification successful but failed to update profile. Please try again.')
        }
      } else {
        throw new Error(responseData.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      if (error.name === 'AbortError') {
        alert('Request timed out. Please try again.')
      } else {
        alert(error.message || 'Failed to verify code. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const resendCode = async () => {
    if (cooldown > 0) return
    setResending(true)
    await sendVerificationCode()
    setResending(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Email Verification</h1>
      </div>

      <div className={styles.content}>
        {step === 1 ? (
          // Step 1: Enter Email
          <div className={styles.step}>
            <h2>Enter Your Email</h2>
            <p>We'll send you a verification code to confirm your email address.</p>
            
            <input
              type="email"
              placeholder="Enter your email"
              value={emailToVerify}
              onChange={(e) => setEmailToVerify(e.target.value)}
              className={styles.emailInput}
              disabled={verifying}
            />

            <button
              onClick={sendVerificationCode}
              disabled={verifying || !emailToVerify.trim()}
              className={styles.sendButton}
            >
              {verifying ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          // Step 2: Enter Code
          <div className={styles.step}>
            <h2>Enter Verification Code</h2>
            <p>We sent a 6-digit code to {emailToVerify}</p>

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
              {verifying ? 'Verifying...' : 'Verify Email'}
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
        )}
      </div>
    </div>
  )
}
