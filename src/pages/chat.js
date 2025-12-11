import { useState, useEffect, useRef, useCallback } from 'react'
import { db, auth, storage } from '../lib/firebase'
import { 
  doc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  deleteDoc, 
  arrayUnion, 
  arrayRemove, 
  writeBatch
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import AIChatService from '../lib/aiChatService'
import { createTransaction } from '../lib/transactionService'
import styles from '../../styles/modules/chat.module.css'
import ReportModal from '../components/ReportModal'

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
  const [isSuggestionsLocked, setIsSuggestionsLocked] = useState(false)
  const [suggestionsLockedUntil, setSuggestionsLockedUntil] = useState(0)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true)
  // Store suggestions per chat to make them persistent
  const [persistentSuggestions, setPersistentSuggestions] = useState({})
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
  
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportedMessages, setReportedMessages] = useState([])
  
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
      const storageReference = storageRef(storage, `chatImages/${selectedChat.chatId}/${filename}`)
      console.log('🔗 Storage reference created:', storageReference)
      
      // Upload file to Firebase Storage
      console.log('📤 Uploading file to Firebase Storage...')
      await uploadBytes(storageReference, file)
      console.log('✅ File uploaded successfully')
      
      // Get download URL
      console.log('🔗 Getting download URL...')
      const downloadURL = await getDownloadURL(storageReference)
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

  // Reset user rating status when switching chats
  useEffect(() => {
    setUserHasRated(false)
    // Reset AI suggestion tracking when switching chats
    lastProcessedMessageId.current = null
    console.log('🔄 Reset last processed message ID for new chat')
    
    // Load persistent suggestions for the new chat
    if (selectedChat) {
      const savedSuggestions = persistentSuggestions[selectedChat.id] || []
      setAiSuggestions(savedSuggestions)
      if (savedSuggestions.length > 0) {
        setShowSuggestions(true)
      }
    }
  }, [selectedChat?.id, persistentSuggestions])
  
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
    
    // Clear suggestions when transaction is completed
    if (hasTransactionCompleted && selectedChat?.id) {
      setPersistentSuggestions(prev => {
        const updated = { ...prev };
        delete updated[selectedChat.id];
        return updated;
      });
      setAiSuggestions([]);
      setShowSuggestions(false);
    }
  }, [hasTransactionCompleted, selectedChat?.id, user?.uid])
  const aiSuggestionsCache = useRef(new Map())
  const lastProcessedMessageId = useRef(null)
  
  // Clear cache on component mount to ensure fresh payment filtering
  useEffect(() => {
    console.log('🗑️ Clearing AI suggestions cache for fresh payment filtering')
    aiSuggestionsCache.current.clear()
  }, [])
  
  // Trigger AI suggestions when new message arrives
  const triggerAISuggestions = async (messages) => {
    if (!user || !selectedChat || messages.length === 0) return;
    
    // Get the last message
    const lastMessage = messages[messages.length - 1];
    
    console.log('🤖 AI SUGGESTIONS DEBUG:', {
      lastMessageId: lastMessage?.id,
      lastProcessedId: lastProcessedMessageId.current,
      lastMessageText: lastMessage?.text,
      lastMessageSender: lastMessage?.senderId,
      currentUserId: user?.uid,
      isFromOtherUser: lastMessage?.senderId !== user?.uid
    });
    
    // Temporarily disable strict message ID check to see if this is blocking suggestions
    // Only skip if we've already processed this exact message and it's from the same user
    if (lastProcessedMessageId.current === lastMessage?.id && lastMessage?.senderId !== user?.uid) {
      console.log('🤖 Skipping AI suggestions - already processed message from other user:', lastMessage?.id);
      return;
    }
    
    // Check if suggestions are locked (4-second cooldown)
    const now = Date.now()
    if (isSuggestionsLocked && now < suggestionsLockedUntil) {
      console.log('🔒 Suggestions locked in triggerAISuggestions, skipping update. Remaining:', Math.ceil((suggestionsLockedUntil - now) / 1000), 'seconds')
      return;
    }
    
    try {
      console.log('🤖 Triggering AI suggestions for chat:', selectedChat.id);
      
      // Create cache key based on last message ID and content (not message count)
      const cacheKey = `${selectedChat.id}_${lastMessage?.id || 'no_id'}_${lastMessage?.text?.slice(-50) || ''}`;
      
      console.log('🔑 Cache key generated:', cacheKey);
      
      // Check cache first
      if (aiSuggestionsCache.current.has(cacheKey)) {
        console.log('🤖 Using cached AI suggestions for:', cacheKey);
        const cachedSuggestions = aiSuggestionsCache.current.get(cacheKey);
        
        // Lock suggestions for 4 seconds even when using cache
        const lockUntil = now + 4000
        setIsSuggestionsLocked(true)
        setSuggestionsLockedUntil(lockUntil)
        
        console.log('🔒 Locking cached suggestions for 4 seconds until:', new Date(lockUntil).toLocaleTimeString())
        
        setAiSuggestions(cachedSuggestions);
        setShowSuggestions(true);
        
        // Unlock suggestions after 4 seconds
        setTimeout(() => {
          console.log('🔓 Unlocking cached suggestions - new updates can now occur')
          setIsSuggestionsLocked(false)
        }, 4000)
        
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
        
        // Filter suggestions to only show appropriate conversation stages
        const stageBasedSuggestions = result.suggestions.filter(suggestion => {
          const suggestionText = suggestion.toLowerCase();
          
          // Block payment-related suggestions
          const paymentPhrases = [
            'cash on', 'cash upon', 'cash for', 'cash payment',
            'card payment', 'credit card', 'debit card',
            'bank transfer', 'bank deposit',
            'gcash payment', 'paypal payment',
            'pay with cash', 'pay by cash',
            'payment method', 'payment option',
            'cod', 'cash on delivery', 'cash on meetup', 'cash on pickup'
          ];
          
          const containsPayment = paymentPhrases.some(phrase => suggestionText.includes(phrase));
          if (containsPayment) {
            console.log('🚫 BLOCKED payment suggestion:', suggestion);
            return false;
          }
          
          // Allow stage-appropriate suggestions
          const allowedPhrases = [
            // Stage 1: Listing details
            'quality', 'condition', 'price', 'cost', 'how much', 'details',
            'description', 'specifications', 'features', 'information',
            'about the', 'tell me more', 'what is', 'how is',
            
            // Stage 2: Location and time
            'location', 'where', 'meet', 'pickup', 'delivery', 'time',
            'when', 'schedule', 'available', 'address', 'place',
            
            // Stage 3: Finalization
            'confirm', 'ready', 'finalize', 'complete', 'done', 'agree',
            'sure', 'okay', 'deal', 'arrange', 'proceed'
          ];
          
          const isStageAppropriate = allowedPhrases.some(phrase => suggestionText.includes(phrase));
          
          if (isStageAppropriate) {
            console.log('✅ ALLOWED stage-appropriate suggestion:', suggestion);
            return true;
          } else {
            console.log('⚠️ SKIPPED non-stage suggestion:', suggestion);
            return false;
          }
        });
        
        const filteredSuggestions = stageBasedSuggestions.slice(0, 3);
        
        console.log('🔍 FINAL in triggerAISuggestions: Filtered', result.suggestions.length, 'suggestions to', filteredSuggestions.length, '(stage-appropriate only)');
        
        // Store suggestions in cache immediately
        aiSuggestionsCache.current.set(cacheKey, filteredSuggestions);
        
        // Store suggestions persistently for this chat
        setPersistentSuggestions(prev => ({
          ...prev,
          [selectedChat.id]: filteredSuggestions
        }));
        
        // Update last processed message ID to prevent duplicates
        lastProcessedMessageId.current = lastMessage?.id;
        
        // Lock suggestions for 10 seconds to prevent any changes
        const lockUntil = now + 10000
        setIsSuggestionsLocked(true)
        setSuggestionsLockedUntil(lockUntil)
        
        console.log('🔒 Locking suggestions for 10 seconds until:', new Date(lockUntil).toLocaleTimeString())
        console.log('🤖 AI is thinking... suggestions will appear in 5 seconds')
        
        // Wait 5 seconds before showing suggestions (AI thinking time)
        setTimeout(() => {
          console.log('✅ AI finished thinking - showing suggestions now')
          setAiSuggestions(filteredSuggestions);
          setShowSuggestions(true);
          
          // Store suggestions persistently for this chat
          setPersistentSuggestions(prev => ({
            ...prev,
            [selectedChat.id]: filteredSuggestions
          }));
        }, 5000);
        
        // Unlock suggestions after 10 seconds total
        setTimeout(() => {
          console.log('🔓 Unlocking suggestions - new updates can now occur')
          setIsSuggestionsLocked(false)
        }, 10000)
        
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

  // Extract listing ID and name from chat messages for transaction completion
  const extractListingIdFromChat = () => {
    // Find the listing request message to get listing ID and name
    const listingRequestMessage = chatMessages.find(msg => msg.isListingRequest)
    if (listingRequestMessage && listingRequestMessage.listingId) {
      return {
        listingId: listingRequestMessage.listingId,
        listingName: listingRequestMessage.listingName || selectedChat?.listingName || 'Untitled Listing'
      }
    }
    return null
  }

  // Generate contextual AI suggestions based on transaction stage
  const generateContextualSuggestions = async () => {
    if (!user || !selectedChat || !userRole) return

    // Check if suggestions are locked (2-second cooldown)
    const now = Date.now()
    if (isSuggestionsLocked && now < suggestionsLockedUntil) {
      console.log('🔒 Suggestions locked, skipping update. Remaining:', Math.ceil((suggestionsLockedUntil - now) / 1000), 'seconds')
      return
    }

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
        console.log('✅ Raw AI suggestions received:', result.suggestions)
        
        // Filter suggestions to only show appropriate conversation stages
        const stageBasedSuggestions = result.suggestions.filter(suggestion => {
          const suggestionText = suggestion.toLowerCase();
          
          // Block payment-related suggestions
          const paymentPhrases = [
            'cash on', 'cash upon', 'cash for', 'cash payment',
            'card payment', 'credit card', 'debit card',
            'bank transfer', 'bank deposit',
            'gcash payment', 'paypal payment',
            'pay with cash', 'pay by cash',
            'payment method', 'payment option',
            'cod', 'cash on delivery', 'cash on meetup', 'cash on pickup'
          ];
          
          const containsPayment = paymentPhrases.some(phrase => suggestionText.includes(phrase));
          if (containsPayment) {
            console.log('🚫 BLOCKED payment suggestion:', suggestion);
            return false;
          }
          
          // Allow stage-appropriate suggestions
          const allowedPhrases = [
            // Stage 1: Listing details
            'quality', 'condition', 'price', 'cost', 'how much', 'details',
            'description', 'specifications', 'features', 'information',
            'about the', 'tell me more', 'what is', 'how is',
            
            // Stage 2: Location and time
            'location', 'where', 'meet', 'pickup', 'delivery', 'time',
            'when', 'schedule', 'available', 'address', 'place',
            
            // Stage 3: Finalization
            'confirm', 'ready', 'finalize', 'complete', 'done', 'agree',
            'sure', 'okay', 'deal', 'arrange', 'proceed'
          ];
          
          const isStageAppropriate = allowedPhrases.some(phrase => suggestionText.includes(phrase));
          
          if (isStageAppropriate) {
            console.log('✅ ALLOWED stage-appropriate suggestion:', suggestion);
            return true;
          } else {
            console.log('⚠️ SKIPPED non-stage suggestion:', suggestion);
            return false;
          }
        });
        
        const filteredSuggestions = stageBasedSuggestions.slice(0, 3);
        
        console.log('🔍 FINAL: Filtered', result.suggestions.length, 'suggestions to', filteredSuggestions.length, '(stage-appropriate only)')
        
        // Lock suggestions for 10 seconds to prevent any changes
        const lockUntil = now + 10000
        setIsSuggestionsLocked(true)
        setSuggestionsLockedUntil(lockUntil)
        
        console.log('🔒 Locking suggestions for 10 seconds until:', new Date(lockUntil).toLocaleTimeString())
        console.log('🤖 AI is thinking... suggestions will appear in 5 seconds')
        
        // Wait 5 seconds before showing suggestions (AI thinking time)
        setTimeout(() => {
          console.log('✅ AI finished thinking - showing suggestions now')
          setAiSuggestions(filteredSuggestions)
          setShowSuggestions(true)
          
          // Store suggestions persistently for this chat
          setPersistentSuggestions(prev => ({
            ...prev,
            [chatId]: filteredSuggestions
          }));
        }, 5000);
        
        // Unlock suggestions after 10 seconds total
        setTimeout(() => {
          console.log('🔓 Unlocking suggestions - new updates can now occur')
          setIsSuggestionsLocked(false)
        }, 10000)
        
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
        // Keep suggestions visible even if no new ones
        setShowSuggestions(true)
      }
    } catch (error) {
      console.error('❌ Error generating contextual suggestions:', error)
      // Keep suggestions visible even on error
      setShowSuggestions(true)
    }
  }

  // Use an AI suggestion
  const useSuggestion = async (suggestion) => {
    try {
      console.log('🔍 DEBUG: Using AI suggestion:', suggestion)
      
      // Show thinking state without clearing persistent suggestions
      setIsSuggestionsLocked(true)
      setSuggestionsLockedUntil(Date.now() + 5000)
      setShowSuggestions(true)
      
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
      
      // Clear persistent suggestions if request is declined
      if (newStatus === 'declined' && currentChatId) {
        setPersistentSuggestions(prev => {
          const updated = { ...prev };
          delete updated[currentChatId];
          return updated;
        });
        setAiSuggestions([]);
        setShowSuggestions(false);
      }
      
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

  // Generate AI suggestions when other user replies (CONSOLIDATED to prevent race conditions)
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1]
      const isOtherUserReply = lastMessage.senderId !== user?.uid
      
      console.log('🤖 CONSOLIDATED AI Flow Analysis:', { 
        messageCount: chatMessages.length,
        requestStatus, 
        userRole, 
        isOtherUserReply,
        lastMessageSender: lastMessage?.senderId === user?.uid ? 'current user' : 'other user',
        lastMessageText: lastMessage?.text?.slice(50) + '...'
      })
      
      // Clear cache on every new message to ensure fresh context
      console.log('🗑️ Clearing AI suggestions cache for fresh context')
      aiSuggestionsCache.current.clear()
      
      // If last message is from current user, show thinking state
      if (lastMessage && lastMessage.senderId === user?.uid) {
        console.log('🤖 Current user sent message, showing thinking state')
        setIsSuggestionsLocked(true)
        setSuggestionsLockedUntil(Date.now() + 2000) // Reduced to 2 seconds
        setShowSuggestions(true)
        
        // Unlock after 2 seconds
        setTimeout(() => {
          setIsSuggestionsLocked(false)
        }, 2000)
      }
      // Always trigger suggestions when OTHER user replies and there's an approved request
      else if (isOtherUserReply && requestStatus === 'approved' && userRole && listingName) {
        console.log('🤖 Other user replied, generating fresh suggestions')
        generateContextualSuggestions()
      }
    }
  }, [chatMessages.length, requestStatus, userRole, listingName, user?.uid])

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
      
      // Delete all previous transaction response messages to reset state
      const messagesRef = collection(db, 'chats', chatId, 'messages')
      const transactionResponsesQuery = query(
        messagesRef,
        where('isTransactionResponse', '==', true)
      )
      const transactionResponsesSnapshot = await getDocs(transactionResponsesQuery)
      
      // Delete all previous transaction response messages
      const deletePromises = transactionResponsesSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      )
      await Promise.all(deletePromises)
      console.log('✅ Deleted', transactionResponsesSnapshot.docs.length, 'previous transaction responses')
      
      // Create popup data with fresh state
      const popupData = {
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
    if (!selectedChat || !chatMessages.length) {
      alert('No messages to report')
      return
    }
    
    // Get ALL messages from the other user (the one being reported)
    // Include all regular messages, exclude only system-generated messages
    const otherUserMessages = chatMessages.filter(msg => 
      msg.senderId === selectedChat.otherUserId && 
      msg.senderId !== 'system' &&
      !msg.isListingRequest && 
      !msg.isTransactionResponse
    )
    
    if (otherUserMessages.length === 0) {
      alert('No messages from this user to report')
      return
    }
    
    console.log('📋 Reporting conversation with ALL messages from user:', otherUserMessages.length)
    console.log('📝 Messages include:', {
      textMessages: otherUserMessages.filter(m => m.text).length,
      imageMessages: otherUserMessages.filter(m => m.imageUrl).length,
      totalMessages: otherUserMessages.length
    })
    
    // Debug: Log each message to see what data we have
    console.log('🔍 DETAILED MESSAGE BREAKDOWN:')
    otherUserMessages.forEach((msg, idx) => {
      console.log(`  Message ${idx + 1}:`, {
        hasText: !!msg.text,
        text: msg.text?.substring(0, 50),
        hasImageUrl: !!msg.imageUrl,
        imageUrl: msg.imageUrl?.substring(0, 80)
      })
    })
    
    // Extract image URLs
    const imageUrls = otherUserMessages.filter(msg => msg.imageUrl).map(msg => msg.imageUrl)
    console.log('🖼️ EXTRACTED IMAGE URLS:', imageUrls)
    console.log('📊 Total images to report:', imageUrls.length)
    
    setReportedMessages(otherUserMessages)
    setShowReportModal(true)
  }
  
  const closeReportModal = () => {
    setShowReportModal(false)
    setReportedMessages([])
  }

  // Handle complete transaction button click
  const handleCompleteTransaction = () => {
    sendTransactionCompletionConfirmation()
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
      
      if (response === 'no') {
        // User said no - clear popup and delete ALL transaction response messages
        console.log('❌ User said no - clearing transaction popup and resetting all states')
        
        // Delete all transaction response messages from both users
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const transactionResponsesQuery = query(
          messagesRef,
          where('isTransactionResponse', '==', true)
        )
        const transactionResponsesSnapshot = await getDocs(transactionResponsesQuery)
        
        const deletePromises = transactionResponsesSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        )
        await Promise.all(deletePromises)
        console.log('✅ Deleted', transactionResponsesSnapshot.docs.length, 'transaction response messages')
        
        await updateDoc(doc(db, 'chats', chatId), {
          pendingTransactionPopup: null,
          transactionStatus: null,
          transactionStatusTime: null
        })
        console.log('✅ Transaction rejected - popup cleared and states reset')
      } else if (participantIds.length === 2) {
        // Both users responded - check if both said yes
        const bothSaidYes = Object.values(responses).every(r => r.response === 'yes')
        
        if (bothSaidYes) {
          console.log('✅ Both users said yes - transaction completed')
          
          // Create transaction record for both users
          try {
            const listingInfo = extractListingIdFromChat()
            if (listingInfo) {
              const { listingId, listingName } = listingInfo
              console.log('🔍 Creating transaction record for listing:', listingId, 'with name:', listingName)
              
              // Get participant IDs (buyer and seller)
              const participantIds = Object.keys(responses)
              console.log('👥 Participants:', participantIds)
              
              // Determine buyer and seller by checking user roles
              let buyerId = null
              let sellerId = null
              
              for (const participantId of participantIds) {
                const userDoc = await getDoc(doc(db, 'Users', participantId))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  console.log(`🔍 User ${participantId} role:`, userData.role)
                  
                  if (userData.role === 'crop_farmer') {
                    buyerId = participantId
                  } else if (userData.role === 'livestock_owner') {
                    sellerId = participantId
                  }
                }
              }
              
              if (!buyerId || !sellerId) {
                console.error('❌ Could not determine buyer/seller roles:', { buyerId, sellerId })
                throw new Error('Unable to determine buyer and seller roles')
              }
              
              console.log('✅ Determined roles:', { buyerId, sellerId })
              
              // Get user details for both participants
              const buyerDoc = await getDoc(doc(db, 'Users', buyerId))
              const sellerDoc = await getDoc(doc(db, 'Users', sellerId))
              
              const buyerData = buyerDoc.exists() ? buyerDoc.data() : {}
              const sellerData = sellerDoc.exists() ? sellerDoc.data() : {}
              
              // Get listing details for price and other info
              const listingDoc = await getDoc(doc(db, 'livestock_listings', listingId))
              const listingData = listingDoc.exists() ? listingDoc.data() : {}
              
              console.log('📋 Listing data retrieved:', {
                exists: listingDoc.exists(),
                listingNameFromChat: listingName,
                listingNameFromFirestore: listingData.name,
                price: listingData.price
              })
              
              // Format user names
              const buyerName = `${buyerData.firstName || ''} ${buyerData.lastName || ''}`.trim() || 
                              buyerData.email?.split('@')[0] || 'Unknown Buyer'
              const sellerName = `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || 
                               sellerData.email?.split('@')[0] || 'Unknown Seller'
              
              // Create transaction data - use listing name from chat message (most reliable)
              const transactionData = {
                buyerId,
                sellerId,
                listingId,
                listingName: listingName, // Use name from chat message, not Firestore
                listingDetails: listingData.description || listingData.details || '',
                price: listingData.price || 0,
                dateAdded: listingData.createdAt || new Date(),
                buyerName,
                sellerName,
                chatId: selectedChat?.id || chatId
              }
              
              console.log('💾 Transaction data prepared:', transactionData)
              console.log('🔍 Listing name being stored:', transactionData.listingName)
              
              // Create the transaction record
              await createTransaction(transactionData)
              console.log('✅ Transaction record created successfully')
            } else {
              console.log('⚠️ No listing ID found, skipping transaction creation')
            }
          } catch (error) {
            console.error('❌ Error creating transaction record:', error)
            // Don't break the completion flow if transaction creation fails
          }
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
    if (!db || !user?.uid) {
      console.log('⚠️ Firebase db or user not available, skipping chat listener setup')
      return
    }
    
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    )
    
    const conversationsMap = new Map() // Use Map to prevent duplicate conversations
    
    const unsubscribe = onSnapshot(chatsQuery, async (chatsSnapshot) => {
      console.log('🔄 WEB CHAT: Received chats snapshot with', chatsSnapshot.size, 'documents')
      
      // Process chats sequentially to handle async operations
      for (const chatDoc of chatsSnapshot.docs) {
        const chatId = chatDoc.id
        const chatData = chatDoc.data()
        
        console.log('📝 WEB CHAT: Processing chat:', chatId, chatData)
        
        // Defensive null checks for required fields
        if (!chatData.participants || !Array.isArray(chatData.participants)) {
          console.warn('⚠️ WEB CHAT: Skipping chat with invalid participants:', chatId)
          continue
        }
        
        // Find the other user ID (not the current user)
        const otherUserId = chatData.participants.find(id => id !== user.uid)
        
        if (!otherUserId) {
          console.warn('⚠️ WEB CHAT: Skipping chat with no other user:', chatId)
          continue
        }
        
        // Get other user details with fallbacks - prioritize actual names over role names
        let otherUserName = chatData.participantNames?.[otherUserId] || chatData.otherUserName || chatData[`${otherUserId}_name`] || 'Unknown User'
        const otherUserEmail = chatData.participantEmails?.[otherUserId] || chatData.otherUserEmail || chatData[`${otherUserId}_email`] || 'unknown@example.com'
        const listingName = chatData.listingName || ''
        
        // If participantNames doesn't exist or doesn't have the user's name, fetch from Users collection
        if (!chatData.participantNames?.[otherUserId] || otherUserName === 'Crop Farmer' || otherUserName === 'Livestock Owner') {
          try {
            const otherUserDoc = await getDoc(doc(db, 'Users', otherUserId))
            if (otherUserDoc.exists()) {
              const otherUserData = otherUserDoc.data()
              otherUserName = `${otherUserData.firstName || ''} ${otherUserData.lastName || ''}`.trim() || otherUserData.email?.split('@')[0] || otherUserName
              console.log('✅ Fetched user name from Users collection:', otherUserName)
            }
          } catch (error) {
            console.error('Error fetching user name from Users collection:', error)
          }
        }
        
        console.log('👤 WEB CHAT: Other user details DEBUG:', { 
          otherUserId, 
          participantNames: chatData.participantNames,
          participantNameForUser: chatData.participantNames?.[otherUserId],
          otherUserName: chatData.otherUserName,
          legacyName: chatData[`${otherUserId}_name`],
          finalName: otherUserName,
          listingName 
        });
        
        // ROLE-BASED FILTERING: matching mobile app logic exactly
        const currentUserRoleInChat = chatData.participantRoles?.[user.uid]
        
        // Skip chats where current user doesn't have the expected role
        if (currentUserRoleInChat !== userRole) {
          console.log('⚠️ WEB CHAT: Skipping chat - user role mismatch. Expected:', userRole, 'Got:', currentUserRoleInChat)
          continue
        }
        
        // Initialize conversation in map first (prevents duplicates)
        // Use the fetched otherUserName which already has proper fallback logic
        const conversationData = {
          id: chatId,
          otherUserId,
          otherUserName: otherUserName, // Use the fetched name (already has all fallbacks applied)
          otherUserEmail: otherUserEmail, // Use the fetched email
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
              otherUserName: otherUserName, // Use the fetched name (already has all fallbacks applied)
              otherUserEmail: otherUserEmail, // Use the fetched email
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
      }
      
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
      const noTransactionMessages = messages.filter(msg => 
        msg.text === 'No, the transaction is not done yet.' && msg.isTransactionResponse
      )
      // Transaction is complete ONLY when both users said YES (2 YES messages) and NO user said NO (0 NO messages)
      const isTransactionCompletedByYesCount = yesTransactionMessages.length >= 2 && noTransactionMessages.length === 0
      
      console.log('🔍 Transaction Completion Check in Message Listener:', {
        yesCount: yesTransactionMessages.length,
        noCount: noTransactionMessages.length,
        isCompleted: isTransactionCompletedByYesCount
      })
      
      // Also check for legacy system message with isTransactionDone flag
      const completedTransactionMessage = messages.find(msg => 
        msg.isTransactionDone && 
        msg.showRateButton &&
        msg.senderId === 'system'
      )
      
      setHasTransactionCompleted(!!completedTransactionMessage || isTransactionCompletedByYesCount)
      
      // Function to create transaction from chat data
      const createTransactionFromChat = async (chatData, messages) => {
        console.log('🔄 Creating transaction from chat:', chatData)
        
        // Check if transaction already exists for this chat
        try {
          const existingTransactionQuery = query(
            collection(db, 'transactions'),
            where('chatId', '==', chatData.id)
          )
          const existingSnapshot = await getDocs(existingTransactionQuery)
          if (!existingSnapshot.empty) {
            console.log('⚠️ Transaction already exists for chat:', chatData.id)
            return
          }
        } catch (error) {
          console.error('Error checking existing transaction:', error)
        }
        
        // Extract listing information from chat
        const listingData = chatData.listing || {}
        const participants = chatData.participants || []
        const participantRoles = chatData.participantRoles || {}
        
        console.log('🔍 Transaction data extraction:', {
          participants,
          participantRoles,
          listingData,
          chatId: chatData.id
        })
        
        // Determine buyer and seller based on roles
        let buyerId, sellerId, buyerName, sellerName, listingId
        
        // Find buyer (crop_farmer) and seller (livestock_owner) from participant roles
        for (const userId of participants) {
          const role = participantRoles[userId]
          if (role === 'crop_farmer') {
            buyerId = userId
          } else if (role === 'livestock_owner') {
            sellerId = userId
          }
        }
        
        console.log('🔍 Extracted IDs:', { buyerId, sellerId })
        
        // Get listing ID from chat data or listing object
        listingId = chatData.listingId || listingData.id || null
        
        // Fetch user names from Users collection
        if (buyerId && sellerId) {
          try {
            const buyerDoc = await getDoc(doc(db, 'Users', buyerId))
            const sellerDoc = await getDoc(doc(db, 'Users', sellerId))
            
            if (buyerDoc.exists()) {
              const buyerData = buyerDoc.data()
              buyerName = `${buyerData.firstName || ''} ${buyerData.lastName || ''}`.trim() || buyerData.email?.split('@')[0] || 'Unknown Buyer'
            } else {
              buyerName = 'Unknown Buyer'
            }
            
            if (sellerDoc.exists()) {
              const sellerData = sellerDoc.data()
              sellerName = `${sellerData.firstName || ''} ${sellerData.lastName || ''}`.trim() || sellerData.email?.split('@')[0] || 'Unknown Seller'
            } else {
              sellerName = 'Unknown Seller'
            }
            
            console.log('✅ Fetched user names:', { buyerName, sellerName })
          } catch (error) {
            console.error('Error fetching user names:', error)
            buyerName = 'Unknown Buyer'
            sellerName = 'Unknown Seller'
          }
        } else {
          console.error('❌ Missing buyer or seller ID:', { buyerId, sellerId })
          return
        }
        
        // Create transaction data with all required fields
        const transactionData = {
          buyerId,
          sellerId,
          listingId: listingId || 'unknown',
          listingName: chatData.listingName || listingData.title || listingData.name || 'Unknown Listing',
          listingDetails: listingData.description || listingData.details || '',
          price: listingData.price || 0,
          dateAdded: new Date(),
          buyerName,
          sellerName,
          chatId: chatData.id,
          status: 'completed',
          completedAt: new Date()
        }
        
        console.log('💾 Transaction data to be saved:', transactionData)
        
        // Validate all required fields are present
        if (!transactionData.buyerId || !transactionData.sellerId) {
          console.error('❌ Cannot create transaction - missing buyer or seller ID')
          return
        }
        
        // Create the transaction
        try {
          await createTransaction(transactionData)
          console.log('✅ Transaction created successfully for chat:', chatData.id)
          
          // Mark chat as having transaction created to prevent duplicates
          await updateDoc(doc(db, 'chats', chatData.id), {
            transactionCreated: true,
            transactionCreatedAt: serverTimestamp()
          })
        } catch (error) {
          console.error('❌ Error creating transaction:', error)
        }
      }
      
      // Create transaction record when both users agree (with duplicate prevention)
      if (isTransactionCompletedByYesCount && selectedChat) {
        console.log('✅ Both users confirmed transaction complete - creating transaction record')
        createTransactionFromChat(selectedChat, messages)
      }
      
      if (isTransactionCompletedByYesCount && user && selectedChat) {
        const checkUserRating = async () => {
          try {
            console.log('🔍 Checking user rating in message listener...')
            const otherUserRef = doc(db, 'Users', selectedChat.otherUserId)
            const otherUserDoc = await getDoc(otherUserRef)
            
            if (otherUserDoc.exists()) {
              const otherUserData = otherUserDoc.data()
              const existingRatings = otherUserData.ratings || []
              console.log('📊 Existing ratings for other user:', existingRatings.length)
              
              const currentUserRating = existingRatings.find(rating => 
                rating.ratedBy === user.uid && 
                rating.chatId === selectedChat.id
              )
              
              const hasRated = !!currentUserRating
              console.log('✅ User has rated in message listener:', hasRated)
              
              // Only update if user has actually rated
              if (hasRated) {
                setUserHasRated(true)
              }
            } else {
              console.log('⚠️ Other user document does not exist')
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
        
        // Simple check: if there are 2+ "Yes, the transaction is done." messages AND no NO messages, disable AI permanently
        const yesTransactionMessages = messages.filter(msg => 
          msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
        )
        const noTransactionMessages = messages.filter(msg => 
          msg.text === 'No, the transaction is not done yet.' && msg.isTransactionResponse
        )
        const isTransactionCompletedByYesCount = yesTransactionMessages.length >= 2 && noTransactionMessages.length === 0
        
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
    // Show thinking state without clearing persistent suggestions
    setIsSuggestionsLocked(true)
    setSuggestionsLockedUntil(Date.now() + 5000)
    setShowSuggestions(true)
    
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
    
    // Show thinking state without clearing persistent suggestions
    setIsSuggestionsLocked(true)
    setSuggestionsLockedUntil(Date.now() + 5000)
    setShowSuggestions(true)
    
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
      
      // CRITICAL FIX: Also update the listing_requests collection for real-time sync
      if (message.listingId && message.senderId) {
        console.log('🔄 Updating listing_requests collection for real-time sync:', {
          listingId: message.listingId,
          senderId: message.senderId,
          status: status
        })
        
        try {
          const listingRequestsQuery = query(
            collection(db, 'listing_requests'),
            where('listingId', '==', message.listingId),
            where('requesterId', '==', message.senderId)
          )
          
          const requestSnapshot = await getDocs(listingRequestsQuery)
          if (!requestSnapshot.empty) {
            const requestDoc = requestSnapshot.docs[0]
            await updateDoc(doc(db, 'listing_requests', requestDoc.id), {
              status: status,
              updatedAt: serverTimestamp(),
              responseMessage: status === 'approved' 
                ? '✅ Request approved! You can now chat freely.'
                : '❌ Request declined. Thank you for your interest.'
            })
            console.log('✅ listing_requests collection updated successfully')
          } else {
            console.log('⚠️ No matching document found in listing_requests collection')
          }
        } catch (listingUpdateError) {
          console.error('❌ Failed to update listing_requests collection:', listingUpdateError)
          // Don't fail the approval flow - chat message update already succeeded
        }
      } else {
        console.log('⚠️ Missing listingId or requesterId in message - skipping listing_requests update')
      }
      
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
    // Keep suggestions visible with thinking state when closing chat
    setIsSuggestionsLocked(true)
    setSuggestionsLockedUntil(Date.now() + 2000)
    setShowSuggestions(true)
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
                  // Show thinking state when switching conversations
                  setIsSuggestionsLocked(true)
                  setSuggestionsLockedUntil(Date.now() + 3000)
                  setShowSuggestions(true)
                  
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
                {/* Check if there's an approved request before showing buttons */}
                {(() => {
                  const hasApprovedRequest = chatMessages.some(msg => 
                    msg.isListingRequest && msg.requestStatus === 'approved'
                  )
                  
                  // Check if transaction is completed
                  const yesTransactionMessages = chatMessages.filter(msg => 
                    msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
                  )
                  const noTransactionMessages = chatMessages.filter(msg => 
                    msg.text === 'No, the transaction is not done yet.' && msg.isTransactionResponse
                  )
                  // Transaction is complete ONLY when both users said YES (2 YES messages) and NO user said NO (0 NO messages)
                  const isTransactionCompleted = yesTransactionMessages.length >= 2 && noTransactionMessages.length === 0
                  
                  console.log('🔍 Done Transaction Button Check:', {
                    yesCount: yesTransactionMessages.length,
                    noCount: noTransactionMessages.length,
                    isCompleted: isTransactionCompleted,
                    hasApprovedRequest
                  })
                  
                  if (!hasApprovedRequest) {
                    return null // Don't show buttons until request is approved
                  }
                  
                  return (
                    <>
                      {/* Done Transaction Button - HIDE when both users pressed YES */}
                      {!isTransactionCompleted && (
                        <button 
                          className={styles.doneTransactionBtn}
                          onClick={handleCompleteTransaction}
                          title="Mark this transaction as completed"
                        >
                          ✅ Done Transaction
                        </button>
                      )}
                      
                      {/* Report Button - same size as Rate User button was */}
                      <button 
                        className={styles.reportBtn}
                        onClick={handleReportClick}
                        title="Report this conversation"
                      >
                        Report
                      </button>
                    </>
                  )
                })()}
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
                      <div className={`${styles.messageContent} ${message.text?.includes("I am interested in your listing") ? styles.listingRequestMessage : ''}`}>
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

              {/* Transaction Complete Divider - shows ONLY when both users pressed YES and no one pressed NO */}
              {(() => {
                const yesTransactionMessages = chatMessages.filter(msg => 
                  msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
                )
                const noTransactionMessages = chatMessages.filter(msg => 
                  msg.text === 'No, the transaction is not done yet.' && msg.isTransactionResponse
                )
                // Only show divider when exactly 2 YES messages exist and NO messages exist
                const isTransactionCompleted = yesTransactionMessages.length >= 2 && noTransactionMessages.length === 0
                
                console.log('🔍 Transaction Complete Divider Check:', {
                  yesCount: yesTransactionMessages.length,
                  noCount: noTransactionMessages.length,
                  isCompleted: isTransactionCompleted
                })
                
                return isTransactionCompleted ? (
                  <div className={styles.transactionCompleteDivider}>
                    <span className={styles.dividerText}>Transaction complete</span>
                  </div>
                ) : null
              })()}

              {/* AI Suggestions Section - disabled when transaction is completed */}
              {(() => {
                // Check if transaction is completed
                const yesTransactionMessages = chatMessages.filter(msg => 
                  msg.text === 'Yes, the transaction is done.' && msg.isTransactionResponse
                )
                const noTransactionMessages = chatMessages.filter(msg => 
                  msg.text === 'No, the transaction is not done yet.' && msg.isTransactionResponse
                )
                const isTransactionCompleted = yesTransactionMessages.length >= 2 && noTransactionMessages.length === 0
                
                // Show container if suggestions exist OR if AI is thinking (locked)
                // Keep suggestions visible unless request is declined or transaction is done
                return (aiSuggestions.length > 0 || isSuggestionsLocked) && showSuggestions && requestStatus !== 'declined' && !isTransactionCompleted
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
                      {isSuggestionsLocked ? (
                        <div className={styles.suggestionsLockedIndicator}>
                          <span>Thinking ...</span>
                        </div>
                      ) : (
                        aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            className={styles.suggestionBtn}
                            onClick={() => useSuggestion(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))
                      )}
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
              {(() => {
                console.log('🎯 Rating Button Debug:', {
                  hasTransactionCompleted,
                  userHasRated,
                  shouldShow: hasTransactionCompleted && !userHasRated,
                  selectedChatId: selectedChat?.id,
                  otherUserId: selectedChat?.otherUserId
                })
                
                // Don't render anything if user has already rated
                if (userHasRated) {
                  return null
                }
                
                return hasTransactionCompleted && (
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
                )
              })()}
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
    
    {/* Report Modal for Chat Messages */}
    <ReportModal
      visible={showReportModal}
      onClose={closeReportModal}
      targetUser={{
        id: selectedChat?.otherUserId,
        displayName: selectedChat?.otherUserName,
        firstName: selectedChat?.otherUserName?.split(' ')[0],
        lastName: selectedChat?.otherUserName?.split(' ')[1]
      }}
      content={{
        id: selectedChat?.id,
        messages: reportedMessages,
        text: reportedMessages.map(msg => msg.text).join('\n'),
        imageUrls: reportedMessages.filter(msg => msg.imageUrl).map(msg => msg.imageUrl)
      }}
      contentType="message"
      reporterId={user?.uid}
    />
    </>
  )
}

export default Chat
 