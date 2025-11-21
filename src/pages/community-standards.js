import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import styles from '../../styles/modules/community-standards.module.css'

export default function CommunityStandards() {
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
        <h1 className={styles.title}>Community Standards</h1>
      </div>

      <div className={styles.content}>
        {/* Navigation Tabs */}
        <div className={styles.tabs}>
          <button 
            className={styles.tabButton}
            onClick={() => router.push('/community-standards')}
            style={{ borderBottom: '3px solid #fa9100', color: '#fa9100' }}
          >
            Community Standards
          </button>
          <button 
            className={styles.tabButton}
            onClick={() => router.push('/privacy-policy')}
          >
            Privacy & Safety
          </button>
        </div>

        <section className={styles.intro}>
          <p>
            AgriLink is committed to creating a safe, respectful, and productive environment for all farmers
            and livestock owners. These Community Standards outline what is and isn't allowed on our platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>1. Agricultural Content Only</h2>
          <div className={styles.rule}>
            <div className={styles.allowed}>
              <h3>✓ Allowed</h3>
              <ul>
                <li>Posts about crops, livestock, and farming practices</li>
                <li>Agricultural equipment and supplies</li>
                <li>Farming tips and knowledge sharing</li>
                <li>Livestock listings and marketplace content</li>
                <li>Agricultural news and updates</li>
              </ul>
            </div>
            <div className={styles.notAllowed}>
              <h3>✗ Not Allowed</h3>
              <ul>
                <li>Non-agricultural content or spam</li>
                <li>Unrelated products or services</li>
                <li>Off-topic discussions</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>2. Respectful Communication</h2>
          <div className={styles.rule}>
            <div className={styles.allowed}>
              <h3>✓ Allowed</h3>
              <ul>
                <li>Constructive feedback and discussions</li>
                <li>Asking questions and seeking advice</li>
                <li>Sharing experiences respectfully</li>
              </ul>
            </div>
            <div className={styles.notAllowed}>
              <h3>✗ Not Allowed</h3>
              <ul>
                <li>Offensive language or profanity</li>
                <li>Personal attacks or harassment</li>
                <li>Hate speech or discrimination</li>
                <li>Bullying or threatening behavior</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>3. Honest and Accurate Information</h2>
          <div className={styles.rule}>
            <div className={styles.allowed}>
              <h3>✓ Allowed</h3>
              <ul>
                <li>Truthful descriptions of livestock and products</li>
                <li>Accurate pricing and availability</li>
                <li>Verified agricultural information</li>
              </ul>
            </div>
            <div className={styles.notAllowed}>
              <h3>✗ Not Allowed</h3>
              <ul>
                <li>False or misleading information</li>
                <li>Scams or fraudulent listings</li>
                <li>Misrepresentation of products or services</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>4. Privacy and Safety</h2>
          <div className={styles.rule}>
            <div className={styles.allowed}>
              <h3>✓ Allowed</h3>
              <ul>
                <li>Sharing your own agricultural content</li>
                <li>Public business information</li>
                <li>General location information</li>
              </ul>
            </div>
            <div className={styles.notAllowed}>
              <h3>✗ Not Allowed</h3>
              <ul>
                <li>Sharing others' private information</li>
                <li>Posting personal contact details publicly</li>
                <li>Violating privacy rights</li>
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>5. Prohibited Content</h2>
          <p>The following content is strictly prohibited:</p>
          <ul className={styles.prohibitedList}>
            <li>Illegal activities or content</li>
            <li>Violence or graphic content</li>
            <li>Sexual or adult content</li>
            <li>Spam or repetitive content</li>
            <li>Copyright infringement</li>
            <li>Impersonation or fake accounts</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Enforcement</h2>
          <p>
            Violations of these Community Standards may result in:
          </p>
          <ul className={styles.enforcementList}>
            <li><strong>Content Removal:</strong> Posts, comments, or listings that violate our standards will be removed</li>
            <li><strong>Warnings:</strong> First-time or minor violations may result in a warning</li>
            <li><strong>Account Suspension:</strong> Repeated or serious violations may lead to temporary suspension</li>
            <li><strong>Account Termination:</strong> Severe or persistent violations may result in permanent account removal</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>AI Content Moderation</h2>
          <p>
            AgriLink uses AI technology to help enforce these standards. Our AI system:
          </p>
          <ul>
            <li>Reviews reported content for violations</li>
            <li>Analyzes text and images for inappropriate content</li>
            <li>Checks for agricultural relevance</li>
            <li>Provides detailed explanations for moderation decisions</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Reporting Violations</h2>
          <p>
            If you see content that violates these standards, please report it using the report button.
            Our AI system will review the report and take appropriate action.
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
