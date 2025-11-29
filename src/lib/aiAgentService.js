// AI Agent Service for AgriLink - Context-aware message suggestions
class AIAgentService {
  
  // Analyze conversation and generate contextual suggestions
  static async analyzeAndGenerateSuggestions(conversationHistory, userRole, currentStage = 1) {
    try {
      console.log('🤖 AI Agent: Analyzing conversation for contextual suggestions...')
      
      // Prepare conversation context for AI
      const context = this.prepareConversationContext(conversationHistory, userRole, currentStage)
      
      // Call OpenAI API for analysis
      const response = await this.callOpenAI(context)
      
      // Parse and return structured response
      return this.parseAIResponse(response)
      
    } catch (error) {
      console.error('❌ AI Agent: Error generating suggestions:', error)
      return this.getFallbackSuggestions(currentStage, userRole)
    }
  }

  // Prepare conversation context for AI analysis
  static prepareConversationContext(conversationHistory, userRole, currentStage) {
    const recentMessages = conversationHistory.slice(-10) // Last 10 messages for context
    
    return {
      system_prompt: `You are an AI Agent for AgriLink, a platform connecting crop farmers and livestock owners to exchange livestock waste (manure, spoiled eggs, etc.) for crop fertilizer use.

Your role is to analyze the conversation and generate contextual message suggestions that guide users toward completing a waste-for-fertilizer transaction.

TRANSACTION STAGES:
Stage 1 – Inquiry/Intent: Detect who is offering waste and who is seeking fertilizer
Stage 2 – Details Gathering: Ask for waste type, quantity, location, pickup/delivery, timeline  
Stage 3 – Negotiation: Help agree on pickup, price (if any), and schedule
Stage 4 – Agreement Confirmation: Suggest confirmation messages with all details
Stage 5 – Finalization: Suggest contact sharing and final arrangements
Stage 6 – Post-Transaction/Wrap-up: Polite closure and future engagement

RULES:
- Generate 1-3 contextual message suggestions based on actual conversation content
- Suggestions must directly respond to what users are discussing
- Keep tone polite, helpful, and transaction-oriented
- Never hallucinate facts - only use user-provided information
- If conversation is unclear, suggest clarifying questions
- Push users toward completing the transaction step by step

CURRENT CONTEXT:
- User Role: ${userRole} (crop_farmer or livestock_owner)
- Current Stage: ${currentStage}
- Recent Messages: ${recentMessages.map(m => `${m.senderName}: ${m.text}`).join('\n')}

Respond ONLY with JSON format:
{
  "stage": <1-6>,
  "analysis": "<brief reasoning about conversation state>",
  "suggestions": [
    "Contextual message suggestion 1",
    "Contextual message suggestion 2", 
    "Contextual message suggestion 3"
  ]
}`,
      
      messages: recentMessages.map(msg => ({
        role: msg.senderId === conversationHistory[0].senderId ? 'user' : 'assistant',
        content: msg.text
      }))
    }
  }

  // Call OpenAI API for conversation analysis
  static async callOpenAI(context) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: context.system_prompt },
          ...context.messages
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  // Parse AI response and extract structured data
  static parseAIResponse(response) {
    try {
      // Extract JSON from response (handle markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      return {
        success: true,
        stage: parsed.stage || 1,
        analysis: parsed.analysis || 'Conversation analysis completed',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : []
      }
      
    } catch (error) {
      console.error('❌ AI Agent: Error parsing response:', error)
      return this.getFallbackSuggestions(1, 'crop_farmer')
    }
  }

  // Get fallback suggestions when AI fails
  static getFallbackSuggestions(currentStage, userRole) {
    const fallbacks = {
      1: {
        crop_farmer: [
          "Are you offering livestock waste? What type and quantity do you have available?",
          "I'm looking for fertilizer for my crops. What waste materials can you provide?",
          "Do you have manure or other livestock waste available for exchange?"
        ],
        livestock_owner: [
          "I have livestock waste available. What type of fertilizer are you looking for?",
          "Are you interested in manure for your crops? I can provide various quantities.",
          "What waste materials would work best for your farming needs?"
        ]
      },
      2: {
        crop_farmer: [
          "Can you confirm the location and quantity of waste you can provide?",
          "What's your location and how much waste can you supply regularly?",
          "Do you offer delivery or should I arrange pickup?"
        ],
        livestock_owner: [
          "My location is [your location]. How much waste do you need for your crops?",
          "I can provide [quantity] of [waste type]. When would you like to pickup?",
          "Would you prefer weekly delivery or one-time pickup?"
        ]
      },
      3: {
        crop_farmer: [
          "Would you agree to pick up today at 3 PM?",
          "Can we schedule the pickup for this weekend?",
          "What time works best for you to collect the waste?"
        ],
        livestock_owner: [
          "Would pickup at 3 PM today work for you?",
          "I'm available this weekend for waste collection. What time suits you?",
          "Can you confirm your preferred pickup schedule?"
        ]
      },
      4: {
        crop_farmer: [
          "To confirm, I'll pick up [quantity] of [waste type] at [location] at [time], correct?",
          "Just to confirm: [quantity] of waste at [location] on [date/time]?",
          "Confirming the details: [quantity] pickup at [location] at [time]?"
        ],
        livestock_owner: [
          "To confirm, you will collect [quantity] of [waste type] at [location] at [time], correct?",
          "Just to confirm: [quantity] waste pickup at [location] on [date/time]?",
          "Confirming the arrangement: [quantity] at [location] at [time]?"
        ]
      },
      5: {
        crop_farmer: [
          "Great! Please share your contact number so the pickup can proceed smoothly.",
          "What's the best contact number for coordinating the pickup?",
          "Can you provide your phone number for final arrangements?"
        ],
        livestock_owner: [
          "Great! Please share your contact number so we can coordinate the pickup.",
          "What's your contact number for final pickup arrangements?",
          "Can you provide your phone number to coordinate the transaction?"
        ]
      },
      6: {
        crop_farmer: [
          "Thank you for using AgriLink! Feel free to message again anytime.",
          "Thanks for the successful exchange! Hope to work with you again.",
          "Appreciate your business! Message me anytime for future needs."
        ],
        livestock_owner: [
          "Thank you for using AgriLink! Feel free to message again anytime.",
          "Thanks for the successful exchange! Available for future partnerships.",
          "Appreciate your interest! Contact me anytime for waste materials."
        ]
      }
    }

    const suggestions = fallbacks[currentStage]?.[userRole] || fallbacks[1].crop_farmer

    return {
      success: false,
      stage: currentStage,
      analysis: 'Using fallback suggestions due to AI error',
      suggestions: suggestions.slice(0, 3)
    }
  }

  // Update conversation stage in Firestore
  static async updateConversationStage(chatId, stage, db) {
    try {
      const chatRef = doc(db, 'chats', chatId)
      await updateDoc(chatRef, {
        current_stage: stage,
        stage_updated_at: new Date().toISOString()
      })
      console.log(`✅ AI Agent: Updated conversation stage to ${stage}`)
      return true
    } catch (error) {
      console.error('❌ AI Agent: Error updating stage:', error)
      return false
    }
  }

  // Get current stage from conversation analysis
  static getCurrentStageFromMessages(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return 1
    }

    const recentText = conversationHistory.slice(-5).map(msg => msg.text).join(' ').toLowerCase()
    
    // Stage detection based on conversation content
    if (recentText.includes('thank') || recentText.includes('appreciate') || recentText.includes('success')) {
      return 6 // Post-Transaction
    }
    if (recentText.includes('contact') || recentText.includes('phone') || recentText.includes('number')) {
      return 5 // Finalization
    }
    if (recentText.includes('confirm') || recentText.includes('confirmed') || recentText.includes('correct')) {
      return 4 // Agreement Confirmation
    }
    if (recentText.includes('agree') || recentText.includes('schedule') || recentText.includes('time') || recentText.includes('pickup')) {
      return 3 // Negotiation
    }
    if (recentText.includes('quantity') || recentText.includes('location') || recentText.includes('type') || recentText.includes('available')) {
      return 2 // Details Gathering
    }
    
    return 1 // Inquiry/Intent
  }
}

export default AIAgentService
