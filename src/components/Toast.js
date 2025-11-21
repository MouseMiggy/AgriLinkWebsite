import { useEffect } from 'react'
import styles from '../../styles/modules/Toast.module.css'

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.toastContent}>
        <span className={styles.toastMessage}>{message}</span>
        <button className={styles.toastClose} onClick={onClose}>×</button>
      </div>
    </div>
  )
}
