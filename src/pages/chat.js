import { useState, useEffect, useRef, useCallback } from 'react'
import { db, auth } from '../lib/firebase'
import { collection, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, writeBatch, getDocsFromCache } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import styles from '../../styles/modules/chat.module.css'
import AIChatService from '../lib/aiChatService'

const Chat = ({ user, userRole, setActiveMenuItem, onUnreadChatsUpdate }) => {
  // Chat state variables
  const [selectedChat, setSelectedChat] = useState(null)
  
  // Cooldown countdown state
  const [cooldownCountdown, setCooldownCountdown] = useState({})
  
  // Maps to store listeners at component level to persist across re-renders
  const chatDocumentListeners = useRef(new Map())
  const messageListeners = useRef(new Map())
  
  // Wrapper function to add logging to setSelectedChat
  const logSetSelectedChat = (chat) => {
    console.log('🔄 setSelectedChat called:', chat ? {
      id: chat.id,
      otherUserName: chat.otherUserName,
      stackTrace: new Error().stack
    } : 'null')
    setSelectedChat(chat)
  }
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  // Wrapper function to add logging to setConversations
  const logSetConversations = (conversations) => {
    console.log('📝 setConversations called:', conversations.length, 'conversations')
    console.log('📝 Current selectedChat:', selectedChat ? selectedChat.id : 'none')
    setConversations(conversations)
  }
  
  // Wrapper function to add logging to setChatMessages
  const logSetChatMessages = (messages) => {
    console.log('💬 setChatMessages called:', messages.length, 'messages for chat:', selectedChat?.id)
    setChatMessages(messages)
  }
  const [conversations, setConversations] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [transactionCompletionStatus, setTransactionCompletionStatus] = useState({})
  const [unreadChats, setUnreadChats] = useState(0)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true)
  const [showSummary, setShowSummary] = useState(false)
  const [transactionSummary, setTransactionSummary] = useState(null)
  const [transactionStage, setTransactionStage] = useState('initial')
  const [chatTransactionStates, setChatTransactionStates] = useState({})
  const [requestStatus, setRequestStatus] = useState(null)
  const [listingName, setListingName] = useState(null)
  // markAsReadTimeoutRef removed - no longer needed
  const [sendingMessageId, setSendingMessageId] = useState(null)
  const [deliveredMessageId, setDeliveredMessageId] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)
  
  // Transaction completion and rating state
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionCooldown, setTransactionCooldown] = useState({})
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingUser, setRatingUser] = useState(null)
  const [selectedRating, setSelectedRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [hasRatedThisTransaction, setHasRatedThisTransaction] = useState(false)
  
  // Persistent popup state
  const [pendingTransactionPopup, setPendingTransactionPopup] = useState(null)
  const [currentPopupChatId, setCurrentPopupChatId] = useState(null)
  
  // Transaction completion state
  const [hasTransactionCompleted, setHasTransactionCompleted] = useState(false)
  
  // Per-user rating completion state
  const [userHasRated, setUserHasRated] = useState(false)
  
  // Ref for auto-scrolling to bottom
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Handle ESC key for fullscreen modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && fullscreenImage) {
        setFullscreenImage(null)
      }
    }
    
    if (fullscreenImage) {
      document.addEventListener('keydown', handleEscKey)
      return () => {
        document.removeEventListener('keydown', handleEscKey)
      }
    }
  }, [fullscreenImage])

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  // Auto-scroll when conversation is selected
  useEffect(() => {
    if (selectedChat) {
      setTimeout(scrollToBottom, 100)
    }
  }, [selectedChat])

  // Toggle AI suggestions open/closed
  const toggleSuggestions = () => {
    setIsSuggestionsOpen(!isSuggestionsOpen)
  }

  // Auto-scroll when AI suggestions appear
  useEffect(() => {
    if (showSuggestions && aiSuggestions.length > 0 && isSuggestionsOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 300) // Small delay to ensure suggestions are rendered
    }
  }, [showSuggestions, aiSuggestions.length, isSuggestionsOpen])

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  // Clear image selection
  const clearImageSelection = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Upload image to Firebase Storage
  const uploadImageToFirebase = async (file) => {
    console.log('🖼️ Starting Firebase Storage upload:', file?.name, file?.size)
    
    if (!file || !user || !selectedChat) {
      console.error('❌ Missing required data:', { file: !!file, user: !!user, selectedChat: !!selectedChat })
      return null
    }
    
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now()
      const filename = `${timestamp}_${file.name}`
      console.log('📁 Creating storage path:', `chatImages/${selectedChat.chatId}/${filename}`)
      
      // Create storage reference
      const storageRef = ref(storage, `chatImages/${selectedChat.chatId}/${filename}`)
      console.log('🔗 Storage reference created:', storageRef)
      
      // Upload file to Firebase Storage
      console.log('📤 Uploading file to Firebase Storage...')
      await uploadBytes(storageRef, file)
      console.log('✅ File uploaded successfully')
      
      // Get download URL
      console.log('🔗 Getting download URL...')
      const downloadURL = await getDownloadURL(storageRef)
      console.log('✅ Download URL obtained:', downloadURL)
      
      return downloadURL
    } catch (error) {
      console.error('❌ Firebase Storage upload error:', error)
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse
      })
      throw error
    }
  }

  // Format display name for chat list with truncation
  const formatChatListDisplayName = (otherUserName, listingName) => {
    if (!otherUserName) return 'User'
    
    let displayName = otherUserName
    
    // If full name is greater than 15 characters, use first name only
    if (otherUserName.length > 15) {
      const nameParts = otherUserName.split(' ')
      displayName = nameParts[0] || otherUserName
    }
    
    // Add listing name if available
    if (listingName) {
      // Truncate listing name if too long
      let truncatedListingName = listingName
      if (listingName.length > 30) {
        truncatedListingName = listingName.substring(0, 30) + '...'
      }
      displayName += ` • ${truncatedListingName}`
    }
    
    return displayName
  }

  // Format timestamp for chat messages
  const formatChatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  // Clear AI suggestions when transaction is completed
  useEffect(() => {
    if (hasTransactionCompleted) {
      console.log('🤖 Transaction completed - clearing AI suggestions')
      setAiSuggestions([])
      setShowSuggestions(false)
    }
  }, [hasTransactionCompleted])
  
  // Reset user rating status when switching chats
  useEffect(() => {
    setUserHasRated(false)
  }, [selectedChat?.id])
  
  // Check if current user has already rated when transaction completes or chat loads
  useEffect(() => {
    if (hasTransactionCompleted && user && selectedChat) {
      const checkUserRating = async () => {
        try {
          console.log('🔍 Checking if current user has already rated...')
          console.log('👤 Current user ID:', user.uid)
          console.log('👤 Other user ID:', selectedChat.otherUserId)
          console.log('💬 Chat ID:', selectedChat.id)
          
          const otherUserRef = doc(db, 'Users', selectedChat.otherUserId)
          const otherUserDoc = await getDoc(otherUserRef)
          
          if (otherUserDoc.exists()) {
            const otherUserData = otherUserDoc.data()
            const existingRatings = otherUserData.ratings || []
            console.log('📊 Existing ratings in other user document:', existingRatings.length)
            
            const currentUserRating = existingRatings.find(rating => 
              rating.ratedBy === user.uid && 
              rating.chatId === selectedChat.id
            )
            
            const hasRated = !!currentUserRating
            console.log('✅ User rating status:', hasRated, 'for user:', user.uid)
            setUserHasRated(hasRated)
          }
        } catch (error) {
          console.error('Error checking user rating status:', error)
        }
      }
      
      checkUserRating()
    }
  }, [hasTransactionCompleted, selectedChat?.id, user?.uid])
  const aiSuggestionsCache = useRef(new Map())
  
  // Trigger AI suggestions when new message arrives
  const triggerAISuggestions = async (messages) => {
    if (!user || !selectedChat || messages.length === 0) return;
    
    try {
      console.log('🤖 Triggering AI suggestions for chat:', selectedChat.id);
      
      // Create cache key based on last message content and count
      const lastMessage = messages[messages.length - 1];
      const cacheKey = `${selectedChat.id}_${messages.length}_${lastMessage?.text?.slice(-50) || ''}`;
      
      // Check cache first
      if (aiSuggestionsCache.current.has(cacheKey)) {
        console.log('🤖 Using cached AI suggestions for:', cacheKey);
        const cachedSuggestions = aiSuggestionsCache.current.get(cacheKey);
        setAiSuggestions(cachedSuggestions);
        setShowSuggestions(true);
        return;
      }
      
      // Get current chat state or use defaults (stage '1' for new conversations)
      const currentChatState = chatTransactionStates[selectedChat.chatId] || {
        stage: '1',
        language: 'english'
      };
      
      const conversationData = {
        userId: user.uid,
        userRole: userRole,
        listingName: selectedChat.listingName || 'product',
        messages: messages.map(msg => ({
          text: msg.text,
          senderName: msg.senderId === user.uid ? 'You' : selectedChat.otherUserName,
          timestamp: msg.createdAt,
          isOwnMessage: msg.senderId === user?.uid
        })),
        currentStage: currentChatState.stage,
        language: currentChatState.language
      };
      
      console.log('🤖 Sending conversation data to AI:', conversationData);
      
      // Call AI service to get suggestions
      const result = await AIChatService.generateContextualSuggestions(conversationData);
      
      if (result && result.suggestions) {
        console.log('🤖 AI Suggestions received:', result);
        
        // Store suggestions in cache
        aiSuggestionsCache.current.set(cacheKey, result.suggestions);
        
        setAiSuggestions(result.suggestions);
        setShowSuggestions(true);
        
        // Update chat-specific transaction state
        setChatTransactionStates(prev => ({
          ...prev,
          [selectedChat.chatId]: {
            stage: result.stage || currentChatState.stage,
            language: result.language || currentChatState.language
          }
        }));
      }
    } catch (error) {
      console.error('🤖 Error getting AI suggestions:', error);
    }
  };

  // Extract listing ID from chat messages for transaction completion
  const extractListingIdFromChat = () => {
    // Find the listing request message to get listing ID
    const listingRequestMessage = chatMessages.find(msg => msg.isListingRequest)
    if (listingRequestMessage && listingRequestMessage.listingId) {
      return listingRequestMessage.listingId
    }
    return null
  }

  // Generate contextual AI suggestions based on transaction stage
  const generateContextualSuggestions = async () => {
    if (!user || !selectedChat || !userRole) return

    try {
      console.log('🤖 Generating contextual AI suggestions for chat:', selectedChat.id)
      
      // Get chat-specific transaction state
      const chatId = selectedChat?.id
      console.log('🔍 DEBUG: Chat-Specific State Analysis')
      console.log('💬 Current chatId:', chatId)
      console.log('📊 Available states:', Object.keys(chatTransactionStates))
      
      const currentChatState = chatTransactionStates[chatId] || {
        stage: 'initial',
        language: 'english'
      }
      
      console.log('🎯 Current chat state:', currentChatState)
      
      // Check if there's an approved request in the messages
      const approvedRequest = chatMessages.find(msg => 
        msg.isListingRequest && msg.requestStatus === 'approved'
      )
      
      if (!approvedRequest) {
        console.log('❌ No approved request found, skipping suggestions')
        return
      }
      
      // Determine transaction stage based on messages and state
      const messages = chatMessages.map(msg => ({
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: msg.createdAt,
        isOwnMessage: msg.senderId === user?.uid
      }))
      
      const conversationData = {
        userId: user.uid,
        userRole,
        listingName,
        messages,
        currentStage: currentChatState.stage,
        language: currentChatState.language
      }
      
      console.log('📤 Sending conversation data to AI:', conversationData)
      
      // Call AI backend - this is the ONLY source of suggestions
      const result = await AIChatService.generateContextualSuggestions(conversationData)
      
      console.log('📥 AI response received:', result)
      
      if (result && result.suggestions && result.suggestions.length > 0) {
        console.log('✅ Setting AI suggestions:', result.suggestions)
        setAiSuggestions(result.suggestions)
        setShowSuggestions(true)
        
        // Update chat-specific transaction state from AI response
        const updatedChatState = {
          stage: result.stage || 'initial',
          language: result.language || 'english'
        }
        
        setChatTransactionStates(prev => ({
          ...prev,
          [chatId]: updatedChatState
        }))
        
        console.log('🔄 Updated chat state:', updatedChatState)
        
        // If AI suggests a summary, prepare it
        if (result.summary) {
          console.log('📋 Preparing transaction summary:', result.summary)
          setTransactionSummary(result.summary)
          setTransactionStage(result.stage || 'agreement')
          
          // Auto-send summary if AI provides it
          if (result.autoSendSummary) {
            const summaryText = `📋 Transaction Summary:\n${Object.entries(result.summary)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}`
            
            // Send the summary message automatically
            sendMessageWithText(summaryText)
          }
        }
      } else {
        console.log('❌ No suggestions received from AI')
      }
    } catch (error) {
      console.error('❌ Error generating contextual suggestions:', error)
    }
  }

  // Use an AI suggestion
  const useSuggestion = async (suggestion) => {
    try {
      console.log('🔍 DEBUG: Using AI suggestion:', suggestion)
      
      // Clear suggestions when user uses one
      setAiSuggestions([])
      setShowSuggestions(false)
      
      // Send the suggestion as a message using sendMessageWithText
      console.log('🔍 DEBUG: Calling sendMessageWithText with:', suggestion)
      await sendMessageWithText(suggestion)
      
      // After sending, trigger new suggestions based on the updated conversation
      setTimeout(() => {
        const updatedMessages = [...chatMessages, {
          text: suggestion,
          senderId: user.uid,
          createdAt: new Date()
        }]
        triggerAISuggestions(updatedMessages)
      }, 1000)
    } catch (error) {
      console.error('🔍 DEBUG: Error using suggestion:', error)
    }
  }

  // Extract request status and listing name from chat messages
  useEffect(() => {
    if (!chatMessages.length) {
      setRequestStatus(null)
      setListingName(null)
      return
    }

    // Find the listing request message
    const listingRequestMessage = chatMessages.find(msg => msg.isListingRequest)
    if (listingRequestMessage) {
      const newStatus = listingRequestMessage.requestStatus || 'pending'
      const newListingName = listingRequestMessage.listingName || 'product'
      
      console.log('📋 Found listing request:', {
        status: newStatus,
        listingName: newListingName,
        previousStatus: requestStatus
      })
      
      setRequestStatus(newStatus)
      setListingName(newListingName)
      
      // CRITICAL FIX: Reset stage ONLY for the current chat, not all chats
      const currentChatId = selectedChat?.id
      if (currentChatId) {
        setChatTransactionStates(prev => ({
          ...prev,
          [currentChatId]: {
            ...prev[currentChatId],
            stage: newStatus === 'approved' ? '1' : 'initial'
          }
        }))
      }
    } else {
      setRequestStatus(null)
      setListingName(null)
    }
  }, [chatMessages, selectedChat?.id])

  // Auto-generate AI suggestions when other user replies
  useEffect(() => {
    if (requestStatus === 'approved' && userRole && listingName && chatMessages.length > 0) {
      // Get the last message
      const lastMessage = chatMessages[chatMessages.length - 1]
      
      // Check if the last message is from the OTHER user ( not current user)
      if (lastMessage && lastMessage.senderId !== user?.uid) {
        console.log('🤖 Other user replied, triggering AI suggestions')
        generateContextualSuggestions()
      }
    }
  }, [chatMessages.length, requestStatus, userRole, listingName, user?.uid])

  // Close AI suggestions when current user sends a message or clicks suggestion
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1]
      
      // If last message is from current user, close suggestions and wait for reply
      if (lastMessage && lastMessage.senderId === user?.uid) {
        setShowSuggestions(false)
      }
    }
  }, [chatMessages.length, user?.uid])

  // Generate AI suggestions when other user replies (intelligent flow)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1]
      const isOtherUserReply = lastMessage.senderId !== user?.uid
      
      console.log('🤖 Dashboard Intelligent AI Flow Analysis:', { 
        messageCount: chatMessages.length,
        requestStatus, 
        userRole, 
        isOtherUserReply,
        lastMessageSender: lastMessage?.senderId === user?.uid ? 'current user' : 'other user'
      })
      
      // Only trigger suggestions when OTHER user replies and there's an approved request
      if (isOtherUserReply && requestStatus === 'approved' && userRole && listingName) {
        console.log('🤖 Conditions met: Other user replied with approved request')
        generateContextualSuggestions()
      }
    }
  }, [chatMessages.length, requestStatus, userRole, listingName]) // Remove waitingForReply dependency

  // Check if there's already an unanswered transaction completion message
  const hasUnansweredTransactionCompletion = (messages) => {
    return false // Always return false since we're not sending transaction messages anymore
  }

  // Check if transaction completion is on cooldown
  const isTransactionOnCooldown = (chatId) => {
    const cooldownData = transactionCooldown[chatId]
    if (!cooldownData) return false
    
    const now = new Date()
    const lastPromptTime = cooldownData.lastPromptTime?.toDate ? cooldownData.lastPromptTime.toDate() : new Date(cooldownData.lastPromptTime)
    const timeDiff = now - lastPromptTime
    const cooldownPeriod = 5 * 60 * 1000 // 5 minutes in milliseconds
    
    return timeDiff < cooldownPeriod
  }

  // Cooldown countdown timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdown = {}
      
      Object.keys(transactionCooldown).forEach(chatId => {
        const cooldownData = transactionCooldown[chatId]
        if (cooldownData?.lastPromptTime) {
          const now = new Date()
          const lastPromptTime = cooldownData.lastPromptTime.toDate ? cooldownData.lastPromptTime.toDate() : new Date(cooldownData.lastPromptTime)
          const timeDiff = now - lastPromptTime
          const cooldownPeriod = 5 * 60 * 1000 // 5 minutes
          const remaining = cooldownPeriod - timeDiff
          
          if (remaining > 0) {
            const minutes = Math.floor(remaining / 60000)
            const seconds = Math.floor((remaining % 60000) / 1000)
            newCountdown[chatId] = `${minutes}:${seconds.toString().padStart(2, '0')}`
          } else {
            newCountdown[chatId] = null
          }
        }
      })
      
      setCooldownCountdown(newCountdown)
    }, 1000) // Update every second
    
    return () => clearInterval(interval)
  }, [transactionCooldown])

  // Detect transaction completion keywords in message
  const detectTransactionCompletion = (messageText) => {
    if (!messageText) return false
    
    const completionKeywords = {
      english: [
        'thank you for your purchase',
        'thank you for buying',
        'transaction complete',
        'purchase complete',
        'order complete',
        'payment complete',
        'done deal',
        'finalized purchase'
      ],
      tagalog: [
        'salamat sa pagbili',
        'salamat sa pagbili mo',
        'tapos na ang transaksyon',
        'kumpleto na ang bayad',
        'natapos na ang deal',
        'salamat sa pagbili'
      ],
      cebuano: [
        'salamat sa pagpamalit',
        'salamat sa pagpalit',
        'human na ang transaksyon',
        'kumpleto na ang bayad',
        'human na ang deal',
        'salamat sa pagpamalit'
      ]
    }
    
    const textLower = messageText.toLowerCase()
    
    // Check all language keywords
    for (const language of Object.values(completionKeywords)) {
      for (const keyword of language) {
        if (textLower.includes(keyword)) {
          return true
        }
      }
    }
    
    return false
  }

  // Send transaction completion confirmation (with comprehensive debugging)
  const sendTransactionCompletionConfirmation = async () => {
    console.log('🚨 DEBUG: sendTransactionCompletionConfirmation STARTED')
    console.log('🚨 DEBUG: Current selectedChat before:', selectedChat ? selectedChat.id : 'none')
    
    if (!selectedChat || !user || !db) return
    
    const chatId = selectedChat.id
    
    console.log('🚨 DEBUG: Processing transaction for chat:', chatId)
    
    // Check cooldown using local state only
    if (isTransactionOnCooldown(chatId)) {
      const remainingMinutes = getCooldownRemaining(chatId)
      alert(`Please wait ${remainingMinutes} minutes before triggering this again.`)
      return
    }
    
    try {
      console.log('🚨 DEBUG: About to update Firestore document')
      
      // Create popup data for Firestore
      const popupData = {
        popupId: Date.now().toString(),
        message: 'Done transaction?',
        triggeredBy: user.uid,
        responses: {},
        createdAt: serverTimestamp()
      }
      
      // Update chat document to trigger popup for other user and set transaction status
      await updateDoc(doc(db, 'chats', chatId), {
        pendingTransactionPopup: popupData,
        transactionStatus: 'confirming',
        transactionStatusTime: serverTimestamp(),
        transactionCooldown: serverTimestamp()
      })
      
      console.log('🚨 DEBUG: Firestore document updated successfully')
      
      // Update local cooldown state
      setTransactionCooldown(prev => ({
        ...prev,
        [chatId]: { lastPromptTime: serverTimestamp() }
      }))
      
      console.log('🚨 DEBUG: About to show popup for current user')
      
      // Show popup immediately for current user
      setPendingTransactionPopup(popupData)
      setCurrentPopupChatId(chatId)
      
      // Store in localStorage to prevent showing again
      localStorage.setItem(`shownTransactionPopup_${chatId}_${user.uid}`, 'true')
      
      console.log('🚨 DEBUG: Transaction popup triggered, selectedChat still:', selectedChat ? selectedChat.id : 'none')
    } catch (error) {
      console.error('Error triggering transaction popup:', error)
    }
  }

  // Cancel transaction completion ( simply close modal)
  const cancelTransactionCompletion = () => {
    setShowTransactionModal(false)
  }

  // Handle report button click
  const handleReportClick = () => {
    alert('Coming soon')
  }

  // Handle response to transaction popup (user messages with proper cleanup)
  const handleTransactionPopupResponse = async (response) => {
    if (!pendingTransactionPopup || !selectedChat || !user || !db) return
    
    console.log('🔄 Handling transaction popup response:', response)
    
    try {
      const chatId = selectedChat.id
      
      // Send normal user message based on response
      let responseText = ''
      if (response === 'yes') {
        responseText = 'Yes, the transaction is done.'
      } else {
        responseText = 'No, the transaction is not done yet.'
      }
      
      const userMessage = {
        senderId: user.uid,
        senderName: user.firstName || 'User',
        text: responseText,
        isTransactionResponse: true,
        response: response,
        createdAt: serverTimestamp(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', chatId, 'messages'), userMessage)
      
      // Track user response in popup instead of clearing it immediately
      const updatedPopup = {
        ...pendingTransactionPopup,
        responses: {
          ...pendingTransactionPopup.responses,
          [user.uid]: {
            response: response,
            timestamp: serverTimestamp(),
            userName: user.firstName || 'User'
          }
        }
      }
      
      // Check if both users have responded
      const responses = updatedPopup.responses || {}
      const participantIds = Object.keys(responses)
      
      if (participantIds.length === 2) {
        // Both users responded - check if both said yes
        const bothSaidYes = Object.values(responses).every(r => r.response === 'yes')
        
        if (bothSaidYes) {
          console.log('✅ Both users said yes - transaction completed')
        }
        
        // Clear the popup and transaction status
        await updateDoc(doc(db, 'chats', chatId), {
          pendingTransactionPopup: null,
          transactionStatus: null,
          transactionStatusTime: null
        })
        console.log('✅ Transaction completed - both users responded, popup and status cleared')
      } else {
        // Only one user responded - update popup with response but keep it visible
        await updateDoc(doc(db, 'chats', chatId), {
          pendingTransactionPopup: updatedPopup
        })
        console.log(`✅ Response recorded: ${response} - waiting for other user`)
      }
      
      // Clear local popup state for current user (they already responded)
      setPendingTransactionPopup(null)
      setCurrentPopupChatId(null)
      
    } catch (error) {
      console.error('Error handling transaction popup response:', error)
      // Restore popup state on error
      setPendingTransactionPopup(pendingTransactionPopup)
      setCurrentPopupChatId(selectedChat.id)
    }
  }

  // Open rating modal for the other user
  const openRatingModal = () => {
    if (!selectedChat) return
    
    // Set the other user as the one to rate
    const otherUserId = selectedChat.participants?.find(id => id !== user.uid)
    setRatingUser(otherUserId)
    setSelectedRating(0)
    setHoveredStar(0)
    setShowRatingModal(true)
  }

  // Submit user rating
  const submitRating = async () => {
    if (!ratingUser || selectedRating === 0 || !user || !db) return
    
    setSubmittingRating(true)
    
    try {
      // Get the user being rated
      const userToRateRef = doc(db, 'Users', ratingUser)
      const userToRateDoc = await getDoc(userToRateRef)
      
      if (!userToRateDoc.exists()) {
        throw new Error('User to rate not found')
      }
      
      const userData = userToRateDoc.data()
      const existingRatings = userData.ratings || []
      
      // Check if user has already rated this person in this transaction
      const hasAlreadyRated = existingRatings.some(rating => 
        rating.ratedBy === user.uid && 
        rating.chatId === selectedChat.id
      )
      
      if (hasAlreadyRated) {
        alert('You have already rated this user for this transaction.')
        setSubmittingRating(false)
        return
      }
      
      // Add new rating
      const newRating = {
        rating: selectedRating,
        ratedBy: user.uid,
        ratedAt: new Date().toISOString(), // Use client-side timestamp instead of serverTimestamp()
        chatId: selectedChat.id
      }
      
      const updatedRatings = [...existingRatings, newRating]
      
      // Calculate average rating
      const totalRating = updatedRatings.reduce((sum, r) => sum + r.rating, 0)
      const averageRating = totalRating / updatedRatings.length
      
      console.log('📊 Rating Calculation:', {
        newRating: selectedRating,
        existingRatings: existingRatings.length,
        totalRatings: updatedRatings.length,
        totalRating: totalRating,
        averageRating: averageRating.toFixed(2)
      })
      
      // Update user document with new rating and average
      await updateDoc(userToRateRef, {
        ratings: updatedRatings,
        averageRating: averageRating,
        totalRatings: updatedRatings.length
      })
      
      console.log('✅ Rating saved to user profile successfully')
      
      // Update current user's rating completion status
      setUserHasRated(true)
      
      // Send rating confirmation from actual user (not system)
      const ratingMessage = {
        senderId: user.uid,
        senderName: user.firstName || 'User',
        text: `⭐ I rated ${selectedChat.otherUserName} with ${selectedRating} star${selectedRating > 1 ? 's' : ''}. Thank you for the transaction!`,
        isRatingConfirmation: true,
        createdAt: serverTimestamp(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), ratingMessage)
      
      setShowRatingModal(false)
      setRatingUser(null)
      setSelectedRating(0)
      
      console.log('Rating submitted successfully')
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Failed to submit rating. Please try again.')
    } finally {
      setSubmittingRating(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
  }

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation => {
    const searchLower = searchQuery.toLowerCase()
    const userNameMatch = conversation.otherUserName?.toLowerCase().includes(searchLower)
    const listingNameMatch = conversation.listingName?.toLowerCase().includes(searchLower)
    return userNameMatch || listingNameMatch
  })

  // Load conversations with real-time listener
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered')
    console.log('🔍 DEBUG: auth:', !!auth)
    console.log('🔍 DEBUG: db:', !!db)
    console.log('🔍 DEBUG: user:', user)
    console.log('🔍 DEBUG: userRole:', userRole)
    
    if (!auth || !db || !user || !userRole) {
      console.log('🔍 DEBUG: Missing required props, returning early')
      return
    }

    console.log('🔍 DEBUG: All props available, calling loadConversations...')
    const unsubscribe = loadConversations()
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user, userRole])

  // Load cooldown data and monitor pending popups when selected chat changes
  useEffect(() => {
    if (!selectedChat || !db) return
    
    console.log('🔍 DEBUG: Selected chat changed to:', selectedChat.id)
    
    // Only clear popup state if switching to a different chat
    if (currentPopupChatId !== selectedChat.id) {
      console.log('🔍 DEBUG: Clearing popup state - different chat')
      setPendingTransactionPopup(null)
      setCurrentPopupChatId(null)
    }
    
    const loadChatData = async () => {
      try {
        // Load cooldown data
        const chatDoc = await getDoc(doc(db, 'chats', selectedChat.id))
        if (chatDoc.exists()) {
          const chatData = chatDoc.data()
          console.log('🔍 DEBUG: Selected chat data loaded:', {
            chatId: selectedChat.id,
            hasPopup: !!chatData.pendingTransactionPopup,
            popupData: chatData.pendingTransactionPopup
          })
          
          if (chatData.transactionCooldown) {
            setTransactionCooldown(prev => ({
              ...prev,
              [selectedChat.id]: chatData.transactionCooldown
            }))
          }
          
          // Check for pending popup in THIS specific chat
          if (chatData.pendingTransactionPopup) {
            const popup = chatData.pendingTransactionPopup
            
            // Check if current user has already responded
            const hasResponded = popup.responses && popup.responses[user.uid]
            
            console.log('🔍 DEBUG: Selected chat popup check:', {
              popupId: popup.popupId,
              triggeredBy: popup.triggeredBy,
              currentUser: user.uid,
              hasResponded,
              responses: popup.responses,
              shouldShow: !hasResponded
            })
            
            // Only show popup if user hasn't responded yet
            if (!hasResponded) {
              console.log('🎯 WEB CHAT: SHOWING POPUP in selected chat!')
              setPendingTransactionPopup(popup)
              setCurrentPopupChatId(selectedChat.id)
            } else {
              console.log('🔍 DEBUG: Popup not shown in selected chat - user already responded')
              setPendingTransactionPopup(null)
              setCurrentPopupChatId(null)
            }
          } else {
            console.log('🔍 DEBUG: No pending popup in selected chat')
            setPendingTransactionPopup(null)
            setCurrentPopupChatId(null)
          }
        }
      } catch (error) {
        console.error('Error loading chat data:', error)
      }
    }
    
    loadChatData()
    
    // Set up real-time listener for popup changes in THIS specific chat only
    const unsubscribe = onSnapshot(doc(db, 'chats', selectedChat.id), (doc) => {
      if (doc.exists()) {
        const chatData = doc.data()
        
        // Monitor popup changes - only show if user is in this specific chat
        if (chatData.pendingTransactionPopup) {
          const popup = chatData.pendingTransactionPopup
          const hasResponded = popup.responses && popup.responses[user.uid]
          
          // Only show popup if user hasn't responded AND is currently in this chat
          if (!hasResponded) {
            setPendingTransactionPopup(popup)
            setCurrentPopupChatId(selectedChat.id)
          } else {
            setPendingTransactionPopup(null)
            setCurrentPopupChatId(null)
          }
        } else {
          setPendingTransactionPopup(null)
          setCurrentPopupChatId(null)
        }
      }
    })
    
    return () => {
      if (unsubscribe) unsubscribe()
      // Clear popup when leaving this chat
      setPendingTransactionPopup(null)
      setCurrentPopupChatId(null)
    }
  }, [selectedChat?.id, db, user.uid])

  // Load conversations with real-time listener - wrapped in useCallback to prevent stale closures
  const loadConversations = useCallback(() => {
    if (!user || !db || !userRole) return

    console.log('🔍 WEB CHAT: Loading conversations for user role:', userRole)
    console.log('🔍 DEBUG: loadConversations called, ref instances:', {
      messageListeners: !!messageListeners.current,
      chatDocumentListeners: !!chatDocumentListeners.current
    })

    // Set up real-time listener for chats (without orderBy to avoid index requirement)
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    
    const conversationsMap = new Map() // Use Map to prevent duplicate conversations
    
    const unsubscribe = onSnapshot(chatsQuery, (chatsSnapshot) => {
      console.log('🔄 WEB CHAT: Received chats snapshot with', chatsSnapshot.size, 'documents')
      
      chatsSnapshot.docs.forEach(chatDoc => {
        const chatId = chatDoc.id
        const chatData = chatDoc.data()
        
        console.log('📝 WEB CHAT: Processing chat:', chatId, chatData)
        
        // Defensive null checks for required fields
        if (!chatData.participants || !Array.isArray(chatData.participants)) {
          console.warn('⚠️ WEB CHAT: Skipping chat with invalid participants:', chatId)
          return
        }
        
        // Find the other user ID (not the current user)
        const otherUserId = chatData.participants.find(id => id !== user.uid)
        
        if (!otherUserId) {
          console.warn('⚠️ WEB CHAT: Skipping chat with no other user:', chatId)
          return
        }
        
        // Get other user details with fallbacks
        const otherUserName = chatData.otherUserName || chatData[`${otherUserId}_name`] || 'Unknown User'
        const otherUserEmail = chatData.otherUserEmail || chatData[`${otherUserId}_email`] || 'unknown@example.com'
        const listingName = chatData.listingName || ''
        
        console.log('👤 WEB CHAT: Other user details:', { otherUserId, otherUserName, otherUserEmail })
        
        // ROLE-BASED FILTERING: matching mobile app logic exactly
        const currentUserRoleInChat = chatData.participantRoles?.[user.uid]
        
        // Skip chats where current user doesn't have the expected role
        if (currentUserRoleInChat !== userRole) {
          console.log('⚠️ WEB CHAT: Skipping chat - user role mismatch. Expected:', userRole, 'Got:', currentUserRoleInChat)
          return
        }
        
        // Initialize conversation in map first (prevents duplicates)
        // Get user data directly from Firestore chat document
        const conversationData = {
          id: chatId,
          otherUserId,
          otherUserName: chatData.participantNames?.[otherUserId] || chatData.otherUserName || otherUserName,
          otherUserEmail: chatData.participantEmails?.[otherUserId] || chatData.otherUserEmail || otherUserEmail,
          lastMessage: chatData.lastMessage || '',
          lastMessageTime: chatData.lastMessageTime,
          lastMessageSenderId: chatData.lastMessageSenderId,
          listingName,
          chatId: chatData.chatId || chatId,
          transactionStatus: chatData.transactionStatus,
          transactionStatusTime: chatData.transactionStatusTime
        }
        
        console.log('🔍 DEBUG: Conversation data from Firestore:', {
          chatId,
          participantNames: chatData.participantNames,
          participantEmails: chatData.participantEmails,
          otherUserId,
          finalName: conversationData.otherUserName,
          finalEmail: conversationData.otherUserEmail,
          transactionStatus: conversationData.transactionStatus,
          transactionStatusTime: conversationData.transactionStatusTime
        })
        
        conversationsMap.set(chatId, conversationData)
        
        // Set up message listener for this chat (the chatId from the chat document itself)
        const messageChatId = chatData.chatId || chatId
        
        // Clean up existing listeners if any - with comprehensive defensive checks
        try {
          if (messageListeners.current && typeof messageListeners.current.has === 'function' && messageListeners.current.has(messageChatId)) {
            const unsubscribe = messageListeners.current.get(messageChatId)
            if (typeof unsubscribe === 'function') {
              unsubscribe()
            }
            messageListeners.current.delete(messageChatId)
          }
          if (chatDocumentListeners.current && typeof chatDocumentListeners.current.has === 'function' && chatDocumentListeners.current.has(chatId)) {
            const unsubscribe = chatDocumentListeners.current.get(chatId)
            if (typeof unsubscribe === 'function') {
              unsubscribe()
            }
            chatDocumentListeners.current.delete(chatId)
          }
        } catch (error) {
          console.warn('⚠️ WEB CHAT: Error during listener cleanup:', error)
        }
        
        // Set up chat document listener to detect popup changes
        const chatDocUnsubscribe = onSnapshot(doc(db, 'chats', chatId), (chatDocSnapshot) => {
          const chatDocData = chatDocSnapshot.data()
          console.log('🔥 WEB CHAT: Chat document updated for:', chatId)
          console.log('🔥 DEBUG: Current user:', user.uid, 'Popup data:', chatDocData.pendingTransactionPopup)
          
          // Check for pending transaction popup and show to other user
          if (chatDocData.pendingTransactionPopup) {
            const popup = chatDocData.pendingTransactionPopup
            
            // Check if current user has already responded
            const hasResponded = popup.responses && popup.responses[user.uid]
            
            console.log('🔥 DEBUG: Popup check in chat document listener:', {
              popupId: popup.popupId,
              triggeredBy: popup.triggeredBy,
              currentUser: user.uid,
              hasResponded,
              responses: popup.responses,
              shouldShow: !hasResponded && popup.triggeredBy !== user.uid,
              currentPopupChatId,
              selectedChatId: selectedChat?.id
            })
            
            // Show popup only if user hasn't responded yet AND didn't trigger it
            if (!hasResponded && popup.triggeredBy !== user.uid) {
              console.log('🎯 WEB CHAT: SHOWING POPUP to other user!')
              setPendingTransactionPopup(popup)
              setCurrentPopupChatId(chatId)
            } else {
              console.log('🔥 DEBUG: Popup not shown - user already responded or triggered it')
              // Clear popup state if user has already responded
              if (hasResponded) {
                setPendingTransactionPopup(null)
                setCurrentPopupChatId(null)
              }
            }
          }
          
          // Update cooldown state from Firestore
          if (chatDocData.transactionCooldown) {
            setTransactionCooldown(prev => ({
              ...prev,
              [chatId]: chatDocData.transactionCooldown
            }))
          }
        })
        
        chatDocumentListeners.current.set(chatId, chatDocUnsubscribe)
        
        // Set up new message listener
        const messageUnsubscribe = onSnapshot(
          query(collection(db, 'chats', messageChatId, 'messages'), orderBy('createdAt', 'asc')),
          (messagesSnapshot) => {
            console.log('💬 WEB CHAT: Messages updated for chat:', messageChatId, 'Count:', messagesSnapshot.size)
            
            const messages = messagesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            
            // Calculate unread count (only count messages from OTHER users)
            const unreadCount = messages.filter(msg => 
              msg.senderId !== user.uid && !msg.read
            ).length
            
            // Get the actual last message
            const actualLastMessage = messages[messages.length - 1]
            const actualLastMessageTime = actualLastMessage?.createdAt
            const actualLastMessageSenderId = actualLastMessage?.senderId
            const isLastMessageFromOther = actualLastMessageSenderId !== user.uid
            
            // Format last message text for chat list
            let lastMessageText = ''
            
            if (actualLastMessage?.imageUrl && !actualLastMessage?.text) {
              // Image-only message
              if (actualLastMessageSenderId === user.uid) {
                lastMessageText = 'You sent an image'
              } else {
                lastMessageText = `${actualLastMessage.senderName || 'Someone'} sent you an image`
              }
            } else if (actualLastMessage?.text) {
              // Text message (or text + image)
              lastMessageText = actualLastMessage.text
            } else if (actualLastMessage?.imageUrl && actualLastMessage?.text) {
              // Text + image message - show text with image indicator
              lastMessageText = actualLastMessage.text
            }
            
            // Update conversation in map (include unread count)
            const existingConversation = conversationsMap.get(chatId)
            const updatedConversation = {
              id: chatId,
              otherUserId,
              otherUserName: chatData.participantNames?.[otherUserId] || chatData.otherUserName || otherUserName,
              otherUserEmail: chatData.participantEmails?.[otherUserId] || chatData.otherUserEmail || otherUserEmail,
              lastMessage: lastMessageText,
              lastMessageTime: actualLastMessageTime,
              lastMessageSenderId: actualLastMessageSenderId,
              unreadCount: isLastMessageFromOther ? unreadCount : (existingConversation?.unreadCount || 0),
              isLastMessageFromOther,
              listingName: chatData.listingName || listingName,
              chatId: messageChatId,
              transactionStatus: existingConversation?.transactionStatus || chatData.transactionStatus,
              transactionStatusTime: existingConversation?.transactionStatusTime || chatData.transactionStatusTime
            }
            
            console.log('🔍 DEBUG: Message listener update with unread count:', {
              chatId,
              totalMessages: messages.length,
              unreadMessages: unreadCount,
              existingUnread: existingConversation?.unreadCount,
              finalUnread: updatedConversation.unreadCount,
              isLastMessageFromOther,
              lastMessageIsSystem: actualLastMessage?.senderId === 'system',
              transactionStatus: updatedConversation.transactionStatus,
              transactionStatusTime: updatedConversation.transactionStatusTime,
              chatDataTransactionStatus: chatData.transactionStatus,
              existingTransactionStatus: existingConversation?.transactionStatus
            })
            
            conversationsMap.set(chatId, updatedConversation)
            
            // REMOVED: Duplicate popup detection logic - handled by chat document listener
            console.log('Chat update processed for:', chatId, '- Auto-opening disabled')
            
            // Update conversations state from map (guaranteed no duplicates)
            const uniqueConversations = Array.from(conversationsMap.values())
            const sortedConversations = uniqueConversations.sort((a, b) => {
              // Sort by transaction status time first (moves confirming chats to top), then last message time
              const timeA = a.transactionStatusTime ? (a.transactionStatusTime.toDate ? a.transactionStatusTime.toDate() : new Date(a.transactionStatusTime)) : (a.lastMessageTime ? (a.lastMessageTime.toDate ? a.lastMessageTime.toDate() : new Date(a.lastMessageTime)) : new Date(0))
              const timeB = b.transactionStatusTime ? (b.transactionStatusTime.toDate ? b.transactionStatusTime.toDate() : new Date(b.transactionStatusTime)) : (b.lastMessageTime ? (b.lastMessageTime.toDate ? b.lastMessageTime.toDate() : new Date(b.lastMessageTime)) : new Date(0))
              
              return timeB - timeA
            })
            
            setConversations(sortedConversations)
            const totalUnread = sortedConversations.filter(conv => conv.unreadCount > 0).length
            setUnreadChats(totalUnread)
            
            // Notify parent component about unread count change
            if (onUnreadChatsUpdate) {
              onUnreadChatsUpdate(totalUnread)
            }
          }
        )
        
        // Store the message unsubscribe function
        messageListeners.current.set(messageChatId, messageUnsubscribe)
      })
      
      // Set initial conversations from map (no duplicates possible)
      const initialConversations = Array.from(conversationsMap.values())
      setConversations(initialConversations)
    })
    
    // Return cleanup function that removes all message listeners
    return () => {
      console.log('🧹 WEB CHAT: Cleaning up all message listeners')
      messageListeners.current?.forEach(unsubscribe => unsubscribe())
      messageListeners.current?.clear()
      chatDocumentListeners.current?.forEach(unsubscribe => unsubscribe())
      chatDocumentListeners.current?.clear()
    }
  }, [user, db, userRole])

  // Load messages for selected chat with real-time listener
  const loadChatMessages = (chatId) => {
    if (!chatId || !db) return null
    
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    
    const unsubscribe = onSnapshot(messagesQuery, (messagesSnapshot) => {
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      setChatMessages(messages)
      
      // Check if transaction has been completed (both users said yes)
      // Updated logic: count "Yes, the transaction is done." messages instead of relying on system message
      const yesTransactionMessages = messages.filter(msg => 
        msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
      )
      const isTransactionCompletedByYesCount = yesTransactionMessages.length >= 2
      
      // Also check for legacy system message with isTransactionDone flag
      const completedTransactionMessage = messages.find(msg => 
        msg.isTransactionDone && 
        msg.showRateButton &&
        msg.senderId === 'system'
      )
      
      setHasTransactionCompleted(!!completedTransactionMessage || isTransactionCompletedByYesCount)
      
      // Check if current user has already rated the other user for this transaction
      if (isTransactionCompletedByYesCount && user && selectedChat) {
        const checkUserRating = async () => {
          try {
            const otherUserRef = doc(db, 'Users', selectedChat.otherUserId)
            const otherUserDoc = await getDoc(otherUserRef)
            
            if (otherUserDoc.exists()) {
              const otherUserData = otherUserDoc.data()
              const existingRatings = otherUserData.ratings || []
              const currentUserRating = existingRatings.find(rating => 
                rating.ratedBy === user.uid && 
                rating.chatId === selectedChat.id
              )
              setUserHasRated(!!currentUserRating)
            }
          } catch (error) {
            console.error('Error checking user rating status:', error)
          }
        }
        
        checkUserRating()
      }
      
      // Trigger AI suggestions when new message arrives from other user
      // Disable AI suggestions if transaction is in progress or completed
      const lastMessage = messages[messages.length - 1]
      if (lastMessage && lastMessage.senderId !== user?.uid) {
        // Check if transaction is in progress or completed before triggering AI
        const isInTransaction = messages.some(msg => 
          msg.isTransactionResponse || 
          msg.isTransactionDone ||
          selectedChat?.transactionStatus === 'confirming'
        )
        
        // Simple check: if there are 2+ "Yes, the transaction is done." messages, disable AI permanently
        const yesTransactionMessages = messages.filter(msg => 
          msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
        )
        const isTransactionCompletedByYesCount = yesTransactionMessages.length >= 2
        
        const isTransactionCompleted = hasTransactionCompleted || isTransactionCompletedByYesCount
        
        console.log('🤖 AI Suggestions Debug:', {
          isInTransaction,
          isTransactionCompleted,
          isTransactionCompletedByYesCount,
          yesMessageCount: yesTransactionMessages.length,
          hasTransactionCompleted,
          shouldTriggerAI: !isInTransaction && !isTransactionCompleted
        })
        
        if (!isInTransaction && !isTransactionCompleted) {
          triggerAISuggestions(messages)
        }
        
        // Check for transaction completion keywords in the last message
        if (detectTransactionCompletion(lastMessage.text) && !hasUnansweredTransactionCompletion(messages)) {
          console.log('🔍 Transaction completion keyword detected, sending confirmation')
          setTimeout(() => {
            sendTransactionCompletionConfirmation()
          }, 1000) // Small delay to avoid immediate spam
        }
      }
      
      // Auto-scroll to bottom when new messages arrive (instant, no animation)
      setTimeout(() => {
        const messagesContainer = document.querySelector(`.${styles.chatMessagesContainer}`)
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 100)
    })
    
    return unsubscribe
  }

  // Manage real-time message listener for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([])
      return
    }

    // Use chatId if available, otherwise fallback to id
    const chatIdToUse = selectedChat.chatId || selectedChat.id

    const unsubscribe = loadChatMessages(chatIdToUse)
    
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [selectedChat?.id, selectedChat?.chatId])

  // Send a new message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedChat || !user || !db) return
    
    const messageText = newMessage.trim()
    setNewMessage('')
    
    setDeliveredMessageId(null)
    setShowSuggestions(false)
    setAiSuggestions([])
    
    // Use chatId if available, otherwise fallback to id
    const chatIdToUse = selectedChat.chatId || selectedChat.id
    
    const hasApprovedRequest = chatMessages.some(msg => 
      msg.isListingRequest && msg.requestStatus === 'approved'
    )
    
    const isListingOwner = userRole === 'livestock_owner'
    const canChat = hasApprovedRequest
    
    if (!canChat) {
      console.log('❌ Cannot send message - no approved request')
      alert(isListingOwner 
        ? '💬 Chat will be available after you approve the request. Use the Accept/Decline buttons above.'
        : '💬 Chat will be available after the listing owner approves your request'
      )
      return
    }
    
    setSendingMessageId('sending')
    
    try {
      let imageUrl = null
      
      // Upload image if present
      if (selectedImage) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadImageToFirebase(selectedImage)
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError)
          alert('Failed to upload image. Please try again.')
          setUploadingImage(false)
          setSendingMessageId(null)
          return
        }
        setUploadingImage(false)
        clearImageSelection()
      }
      
      // Split into separate messages if both image and text exist
      if (imageUrl && messageText) {
        // Send image message first
        const imageMessageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: '',
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const imageDocRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), imageMessageData)
        
        // Send text message immediately after
        const textMessageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: messageText,
          imageUrl: null,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const textDocRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), textMessageData)
        
        setSendingMessageId(null)
        setDeliveredMessageId(textDocRef.id)
        
      } else {
        // Send single message (image-only or text-only)
        const messageData = {
          senderId: user.uid,
          senderName: user.firstName || 'User',
          text: messageText,
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
          read: false
        }
        
        const docRef = await addDoc(collection(db, 'chats', chatIdToUse, 'messages'), messageData)
        
        setSendingMessageId(null)
        setDeliveredMessageId(docRef.id)
      }
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setSendingMessageId(null)
      setUploadingImage(false)
      alert('Failed to send message. Please try again.')
    }
  }

  // Send message with pre-formatted text (for summary confirmation)
  const sendMessageWithText = async (messageText) => {
    if (!messageText.trim() || !selectedChat || !user || !db) return
    
    // Clear AI suggestions when user sends a message
    setAiSuggestions([])
    setShowSuggestions(false)
    
    try {
      const messageData = {
        senderId: user.uid,
        senderName: 'User',
        text: messageText.trim(),
        createdAt: serverTimestamp(),
        read: false
      }
      
      await addDoc(collection(db, 'chats', selectedChat.id, 'messages'), messageData)
      console.log('Summary confirmation message sent successfully')
    } catch (error) {
      console.error('Error sending summary confirmation message:', error)
    }
  }

  // Handle request response ( approve/decline)
  const handleRequestResponse = async (message, status) => {
    if (!message || !selectedChat || !db) return
    
    try {
      // Update the message status
      const chatId = selectedChat.id
      await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
        requestStatus: status
      })
      
      // Send a response message
      const responseText = status === 'approved' 
        ? '✅ Request approved! You can now chat freely.'
        : '❌ Request declined. Thank you for your interest.'
      
      await sendMessageWithText(responseText)
      
      // If approved, trigger AI suggestions
      if (status === 'approved') {
        setTimeout(() => {
          generateContextualSuggestions()
        }, 1000)
      }
      
      console.log(`Request ${status} successfully`)
    } catch (error) {
      console.error(`Error ${status}ing request:`, error)
    }
  }

  // Go back to conversations list
  const goBackToConversations = () => {
    // markAsReadTimeoutRef removed - no longer needed
    // if (markAsReadTimeoutRef.current) {
    //   clearTimeout(markAsReadTimeoutRef.current)
    // }
    logSetSelectedChat(null)
    setChatMessages([])
    setNewMessage('')
    setAiSuggestions([])
    setShowSuggestions(false)
    setShowSummary(false)
    setTransactionSummary(null)
  }

  // Mark messages as read when user opens chat (synchronous to fix race condition)
  const markMessagesAsRead = async (chatId) => {
    if (!chatId || !user || !db) return
    
    try {
      // Use simple query without compound index requirement
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        where('read', '==', false)
      )
      
      const querySnapshot = await getDocs(messagesQuery)
      
      if (querySnapshot.empty) {
        console.log('No unread messages to mark as read')
        return
      }
      
      // Filter for messages from other users (client-side filtering)
      const otherUserMessages = querySnapshot.docs.filter(doc => 
        doc.data().senderId !== user.uid
      )
      
      if (otherUserMessages.length === 0) {
        console.log('No unread messages from other users')
        return
      }
      
      // Mark all unread messages from other users as read
      const batch = writeBatch(db)
      otherUserMessages.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, { read: true })
      })
      
      await batch.commit()
      
      // Update chat document with last read timestamp
      await updateDoc(doc(db, 'chats', chatId), {
        [`lastReadBy.${user.uid}`]: serverTimestamp()
      })
      
      console.log(`Marked ${otherUserMessages.length} messages as read`)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  // Mark conversation as read
  const markConversationAsRead = async (conversationId) => {
    try {
      // Update the conversation in the conversations state
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
        
        // Recalculate total unread chats count
        const totalUnread = updatedConversations.reduce((total, conv) => 
          total + (conv.unreadCount > 0 ? 1 : 0), 0
        )
        setUnreadChats(totalUnread)
        
        // Notify parent component about unread count change
        if (onUnreadChatsUpdate) {
          onUnreadChatsUpdate(totalUnread)
        }
        
        return updatedConversations
      })
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }

  return (
    <>
      <div className={styles.chatDashboard}>
      {/* Chat List Panel */}
      <div className={styles.chatListPanel}>
        <div className={styles.chatListHeader}>
          <h1 className={styles.title}>Chats</h1>
        </div>
        <div className={styles.chatSearchBar}>
          <input
            type="text"
            placeholder="Search conversations..."
            className={styles.chatSearchInput}
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <svg className={styles.chatSearchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className={styles.conversationsList}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <div 
                key={conversation.id} 
                className={`${styles.conversationCard} ${selectedChat?.id === conversation.id ? styles.selected : ''} ${conversation.unreadCount > 0 ? styles.unread : ''}`}
                onClick={() => {
                  // Clear AI suggestions when switching conversations
                  setAiSuggestions([])
                  setShowSuggestions(false)
                  
                  logSetSelectedChat(conversation)
                  
                  // Mark messages as read when opening chat
                  markMessagesAsRead(conversation.id)
                  
                  if (conversation.unreadCount > 0) {
                    markConversationAsRead(conversation.id)
                  }
                }}
              >
                <div className={styles.conversationAvatar}>
                  {conversation.otherUserName ? conversation.otherUserName[0].toUpperCase() : 'U'}
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.conversationName}>
                      {formatChatListDisplayName(conversation.otherUserName, conversation.listingName)}
                    </span>
                    <div className={styles.conversationHeaderRight}>
                      {conversation.lastMessageTime && (
                        <span className={styles.conversationTime}>
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                      )}
                      {/* Red circle unread counter */}
                      {conversation.unreadCount > 0 && (
                        <div className={styles.unreadCounter}>
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.conversationPreview}>
                    <span className={styles.lastMessage}>
                      {conversation.transactionStatus === 'confirming' ? (
                        <span style={{ color: '#22c55e', fontWeight: '500' }}>
                          confirming transaction...
                        </span>
                      ) : (
                        conversation.lastMessage
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : searchQuery ? (
            <div className={styles.emptyChatState}>
              <svg className={styles.emptySearchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className={styles.emptyChatTitle}>No conversations found</h3>
              <p className={styles.emptyChatSubtitle}>Try searching with different keywords</p>
            </div>
          ) : (
            <div className={styles.emptyChatState}>
              <svg className={styles.emptyChatIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className={styles.emptyChatTitle}>No conversations yet</h3>
              <p className={styles.emptyChatSubtitle}>Start chatting by browsing listings and sending requests</p>
              <button 
                className={styles.browseListingsBtn}
                onClick={() => window.location.href = '/listings'}
              >
                Browse Listings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={styles.chatWindow}>
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <h3 className={styles.chatHeaderName}>{formatChatListDisplayName(selectedChat.otherUserName, selectedChat.listingName)}</h3>
              </div>
              <div className={styles.chatHeaderActions}>
                {/* Report Button - same size as Rate User button was */}
                <button 
                  className={styles.reportBtn}
                  onClick={handleReportClick}
                  title="Report this conversation"
                >
                  Report
                </button>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className={styles.chatMessagesArea}>
              {chatMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`${message.senderId === user?.uid ? styles.sentMessageWrapper : styles.receivedMessageWrapper}`}
                >
                  {/* For image-only messages (both sent and received), render completely outside messageBubble */}
                  {message.imageUrl && message.imageUrl !== 'pending' && !message.text && (
                    <img 
                      src={message.imageUrl} 
                      alt="Shared image" 
                      className={styles.standaloneMessageImage}
                      onClick={() => setFullscreenImage(message.imageUrl)}
                    />
                  )}
                  
                  {/* For messages with text or pending uploads, use messageBubble wrapper */}
                  {(message.text || message.imageUrl === 'pending') && (
                    <div className={`${styles.messageBubble} ${message.senderId === user?.uid ? styles.sent : styles.received}`}>
                      <div className={styles.messageContent}>
                        {/* Display text if present */}
                        {message.text && (
                          <p className={styles.messageText}>{message.text}</p>
                        )}
                        
                        {/* Display image if present alongside text */}
                        {message.imageUrl === 'pending' && (
                          <div className={styles.imageLoadingPlaceholder}>
                            <div className={styles.uploadingSpinner}>⏳</div>
                            <span>Uploading image...</span>
                          </div>
                        )}
                        
                        {message.imageUrl && message.imageUrl !== 'pending' && message.text && (
                          <img 
                            src={message.imageUrl} 
                            alt="Shared image" 
                            className={styles.messageImage}
                            onClick={() => setFullscreenImage(message.imageUrl)}
                          />
                        )}
                        
                        {/* Show placeholder if no text or image */}
                        {!message.text && !message.imageUrl && (
                          <p className={styles.messageText}>Empty message</p>
                        )}
                        
                        {/* Accept/Decline buttons for listing requests */}
                        {message.isListingRequest && message.senderId !== user?.uid && message.requestStatus === 'pending' && !message.isCancelled && (
                          <div className={styles.requestActions}>
                            <button 
                              className={styles.acceptButton}
                              onClick={() => handleRequestResponse(message, 'approved')}
                            >
                              Accept
                            </button>
                            <button 
                              className={styles.declineButton}
                              onClick={() => handleRequestResponse(message, 'declined')}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                        
                        {/* Rate user button for completed transactions */}
                        {message.showRateButton && message.isTransactionDone && (
                          <div className={styles.rateUserSection}>
                            <p className={styles.rateUserPrompt}>Both users responded yes to the done transaction?</p>
                            <button 
                              className={styles.rateUserBtn}
                              onClick={openRatingModal}
                            >
                              ⭐ Rate User
                            </button>
                          </div>
                        )}
                        
                        {/* Status indicator for processed requests */}
                        {message.isListingRequest && message.requestStatus && message.requestStatus !== 'pending' && (
                          <div className={styles.requestStatus}>
                            <span className={`${styles.statusBadge} ${styles[message.requestStatus]}`}>
                              {message.requestStatus.charAt(0).toUpperCase() + message.requestStatus.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Accept/Decline buttons for standalone images */}
                  {message.senderId !== user?.uid && message.imageUrl && message.imageUrl !== 'pending' && !message.text && message.isListingRequest && message.requestStatus === 'pending' && !message.isCancelled && (
                    <div className={styles.requestActions}>
                      <button 
                        className={styles.acceptButton}
                        onClick={() => handleRequestResponse(message, 'approved')}
                      >
                        Accept
                      </button>
                      <button 
                        className={styles.declineButton}
                        onClick={() => handleRequestResponse(message, 'declined')}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  
                  {/* Message time - positioned beside bubble on hover */}
                  {(message.text || message.imageUrl) && (
                    <div className={styles.messageTime}>
                      {formatChatTimestamp(message.createdAt)}
                    </div>
                  )}
                  
                  {/* Sending/Delivered status indicator - positioned below bubble */}
                  {message.senderId === user?.uid && (
                    <div className={styles.deliveredText}>
                      {sendingMessageId === 'sending' && chatMessages[chatMessages.length - 1]?.id === message.id && 'sending'}
                      {deliveredMessageId === message.id && 'delivered'}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Transaction Done Separator - moved outside messages loop for full width */}
              {(() => {
                // Find all transaction response messages
                const transactionYesMessages = chatMessages.filter((msg, index) => 
                  msg.text === 'Yes, the transaction is done.' && 
                  msg.isTransactionResponse
                )
                
                // Show separator only if there are "yes" messages
                const hasYesMessages = transactionYesMessages.length > 0
                
                return hasYesMessages ? (
                  <div className={styles.transactionDoneSeparator}></div>
                ) : null
              })()}

              {/* AI Suggestions Section - disabled when transaction is completed */}
              {(() => {
                // Check if transaction is completed using the same logic as message listener
                const yesTransactionMessages = chatMessages.filter(msg => 
                  msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
                )
                const isTransactionCompleted = yesTransactionMessages.length >= 2 || hasTransactionCompleted
                
                return aiSuggestions.length > 0 && showSuggestions && requestStatus === 'approved' && !isTransactionCompleted
              })() && (
                <div className={`${styles.aiSuggestionsContainer} ${!isSuggestionsOpen ? styles.collapsed : ''}`}>
                  {/* Collapsible Header */}
                  <div className={styles.aiSuggestionsHeader} onClick={toggleSuggestions}>
                    <div className={styles.aiSuggestionsTitle}>
                      <span className={styles.aiIcon}>🤖</span>
                      AI message suggestions
                    </div>
                    <button className={styles.toggleSuggestionsBtn}>
                      {isSuggestionsOpen ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {/* Collapsible Content */}
                  {isSuggestionsOpen && (
                    <div className={styles.aiSuggestionsList}>
                      {aiSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className={styles.suggestionBtn}
                          onClick={() => useSuggestion(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Summary */}
              {showSummary && transactionSummary && (
                <div className={styles.transactionSummaryContainer}>
                  <div className={styles.summaryHeader}>
                    <span>📋 Transaction Summary</span>
                    <button onClick={() => setShowSummary(false)}>×</button>
                  </div>
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryItem}>
                      <strong>Name:</strong> {transactionSummary.name}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Price:</strong> {transactionSummary.price}
                    </div>
                    <div className={styles.summaryItem}>
                      <strong>Payment:</strong> {transactionSummary.paymentMethod}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Auto-scroll ref element */}
              <div ref={messagesEndRef} />
              
              {/* White Container Rating Prompt - appears when transaction is completed and individual user hasn't rated yet */}
              {hasTransactionCompleted && !userHasRated && (
                <div className={styles.whiteRatingPromptContainer}>
                  <div className={styles.ratingPromptContent}>
                    <p className={styles.ratingPromptText}>
                      Rate {selectedChat.otherUserName || 'the other user'} for this transaction
                    </p>
                    <button 
                      className={styles.whiteRateUserBtn}
                      onClick={() => {
                        setRatingUser(selectedChat.otherUserId)
                        setShowRatingModal(true)
                      }}
                    >
                      ⭐ Rate Now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Area */}
            <div className={styles.chatInputArea}>
              {/* Image Preview - moved above input */}
              {imagePreview && (
                <div className={styles.imagePreviewContainer}>
                  <div className={styles.imagePreviewWrapper}>
                    <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                    <button onClick={clearImageSelection} className={styles.removeImageButton}>×</button>
                  </div>
                </div>
              )}
              
              {(() => {
                // Check if there's an approved request between these users
                const hasApprovedRequest = chatMessages.some(msg => 
                  msg.isListingRequest && msg.requestStatus === 'approved'
                )
                
                // Check if current user is the listing owner (can always chat)
                const isListingOwner = userRole === 'livestock_owner'
                
                // BOTH users must wait for approval - chat is disabled for everyone until approved
                const canChat = hasApprovedRequest
                
                if (!canChat) {
                  return (
                    <div className={styles.chatRestricted}>
                      <p className={styles.restrictedText}>
                        {isListingOwner 
                          ? '💬 Chat will be available after you approve the request. Use the Accept/Decline buttons above.'
                          : '💬 Chat will be available after the listing owner approves your request'
                        }
                      </p>
                    </div>
                  )
                }
                
                return (
                  <div className={styles.chatInputContainer}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <button 
                      className={styles.chatInputButton}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                    >
                      <img src="/assets/icons/add-image.png" alt="Add Image" width="20" height="20" />
                    </button>
                    <textarea
                      placeholder="Type a message..."
                      className={styles.chatInputField}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={1}
                    />
                    <button 
                      className={styles.chatSendButton}
                      onClick={sendMessage}
                      disabled={!newMessage.trim() && !selectedImage || uploadingImage}
                    >
                      {uploadingImage ? (
                        <div className={styles.uploadingSpinner}>⏳</div>
                      ) : (
                        <img src="/assets/icons/send.png" alt="Send" width="20" height="20" />
                      )}
                    </button>
                  </div>
                )
              })()}
            </div>
          </>
        ) : (
          <div className={styles.emptyChatState}>
            <svg className={styles.emptyChatIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className={styles.emptyChatTitle}>Select a conversation</h3>
            <p className={styles.emptyChatSubtitle}>Choose a chat from the list to start messaging</p>
          </div>
        )}
      </div>
    </div>
    
    {/* Persistent Transaction Popup - Only shows if user is in the correct chat */}
    {pendingTransactionPopup && currentPopupChatId === selectedChat?.id && (
      <div className={styles.mandatoryModalOverlay}>
        <div className={styles.mandatoryModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.mandatoryModalHeader}>
            <h3>⚠️ Transaction Completion</h3>
            <p className={styles.mandatoryModalSubtitle}>This confirmation must be answered to continue</p>
          </div>
          
          <div className={styles.mandatoryModalContent}>
            <p>{pendingTransactionPopup.message}</p>
            <p className={styles.mandatoryModalWarning}>
              ⚠️ This confirmation requires both users to respond and cannot be undone.
            </p>
            <p className={styles.mandatoryModalNote}>
              Note: After confirmation, there will be a 5-minute cooldown before this can be triggered again.
            </p>
          </div>
          
          <div className={styles.mandatoryModalActions}>
            <button
              onClick={() => handleTransactionPopupResponse('yes')}
              className={styles.confirmTransactionBtn}
            >
              Yes, Send confirmation
            </button>
            <button
              onClick={() => handleTransactionPopupResponse('no')}
              className={styles.cancelTransactionBtn}
            >
              No
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Transaction Completion Modal - Initial trigger */}
    {showTransactionModal && (
      <div className={styles.mandatoryModalOverlay}>
        <div className={styles.mandatoryModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.mandatoryModalHeader}>
            <h3>⚠️ Transaction Completion</h3>
            <p className={styles.mandatoryModalSubtitle}>This confirmation must be answered to continue</p>
          </div>
          
          <div className={styles.mandatoryModalContent}>
            <p>Are you sure you want to mark this transaction as complete?</p>
            <p className={styles.mandatoryModalWarning}>
              ⚠️ This will send a confirmation request to both users and cannot be undone.
            </p>
            <p className={styles.mandatoryModalNote}>
              Note: After confirmation, there will be a 5-minute cooldown before this can be triggered again.
            </p>
          </div>
          
          <div className={styles.mandatoryModalActions}>
            <button
              onClick={confirmTransactionCompletion}
              className={styles.confirmTransactionBtn}
            >
              Yes, Send confirmation
            </button>
            <button
              onClick={cancelTransactionCompletion}
              className={styles.cancelTransactionBtn}
            >
              No
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Rating Modal */}
    {showRatingModal && (
      <div className={styles.ratingModalOverlay}>
        <div className={styles.ratingModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.ratingModalHeader}>
            <h3>⭐ Rate User</h3>
            <p className={styles.ratingModalSubtitle}>Rate your experience with {selectedChat?.otherUserName}</p>
          </div>
          
          <div className={styles.ratingModalContent}>
            <div className={styles.starRatingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`${styles.starButton} ${star <= (hoveredStar || selectedRating) ? styles.starActive : ''}`}
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  disabled={submittingRating}
                >
                  <span className={styles.starIcon}>★</span>
                </button>
              ))}
            </div>
            
            <div className={styles.ratingDescription}>
              {selectedRating === 1 && 'Poor Experience'}
              {selectedRating === 2 && 'Below Average'}
              {selectedRating === 3 && 'Average Experience'}
              {selectedRating === 4 && 'Good Experience'}
              {selectedRating === 5 && 'Excellent Experience!'}
              {selectedRating === 0 && 'Please select a rating'}
            </div>
          </div>
          
          <div className={styles.ratingModalActions}>
            <button
              onClick={() => setShowRatingModal(false)}
              className={styles.cancelRatingBtn}
              disabled={submittingRating}
            >
              Cancel
            </button>
            <button
              onClick={submitRating}
              className={styles.submitRatingBtn}
              disabled={selectedRating === 0 || submittingRating}
            >
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    )}
    
    {/* Fullscreen Image Modal - Outside chatDashboard to escape stacking context */}
    {fullscreenImage && (
      <div 
        className={styles.fullscreenModal}
        onClick={() => setFullscreenImage(null)}
      >
        <img 
          src={fullscreenImage} 
          alt="Fullscreen image" 
          className={styles.fullscreenImage}
        />
        <button 
          className={styles.fullscreenCloseButton}
          onClick={(e) => {
            e.stopPropagation()
            setFullscreenImage(null)
          }}
        >
          ×
        </button>
      </div>
    )}
    </>
  )
}

export default Chat
