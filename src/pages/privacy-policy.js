import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import styles from '../../styles/modules/privacy-policy.module.css'

export default function PrivacyPolicy() {
  const [user, setUser] = useState(null)
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

  const handleBack = () => {
    router.push('/dashboard')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>
        <h1 className={styles.title}>Privacy Policy</h1>
      </div>

      <div className={styles.content}>
        {/* Navigation Tabs */}
        <div className={styles.tabs}>
          <button 
            className={styles.tabButton}
            onClick={() => router.push('/community-standards')}
          >
            Community Standards
          </button>
          <button 
            className={styles.tabButton}
            onClick={() => router.push('/privacy-policy')}
            style={{ borderBottom: '3px solid #fa9100', color: '#fa9100' }}
          >
            Privacy & Safety
          </button>
        </div>

        <section className={styles.section}>
          <h2>Privacy & Safety</h2>
          <p>
            Your privacy and safety are our top priorities. This policy explains how we collect,
            use, and protect your information on AgriLink.
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Information We Collect</h2>
          <p>
            AgriLink collects information you provide directly to us, including:
          </p>
          <ul>
            <li>Name, email address, and profile information</li>
            <li>Posts, comments, and messages you create</li>
            <li>Livestock listings and agricultural content</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Connect farmers and livestock owners</li>
            <li>Send you technical notices and support messages</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect and prevent fraud and abuse</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share your information:
          </p>
          <ul>
            <li>With other users as part of the platform's functionality</li>
            <li>With service providers who assist in our operations</li>
            <li>When required by law or to protect rights and safety</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information.
            However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Your Rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access and update your personal information</li>
            <li>Delete your account and associated data</li>
            <li>Opt-out of certain data collection</li>
            <li>Request a copy of your data</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Safety Features</h2>
          <p>
            AgriLink provides several safety features:
          </p>
          <ul>
            <li><strong>AI Content Moderation:</strong> Our AI system reviews reported content for violations</li>
            <li><strong>Report System:</strong> Report inappropriate content or users</li>
            <li><strong>Block & Mute:</strong> Control who can interact with you</li>
            <li><strong>Secure Messaging:</strong> Private conversations are protected</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Content Guidelines</h2>
          <p>
            To maintain a safe environment, all content must:
          </p>
          <ul>
            <li>Be related to agriculture, farming, or livestock</li>
            <li>Be respectful and appropriate</li>
            <li>Not contain offensive language or harassment</li>
            <li>Not include false or misleading information</li>
            <li>Not violate others' privacy or rights</li>
          </ul>
          <p>
            For detailed guidelines, please visit our <button 
              onClick={() => router.push('/community-standards')}
              style={{ 
                color: '#fa9100', 
                textDecoration: 'underline', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              Community Standards
            </button> page.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Rules & Regulations</h2>
          <p>
            By using AgriLink, you agree to:
          </p>
          <ul>
            <li>Follow all community standards and guidelines</li>
            <li>Provide accurate information in listings and posts</li>
            <li>Respect other users and their content</li>
            <li>Not engage in spam or fraudulent activities</li>
            <li>Not impersonate others or create fake accounts</li>
          </ul>
          <p>
            Violations may result in content removal, warnings, account suspension, or termination.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at:
            <br />
            <strong>support@agrilink.com</strong>
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.lastUpdated}>
            Last Updated: November 21, 2024
          </p>
        </section>
      </div>
    </div>
  )
}
