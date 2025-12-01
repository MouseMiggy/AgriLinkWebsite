// AI Chat Service for AgriLink - Handles AI-powered chat features
const AI_BASE_URL = 'https://ai-backend-6-565d.onrender.com'

class AIChatService {
  // Generate contextual suggestions based on transaction flow and language analysis
  static async generateContextualSuggestions(conversationData) {
    try {
      console.log('🤖 Generating contextual suggestions for transaction flow:', {
        userRole: conversationData.userRole,
        listingName: conversationData.listingName,
        messageCount: conversationData.messages.length,
        currentStage: conversationData.currentStage,
        detectedLanguage: conversationData.detectedLanguage
      })
      
      const response = await fetch(`${AI_BASE_URL}/generate-contextual-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRole: conversationData.userRole,
          listingName: conversationData.listingName,
          messages: conversationData.messages,
          currentStage: conversationData.currentStage,
          detectedLanguage: conversationData.detectedLanguage
        })
      })

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Contextual suggestions generated:', {
        stage: data.stage,
        language: data.language,
        suggestionsCount: data.suggestions?.length || 0
      })
      
      return {
        success: true,
        stage: data.stage || conversationData.currentStage,
        language: data.language || conversationData.detectedLanguage,
        suggestions: data.suggestions || [],
        confidence: data.confidence || 0.5,
        nextSteps: data.nextSteps || []
      }
    } catch (error) {
      console.error('❌ Error generating contextual suggestions:', error)
      
      return {
        success: false,
        stage: conversationData.currentStage,
        language: conversationData.detectedLanguage,
        suggestions: [],
        error: error.message
      }
    }
  }

  // Generate chat suggestions for users
  static async generateChatSuggestions(userRole, listingName, conversationContext = '') {
    try {
      console.log('🤖 Generating chat suggestions for:', { userRole, listingName })
      
      const response = await fetch(`${AI_BASE_URL}/generate-chat-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userRole,
          listingName,
          conversationContext
        })
      })

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ AI suggestions generated:', data)
      
      return {
        success: true,
        suggestions: data.suggestions || [],
        context: data.context || '',
        fallbackUsed: data.fallback_used || false
      }
    } catch (error) {
      console.error('❌ Error generating chat suggestions:', error)
      
      // Return fallback suggestions
      const fallbackSuggestions = {
        crop_farmer: [
          "Hello, how much is 5 sacks?",
          "Can I offer a price for this?",
          "Is this available for pickup tomorrow?"
        ],
        livestock_owner: [
          "Yes, are you interested in buying?",
          "Where is your location for delivery?",
          "How many units do you need?"
        ]
      }
      
      return {
        success: false,
        suggestions: fallbackSuggestions[userRole] || [],
        context: `${userRole}_fallback`,
        error: error.message
      }
    }
  }

  // Analyze chat conversation for transaction completion
  static async analyzeChatTransaction(messages, listingName, listingPrice = '', cropFarmerId = '', livestockOwnerId = '') {
    try {
      console.log('🔍 Analyzing chat transaction:', { 
        messageCount: messages.length, 
        listingName,
        cropFarmerId,
        livestockOwnerId
      })
      
      const response = await fetch(`${AI_BASE_URL}/analyze-chat-transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          listingName,
          listingPrice,
          cropFarmerId,
          livestockOwnerId
        })
      })

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Transaction analysis completed:', data.result)
      
      return {
        success: true,
        result: data.result,
        messagesAnalyzed: data.messages_analyzed || 0
      }
    } catch (error) {
      console.error('❌ Error analyzing chat transaction:', error)
      
      return {
        success: false,
        result: {
          transactionStatus: 'negotiating',
          confidence: 0,
          agreedPrice: null,
          agreedQuantity: null,
          meetingDetails: null,
          buyerId: cropFarmerId,
          sellerId: livestockOwnerId,
          transactionDate: new Date().toISOString(),
          evidence: [],
          receipt: null
        },
        error: error.message
      }
    }
  }

  // Check chat inactivity and generate warnings
  static async checkChatInactivity(lastMessageTime, chatId, participantNames = {}) {
    try {
      console.log('⏰ Checking chat inactivity:', { chatId, lastMessageTime })
      
      const response = await fetch(`${AI_BASE_URL}/check-chat-inactivity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lastMessageTime,
          chatId,
          participantNames
        })
      })

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Inactivity check completed:', data)
      
      return {
        success: true,
        needsWarning: data.needsWarning || false,
        daysInactive: data.daysInactive || 0,
        warningMessage: data.warningMessage,
        willDeleteInDays: data.willDeleteInDays
      }
    } catch (error) {
      console.error('❌ Error checking chat inactivity:', error)
      
      return {
        success: false,
        needsWarning: false,
        daysInactive: 0,
        error: error.message
      }
    }
  }

  // Create transaction receipt from analysis result
  static createTransactionReceipt(analysisResult, buyerName, sellerName) {
    if (!analysisResult || !analysisResult.receipt) {
      return null
    }

    const receipt = {
      ...analysisResult.receipt,
      buyer: buyerName || 'Crop Farmer',
      seller: sellerName || 'Livestock Owner',
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date().toISOString(),
      status: 'completed'
    }

    console.log('🧾 Transaction receipt created:', receipt)
    return receipt
  }

  // Calculate quantity deduction for partial sales
  static calculateQuantityDeduction(originalQuantity, soldQuantity, measurementUnit = '') {
    try {
      const original = parseFloat(originalQuantity) || 0
      const sold = parseFloat(soldQuantity) || 0
      
      if (sold <= 0 || original <= 0) {
        return {
          originalQuantity,
          soldQuantity,
          remainingQuantity: originalQuantity,
          deductionSuccessful: false,
          error: 'Invalid quantities'
        }
      }

      const remaining = Math.max(0, original - sold)
      const isFullySold = remaining <= 0.01 // Allow for small floating point errors

      return {
        originalQuantity,
        soldQuantity,
        remainingQuantity: remaining.toFixed(2),
        isFullySold,
        deductionSuccessful: true,
        measurementUnit
      }
    } catch (error) {
      console.error('❌ Error calculating quantity deduction:', error)
      return {
        originalQuantity,
        soldQuantity,
        remainingQuantity: originalQuantity,
        deductionSuccessful: false,
        error: error.message
      }
    }
  }

  // Rate limiting helper to avoid excessive AI calls
  static shouldAnalyzeMessages(messageCount, lastAnalysisTime) {
    const MIN_MESSAGES_BETWEEN_ANALYSIS = 3
    const MIN_TIME_BETWEEN_ANALYSIS = 5 * 60 * 1000 // 5 minutes

    const enoughMessages = messageCount >= MIN_MESSAGES_BETWEEN_ANALYSIS
    const enoughTimePassed = !lastAnalysisTime || (Date.now() - lastAnalysisTime) > MIN_TIME_BETWEEN_ANALYSIS

    return enoughMessages && enoughTimePassed
  }

  // Extract key transaction information from messages
  static extractTransactionInfo(messages) {
    const recentMessages = messages.slice(-5) // Last 5 messages
    const messageText = recentMessages.map(msg => msg.text).join(' ').toLowerCase()

    // Price patterns
    const pricePatterns = [
      /(\d+)\s*php/i,
      /php\s*(\d+)/i,
      /(\d+)\s*pesos/i,
      /(\d+)\s*₱/i,
      /₱\s*(\d+)/i
    ]

    // Quantity patterns
    const quantityPatterns = [
      /(\d+)\s*(kg|kilo|kilogram)s?/i,
      /(\d+)\s*(sack)s?/i,
      /(\d+)\s*(bag)s?/i,
      /(\d+)\s*(unit)s?/i,
      /(\d+)\s*(piece)s?/i
    ]

    let extractedPrice = null
    let extractedQuantity = null

    // Extract price
    for (const pattern of pricePatterns) {
      const match = messageText.match(pattern)
      if (match) {
        extractedPrice = match[1]
        break
      }
    }

    // Extract quantity
    for (const pattern of quantityPatterns) {
      const match = messageText.match(pattern)
      if (match) {
        extractedQuantity = `${match[1]} ${match[2]}`
        break
      }
    }

    return {
      price: extractedPrice,
      quantity: extractedQuantity,
      hasPrice: !!extractedPrice,
      hasQuantity: !!extractedQuantity,
      hasBoth: extractedPrice && extractedQuantity
    }
  }
}

export default AIChatService
