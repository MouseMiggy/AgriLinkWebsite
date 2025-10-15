// Post Component - Dropdown Menu for Post Options
import React, { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './PostDropdown.module.css'

const PostDropdown = ({ 
  post, 
  isOwnPost, 
  showDropdown, 
  setShowDropdown, 
  onEdit, 
  onDelete, 
  onReport 
}) => {
  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleEdit = () => {
    onEdit(post)
    setShowDropdown(false)
  }

  const handleDelete = () => {
    onDelete(post.id)
    setShowDropdown(false)
  }

  const handleReport = () => {
    onReport(post.id)
    setShowDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, setShowDropdown])

  return (
    <>
      <button 
        ref={buttonRef}
        className={styles.optionsBtn}
        onClick={toggleDropdown}
      >
        <img 
          src="/assets/icons/dots-horizontal.png" 
          alt="Options" 
          className={styles.optionsIcon} 
        />
      </button>

      {showDropdown && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.dropdown}
          style={{
            position: 'absolute',
            top: buttonRef.current?.getBoundingClientRect().bottom + 5,
            left: buttonRef.current?.getBoundingClientRect().left - 150,
            zIndex: 99999999
          }}
        >
          {isOwnPost ? (
            <>
              <button onClick={handleEdit} className={styles.dropdownItem}>
                <img 
                  src="/assets/icons/settings.png" 
                  alt="Edit" 
                  className={styles.dropdownIcon} 
                />
                Edit Post
              </button>
              <button onClick={handleDelete} className={styles.dropdownItem}>
                <img 
                  src="/assets/icons/cross-small.png" 
                  alt="Delete" 
                  className={styles.dropdownIcon} 
                />
                Delete Post
              </button>
            </>
          ) : (
            <button onClick={handleReport} className={styles.dropdownItem}>
              <img 
                src="/assets/icons/triangle-warning.png" 
                alt="Report" 
                className={styles.dropdownIcon} 
              />
              Report Post
            </button>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

export default PostDropdown
