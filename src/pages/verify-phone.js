import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import styles from '../../styles/modules/verify-phone.module.css'

export default function VerifyPhone() {
  const [user, setUser] = useState(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [cooldown, setCooldown] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [step, setStep] = useState(1) // 1: Enter Phone, 2: Enter Code
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
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number')
      return
    }

    // Format phone number
    const formattedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+63${phoneNumber.replace(/^0/, '')}`
    
    // Validate phone number format
    const phoneRegex = /^\+63[0-9]{10}$/
    if (!phoneRegex.test(formattedPhone)) {
      alert('Invalid Philippine phone number format. Please use format: 09XXXXXXXXX')
      return
    }

    setVerifying(true)
    try {
      const cleanedPhone = formattedPhone.replace('+', '')
      
      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/send-account-verification-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleanedPhone,
          userId: user.uid
        }),
      })

      if (response.ok) {
        setStep(2)
        setCooldown(59)
        alert(`Verification code sent to ${formattedPhone}!`)
      } else {
        const errorText = await response.text()
        console.error('SMS send failed:', errorText)
        throw new Error('Failed to send verification code')
      }
    } catch (error) {
      console.error('Error sending SMS verification:', error)
      alert(error.message || 'Failed to send verification code. Please try again.')
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
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+63${phoneNumber.replace(/^0/, '')}`
      const cleanedPhone = formattedPhone.replace('+', '')

      const response = await fetch('https://api-tykddqtfpa-uc.a.run.app/verify-account-sms-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: cleanedPhone,
          code: fullCode,
          userId: user.uid
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
        // Update Firestore document
        try {
          await updateDoc(doc(db, 'Users', user.uid), {
            phoneNumber: formattedPhone,
            phoneVerified: true,
            updatedAt: new Date()
          })
          console.log('✅ Phone verified and updated:', formattedPhone)
          alert('Phone number verified successfully!')
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
      alert(error.message || 'Failed to verify code. Please try again.')
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
        <h1 className={styles.title}>Phone Verification</h1>
      </div>

      <div className={styles.content}>
        {step === 1 ? (
          // Step 1: Enter Phone
          <div className={styles.step}>
            <h2>Enter Your Phone Number</h2>
            <p>We'll send you a verification code via SMS.</p>
            
            <div className={styles.phoneInputContainer}>
              <span className={styles.countryCode}>+63</span>
              <input
                type="tel"
                placeholder="9XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setPhoneNumber(value)
                }}
                className={styles.phoneInput}
                disabled={verifying}
                maxLength="10"
              />
            </div>
            <p className={styles.hint}>Enter your 10-digit mobile number (without 0)</p>

            <button
              onClick={sendVerificationCode}
              disabled={verifying || phoneNumber.length !== 10}
              className={styles.sendButton}
            >
              {verifying ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          // Step 2: Enter Code
          <div className={styles.step}>
            <h2>Enter Verification Code</h2>
            <p>We sent a 6-digit code to +63{phoneNumber}</p>

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
              {verifying ? 'Verifying...' : 'Verify Phone'}
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
