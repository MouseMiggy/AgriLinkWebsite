// Next.js API route for AgriLink AI Agent LLM integration
// Handles OpenAI API calls for complex conversation analysis

import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Transaction stages for context
const TRANSACTION_STAGES = {
  INQUIRY: 'inquiry',
  DETAILS_GATHERING: 'details_gathering',
  NEGOTIATION: 'negotiation',
  AGREEMENT_CONFIRMATION: 'agreement_confirmation',
  FINALIZATION: 'finalization',
  WRAP_UP: 'wrap_up'
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userRole, currentStage, extractedInfo, messages, timestamp } = req.body

    // Validate required fields
    if (!userRole || !currentStage || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Missing required fields: userRole, currentStage, messages' 
      })
    }

    // Limit messages to control token usage
    const limitedMessages = messages.slice(-10)

    // Create conversation context for the LLM
    const conversationText = limitedMessages
      .map(msg => `${msg.senderName || 'User'}: ${msg.text}`)
      .join('\n')

    // Create the prompt for OpenAI
    const systemPrompt = `You are an AI assistant for AgriLink, a platform connecting crop farmers and livestock owners for waste-for-fertilizer transactions.

Your role is to analyze conversations and:
1. Determine the current transaction stage (inquiry → details_gathering → negotiation → agreement_confirmation → finalization → wrap_up)
2. Extract key information (waste type, quantity, location, timeline, price, contact info)
3. Generate 1-3 contextual message suggestions to guide the conversation forward
4. Calculate confidence in your analysis (0.0 to 1.0)

Transaction Stages:
- inquiry: Initial contact and intent detection
- details_gathering: Collecting specific transaction details
- negotiation: Discussing price, pickup arrangements, schedule
- agreement_confirmation: Confirming all transaction details
- finalization: Exchanging contact information for pickup
- wrap_up: Transaction completed, polite closure

User Roles:
- crop_farmer: Seeking fertilizer/waste
- livestock_owner: Offering waste

Current context:
- User role: ${userRole}
- Current stage: ${currentStage}
- Already extracted info: ${JSON.stringify(extractedInfo, null, 2)}

Analyze the following conversation and respond with JSON in this exact format:
{
  "stage": "determined_stage",
  "extractedInfo": {
    "wasteType": "type or null",
    "quantity": "amount or null", 
    "location": "place or null",
    "timeline": "when or null",
    "price": "cost or null",
    "contactInfo": "details or null"
  },
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "confidence": 0.85,
  "nextSteps": ["step 1", "step 2"]
}

Keep suggestions concise, polite, and transaction-focused. Always generate 1-3 suggestions.`

    const userPrompt = `Conversation to analyze:\n\n${conversationText}\n\nPlease analyze this conversation and provide your assessment.`

    console.log('🧠 Calling OpenAI API for conversation analysis...')

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use more cost-effective model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent results
      max_tokens: 500, // Limit response length
      response_format: { type: 'json_object' }
    })

    const llmResponse = completion.choices[0]?.message?.content
    
    if (!llmResponse) {
      throw new Error('No response from OpenAI API')
    }

    // Parse the JSON response
    let analysisResult
    try {
      analysisResult = JSON.parse(llmResponse)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', llmResponse)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Validate response structure
    const requiredFields = ['stage', 'extractedInfo', 'suggestions', 'confidence', 'nextSteps']
    for (const field of requiredFields) {
      if (!(field in analysisResult)) {
        throw new Error(`Missing required field in LLM response: ${field}`)
      }
    }

    // Validate stage
    if (!Object.values(TRANSACTION_STAGES).includes(analysisResult.stage)) {
      console.warn('Invalid stage from LLM:', analysisResult.stage)
      analysisResult.stage = currentStage // Fallback to current stage
    }

    // Limit suggestions to 3
    analysisResult.suggestions = analysisResult.suggestions.slice(0, 3)

    // Ensure confidence is within valid range
    analysisResult.confidence = Math.max(0.0, Math.min(1.0, analysisResult.confidence))

    console.log('✅ OpenAI analysis completed successfully', {
      stage: analysisResult.stage,
      suggestions: analysisResult.suggestions.length,
      confidence: analysisResult.confidence
    })

    // Add metadata to response
    analysisResult.llmModel = 'gpt-3.5-turbo'
    analysisResult.timestamp = new Date().toISOString()
    analysisResult.messagesAnalyzed = limitedMessages.length

    return res.status(200).json(analysisResult)

  } catch (error) {
    console.error('❌ Error in AI conversation analysis:', error)

    // Return appropriate error response
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return res.status(502).json({
        error: 'LLM service temporarily unavailable',
        details: error.message
      })
    }

    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        details: error.message
      })
    }

    // Generic error
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
