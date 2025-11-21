import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import styles from '../../styles/modules/about.module.css'

export default function About() {
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
        <h1 className={styles.title}>About AgriLink</h1>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Our Mission</h2>
          <p>
            AgriLink is dedicated to connecting farmers and livestock owners, creating a thriving
            agricultural community where knowledge, resources, and opportunities are shared freely.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What We Do</h2>
          <p>
            We provide a platform that enables:
          </p>
          <ul>
            <li>Direct communication between crop farmers and livestock owners</li>
            <li>Livestock listings and marketplace functionality</li>
            <li>Knowledge sharing through posts and community discussions</li>
            <li>AI-powered content moderation for a safe community</li>
            <li>Real-time notifications and messaging</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Our Values</h2>
          <div className={styles.valuesList}>
            <div className={styles.valueItem}>
              <h3>🌱 Community First</h3>
              <p>We prioritize the needs and safety of our agricultural community.</p>
            </div>
            <div className={styles.valueItem}>
              <h3>🤝 Trust & Transparency</h3>
              <p>We build trust through honest communication and transparent practices.</p>
            </div>
            <div className={styles.valueItem}>
              <h3>🚀 Innovation</h3>
              <p>We leverage technology to solve real agricultural challenges.</p>
            </div>
            <div className={styles.valueItem}>
              <h3>🌾 Sustainability</h3>
              <p>We support sustainable farming practices and environmental responsibility.</p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Our Team</h2>
          <p>
            AgriLink is built by a passionate team of developers, agricultural experts, and
            community managers dedicated to empowering farmers and livestock owners.
          </p>
        </section>

        <section className={styles.section}>
          <h2>App Details</h2>
          <div className={styles.appDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Version:</span>
              <span className={styles.detailValue}>1.0.0</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Release Date:</span>
              <span className={styles.detailValue}>November 2024</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Platform:</span>
              <span className={styles.detailValue}>Web & Mobile</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Technology:</span>
              <span className={styles.detailValue}>React, Next.js, Firebase, AI-Powered</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Last Updated:</span>
              <span className={styles.detailValue}>November 21, 2024</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Contact Us</h2>
          <p>
            Have questions or feedback? We'd love to hear from you!
            <br />
            <br />
            <strong>Email:</strong> support@agrilink.com
            <br />
            <strong>Phone:</strong> +63 123 456 7890
          </p>
        </section>

        <section className={styles.section}>
          <p className={styles.version}>
            Version 1.0.0 | © 2024 AgriLink. All rights reserved.
          </p>
        </section>
      </div>
    </div>
  )
}
