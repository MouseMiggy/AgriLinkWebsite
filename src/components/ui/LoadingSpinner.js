// UI Component - Loading Spinner
import React from 'react'
import styles from './LoadingSpinner.module.css'

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary',
  text,
  className = '' 
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]} ${styles[color]}`}></div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  )
}

export default LoadingSpinner
