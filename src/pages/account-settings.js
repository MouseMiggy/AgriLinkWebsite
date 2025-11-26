import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import styles from '../../styles/modules/account-settings.module.css'

export default function AccountSettings() {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
          if (userDoc.exists()) {
            const profile = userDoc.data()
            setUserProfile(profile)
            setLocationEnabled(profile.locationEnabled || false)
          }
        } catch (error) {
          console.error('Error fetching user profile:', error)
        }
        setLoading(false)
      } else {
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleBack = () => {
    router.push('/dashboard')
  }

  const getRegistrationMethod = () => {
    if (!userProfile) return 'Unknown'
    
    // Check if registered with email
    if (userProfile.email && !userProfile.email.includes('@temp.agrilink.com')) {
      return 'Email'
    }
    // Check if registered with phone
    if (userProfile.phoneNumber) {
      return 'Phone Number'
    }
    return 'Unknown'
  }

  const getAccountStatus = () => {
    if (!userProfile) return { status: 'Unknown', color: '#65676b', isPartial: false }
    
    const emailVerified = userProfile.emailVerified && userProfile.email && !userProfile.email.includes('@temp.agrilink.com')
    const phoneVerified = userProfile.phoneVerified && userProfile.phoneNumber
    
    if (emailVerified && phoneVerified) {
      return { status: 'Verified', color: '#4caf50', isPartial: false }
    } else if (emailVerified || phoneVerified) {
      return { status: 'Partially Verified', color: '#fa9100', isPartial: true }
    } else {
      return { status: 'Not Verified', color: '#f44336', isPartial: false }
    }
  }

  const handleToggleLocation = async () => {
    if (!user) return
    
    try {
      const newLocationEnabled = !locationEnabled
      
      if (newLocationEnabled) {
        // Request location permission
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              await setDoc(doc(db, 'Users', user.uid), {
                locationEnabled: true,
                location: {
                  latitude,
                  longitude
                }
              }, { merge: true })
              setLocationEnabled(true)
              alert('Location enabled successfully!')
            },
            (error) => {
              console.error('Error getting location:', error)
              alert('Failed to get location. Please enable location permissions in your browser.')
            }
          )
        } else {
          alert('Geolocation is not supported by your browser')
        }
      } else {
        // Disable location
        await setDoc(doc(db, 'Users', user.uid), {
          locationEnabled: false
        }, { merge: true })
        setLocationEnabled(false)
        alert('Location disabled')
      }
    } catch (error) {
      console.error('Error updating location settings:', error)
      alert('Failed to update location settings')
    }
  }

  const handleAddVerifyEmail = () => {
    // Navigate to email verification page
    router.push('/verify-email')
  }

  const handleAddVerifyPhone = () => {
    // Navigate to phone verification page
    router.push('/verify-phone')
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  const accountStatus = getAccountStatus()
  const hasEmail = userProfile?.email && !userProfile.email.includes('@temp.agrilink.com')
  const hasPhone = userProfile?.phoneNumber
  const emailVerified = userProfile?.emailVerified
  const phoneVerified = userProfile?.phoneVerified

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          <img src="/assets/icons/back.png" alt="Back" className={styles.backIcon} />
          <span>Back</span>
        </button>
        <h1 className={styles.title}>Account Settings</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.leftColumn}>
          {/* Account Status Section */}
          <section className={styles.section}>
            <h2>Account Status</h2>
            
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Registration Method:</span>
              <span className={styles.infoValue}>{getRegistrationMethod()}</span>
            </div>
            
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Account Status:</span>
              {accountStatus.isPartial ? (
                <span className={styles.infoValue} style={{ color: accountStatus.color, fontWeight: 600 }}>
                  {accountStatus.status}
                </span>
              ) : (
                <span className={styles.statusBadge} style={{ backgroundColor: accountStatus.color }}>
                  {accountStatus.status}
                </span>
              )}
            </div>
          </section>

          {/* Verification Section */}
          <section className={styles.section}>
            <h2>Verification</h2>
          
          <div className={styles.verificationItem}>
            <div className={styles.verificationInfo}>
              <div className={styles.verificationHeader}>
                <span className={styles.verificationLabel}>Email Verification</span>
                {hasEmail && emailVerified && (
                  <span className={styles.verifiedBadge}>✓ Verified</span>
                )}
              </div>
              {hasEmail ? (
                <span className={styles.verificationDetail}>{userProfile.email}</span>
              ) : (
                <span className={styles.verificationDetail}>No email added</span>
              )}
            </div>
            {(!hasEmail || !emailVerified) && (
              <button onClick={handleAddVerifyEmail} className={styles.verifyButton}>
                {hasEmail ? 'Verify' : 'Add & Verify'}
              </button>
            )}
          </div>

          <div className={styles.verificationItem}>
            <div className={styles.verificationInfo}>
              <div className={styles.verificationHeader}>
                <span className={styles.verificationLabel}>Phone Number</span>
                {hasPhone && phoneVerified && (
                  <span className={styles.verifiedBadge}>✓ Verified</span>
                )}
              </div>
              {hasPhone ? (
                <span className={styles.verificationDetail}>{userProfile.phoneNumber}</span>
              ) : (
                <span className={styles.verificationDetail}>No phone number added</span>
              )}
            </div>
            {(!hasPhone || !phoneVerified) && (
              <button onClick={handleAddVerifyPhone} className={styles.verifyButton}>
                {hasPhone ? 'Verify' : 'Add & Verify'}
              </button>
            )}
          </div>
          </section>
        </div>

        <div className={styles.rightColumn}>
          {/* Security Information */}
          <section className={styles.section}>
            <h2>Security Information</h2>
            <div className={styles.securityInfo}>
              <img src="/assets/icons/shield.png" alt="Security" className={styles.securityIcon} />
              <p>
                Verifying both your email and phone number helps secure your account and enables account recovery options.
              </p>
            </div>
          </section>

          {/* Location Settings */}
          <section className={styles.section}>
            <h2>Location Settings</h2>
          
          <div className={styles.locationSetting}>
            <div className={styles.locationInfo}>
              <h3>Location Access</h3>
              <div className={styles.locationStatus}>
                <span className={styles.statusLabel}>Status:</span>
                <span className={locationEnabled ? styles.statusEnabled : styles.statusDisabled}>
                  {locationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className={styles.locationDescription}>
                {locationEnabled 
                  ? 'Your location is being used to show nearby listings and provide personalized recommendations based on your area.'
                  : 'Enable location to find nearby farmers and get location-based recommendations. Your exact location will not be shared with other users.'}
              </p>
              <button 
                onClick={handleToggleLocation}
                className={locationEnabled ? styles.disableButton : styles.enableButton}
              >
                {locationEnabled ? 'Disable Location' : 'Enable Location'}
              </button>
            </div>
          </div>
          </section>
        </div>
      </div>
    </div>
  )
}
