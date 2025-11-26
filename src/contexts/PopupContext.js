import React, { createContext, useContext, useState } from 'react'

const PopupContext = createContext()

export const usePopup = () => {
  const context = useContext(PopupContext)
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider')
  }
  return context
}

export const PopupProvider = ({ children }) => {
  const [showPopup, setShowPopup] = useState(false)
  const [popupConfig, setPopupConfig] = useState({
    title: '',
    message: '',
    type: 'info', // 'info', 'success', 'error', 'confirm'
    onConfirm: null,
    onCancel: null
  })

  const showInfoPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'info',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showSuccessPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'success',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showErrorPopup = (title, message) => {
    setPopupConfig({
      title,
      message,
      type: 'error',
      onConfirm: () => setShowPopup(false),
      onCancel: null
    })
    setShowPopup(true)
  }

  const showConfirmPopup = (title, message, onConfirm, options = {}) => {
    return new Promise((resolve) => {
      setPopupConfig({
        title,
        message,
        type: 'confirm',
        danger: options.danger || false,
        onConfirm: () => {
          setShowPopup(false)
          resolve(true)
          if (onConfirm) onConfirm()
        },
        onCancel: () => {
          setShowPopup(false)
          resolve(false)
        }
      })
      setShowPopup(true)
    })
  }

  const value = {
    showInfoPopup,
    showSuccessPopup,
    showErrorPopup,
    showConfirmPopup,
    showPopup,
    popupConfig,
    setShowPopup
  }

  return (
    <PopupContext.Provider value={value}>
      {children}
      {/* Global Popup Component */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <div className="popup-header">
              <h3 className="popup-title">{popupConfig.title}</h3>
            </div>
            <div className="popup-content">
              <p className="popup-message">{popupConfig.message}</p>
            </div>
            <div className="popup-actions">
              {popupConfig.type === 'confirm' ? (
                <>
                  <button 
                    className="popup-button-cancel"
                    onClick={popupConfig.onCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    className={`popup-button-confirm ${popupConfig.danger ? 'popup-button-danger' : ''}`}
                    onClick={popupConfig.onConfirm}
                  >
                    {popupConfig.danger ? 'Logout' : 'Confirm'}
                  </button>
                </>
              ) : (
                <button 
                  className={`popup-button popup-button-${popupConfig.type}`}
                  onClick={popupConfig.onConfirm}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}
