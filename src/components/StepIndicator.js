import React from 'react'
import styles from '../../styles/components/step-indicator.module.css'

const StepIndicator = ({ currentStep, totalSteps = 4, variant = 'dots' }) => {
  if (variant === 'dots') {
    return (
      <div className={styles.dotsIndicator}>
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          let dotClass = styles.dot
          
          if (stepNumber === currentStep) {
            dotClass += ` ${styles.active}`
          } else if (stepNumber < currentStep) {
            dotClass += ` ${styles.completed}`
          }
          
          return (
            <div
              key={index}
              className={dotClass}
            />
          )
        })}
      </div>
    )
  }
  
  // Original progress bar variant
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100
  
  return (
    <div className={styles.stepIndicator}>
      <div className={styles.stepText}>
        {currentStep}: {stepName}
      </div>
      
      <div className={styles.stepProgress}>
        <div 
          className={styles.progressBar} 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}

export default StepIndicator
