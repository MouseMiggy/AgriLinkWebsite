// Test script for AgriLink AI Agent
// Tests conversation analysis, stage detection, and message suggestions

import AgriLinkAgent from './src/lib/agriLinkAgent.js'

// Test conversation scenarios
const testScenarios = [
  {
    name: 'Stage 1 - Initial Inquiry',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Hello! I have livestock waste available for fertilizer use.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'inquiry',
    expectedInfo: {}
  },
  {
    name: 'Stage 2 - Details Gathering',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'I have chicken manure available for fertilizer use.',
        timestamp: new Date(),
        isOwnMessage: false
      },
      {
        senderId: 'crop_farmer_1',
        senderName: 'Maria Cruz',
        text: 'How much manure do you have?',
        timestamp: new Date(),
        isOwnMessage: true
      },
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'I have about 50 kg of fresh chicken manure available.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'details_gathering',
    expectedInfo: {
      wasteType: 'chicken_waste',
      quantity: '50 kg'
    }
  },
  {
    name: 'Stage 3 - Negotiation',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'I have 50 kg of chicken manure available.',
        timestamp: new Date(),
        isOwnMessage: false
      },
      {
        senderId: 'crop_farmer_1',
        senderName: 'Maria Cruz',
        text: 'Great! How much would it cost and when can I pick it up?',
        timestamp: new Date(),
        isOwnMessage: true
      },
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'It\'s free if you pick it up. I\'m in Barangay San Miguel.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'negotiation',
    expectedInfo: {
      wasteType: 'chicken_waste',
      quantity: '50 kg',
      price: 'free',
      location: 'barangay san miguel'
    }
  },
  {
    name: 'Stage 4 - Agreement Confirmation',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Free if you pick it up. I\'m in Barangay San Miguel.',
        timestamp: new Date(),
        isOwnMessage: false
      },
      {
        senderId: 'crop_farmer_1',
        senderName: 'Maria Cruz',
        text: 'Perfect! I can pick up 50 kg of chicken manure in Barangay San Miguel tomorrow morning.',
        timestamp: new Date(),
        isOwnMessage: true
      },
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Yes, that sounds good. Tomorrow morning works for me.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'agreement_confirmation',
    expectedInfo: {
      wasteType: 'chicken_waste',
      quantity: '50 kg',
      price: 'free',
      location: 'barangay san miguel',
      timeline: 'tomorrow morning'
    }
  },
  {
    name: 'Stage 5 - Finalization',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Yes, that sounds good. Tomorrow morning works for me.',
        timestamp: new Date(),
        isOwnMessage: false
      },
      {
        senderId: 'crop_farmer_1',
        senderName: 'Maria Cruz',
        text: 'Great! Can I get your contact number to coordinate the pickup?',
        timestamp: new Date(),
        isOwnMessage: true
      },
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Sure, my number is 0912-345-6789.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'finalization',
    expectedInfo: {
      wasteType: 'chicken_waste',
      quantity: '50 kg',
      price: 'free',
      location: 'barangay san miguel',
      timeline: 'tomorrow morning',
      contactInfo: '0912-345-6789'
    }
  },
  {
    name: 'Stage 6 - Wrap Up',
    userRole: 'crop_farmer',
    messages: [
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Sure, my number is 0912-345-6789.',
        timestamp: new Date(),
        isOwnMessage: false
      },
      {
        senderId: 'crop_farmer_1',
        senderName: 'Maria Cruz',
        text: 'Thank you! I\'ll message you when I\'m on my way tomorrow.',
        timestamp: new Date(),
        isOwnMessage: true
      },
      {
        senderId: 'livestock_owner_1',
        senderName: 'John Farmer',
        text: 'Thank you for using AgriLink! See you tomorrow.',
        timestamp: new Date(),
        isOwnMessage: false
      }
    ],
    expectedStage: 'wrap_up',
    expectedInfo: {
      wasteType: 'chicken_waste',
      quantity: '50 kg',
      price: 'free',
      location: 'barangay san miguel',
      timeline: 'tomorrow morning',
      contactInfo: '0912-345-6789'
    }
  }
]

// Test function for conversation analysis
async function testConversationAnalysis() {
  console.log('🧪 Testing AgriLink Agent Conversation Analysis...\n')
  
  let passedTests = 0
  let totalTests = testScenarios.length
  
  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.name}`)
    console.log(`👤 User Role: ${scenario.userRole}`)
    console.log(`💬 Messages: ${scenario.messages.length}`)
    
    try {
      // Mock conversation state
      const mockConversationState = {
        stage: 'inquiry',
        extractedInfo: {},
        participants: {}
      }
      
      // Test conversation analysis
      const analysis = AgriLinkAgent.analyzeConversation(
        scenario.messages,
        scenario.userRole,
        mockConversationState
      )
      
      console.log(`🎯 Detected Stage: ${analysis.stage}`)
      console.log(`✅ Expected Stage: ${scenario.expectedStage}`)
      console.log(`📊 Confidence: ${analysis.confidence.toFixed(2)}`)
      console.log(`💡 Suggestions: ${analysis.suggestions.length}`)
      console.log(`📝 Extracted Info:`, analysis.extractedInfo)
      
      // Check if stage matches expectation
      const stageMatches = analysis.stage === scenario.expectedStage
      const hasSuggestions = analysis.suggestions.length > 0
      const hasValidConfidence = analysis.confidence > 0 && analysis.confidence <= 1
      
      let testPassed = stageMatches && hasSuggestions && hasValidConfidence
      
      // Check extracted info
      for (const [key, expectedValue] of Object.entries(scenario.expectedInfo)) {
        if (expectedValue && !analysis.extractedInfo[key]) {
          console.log(`⚠️  Missing expected info: ${key}`)
          testPassed = false
        }
      }
      
      if (testPassed) {
        console.log('✅ TEST PASSED')
        passedTests++
      } else {
        console.log('❌ TEST FAILED')
      }
      
      // Display suggestions
      console.log('💭 Generated Suggestions:')
      analysis.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. "${suggestion}"`)
      })
      
    } catch (error) {
      console.error('❌ TEST ERROR:', error.message)
    }
    
    console.log('─'.repeat(60))
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`)
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  return passedTests === totalTests
}

// Test pattern matching functionality
function testPatternMatching() {
  console.log('\n🧪 Testing Pattern Matching...\n')
  
  const patternTests = [
    {
      text: 'I have 20 kg of chicken manure available',
      expected: { wasteType: 'chicken_waste', quantity: '20 kg' }
    },
    {
      text: 'Looking for cow waste, about 5 sacks',
      expected: { wasteType: 'cow_waste', quantity: '5 sacks' }
    },
    {
      text: 'Free manure in Barangay Masbate',
      expected: { wasteType: 'manure', price: 'free', location: 'barangay masbate' }
    },
    {
      text: 'Can pick up tomorrow at 3pm',
      expected: { timeline: 'tomorrow at 3pm' }
    },
    {
      text: 'Price is 150 php per sack',
      expected: { price: '150 php' }
    }
  ]
  
  let passedTests = 0
  
  patternTests.forEach((test, index) => {
    console.log(`📝 Test ${index + 1}: "${test.text}"`)
    
    const extracted = AgriLinkAgent.extractTransactionInfo(test.text, {})
    console.log('🔍 Extracted:', extracted)
    console.log('✅ Expected:', test.expected)
    
    let testPassed = true
    for (const [key, expectedValue] of Object.entries(test.expected)) {
      if (!extracted[key] || !extracted[key].toLowerCase().includes(expectedValue.toLowerCase())) {
        console.log(`❌ Missing or incorrect: ${key}`)
        testPassed = false
      }
    }
    
    if (testPassed) {
      console.log('✅ PATTERN TEST PASSED')
      passedTests++
    } else {
      console.log('❌ PATTERN TEST FAILED')
    }
    
    console.log('─'.repeat(40))
  })
  
  console.log(`\n📊 Pattern Tests: ${passedTests}/${patternTests.length} passed`)
  return passedTests === patternTests.length
}

// Test suggestion generation for different roles
function testSuggestionGeneration() {
  console.log('\n🧪 Testing Suggestion Generation...\n')
  
  const suggestionTests = [
    {
      stage: 'inquiry',
      userRole: 'crop_farmer',
      expectedKeywords: ['offering', 'available', 'type']
    },
    {
      stage: 'inquiry',
      userRole: 'livestock_owner',
      expectedKeywords: ['interested', 'looking', 'need']
    },
    {
      stage: 'details_gathering',
      userRole: 'crop_farmer',
      expectedKeywords: ['much', 'available', 'location']
    },
    {
      stage: 'negotiation',
      userRole: 'crop_farmer',
      expectedKeywords: ['cost', 'price', 'pickup']
    },
    {
      stage: 'agreement_confirmation',
      userRole: 'crop_farmer',
      expectedKeywords: ['confirm', 'correct', 'agree']
    }
  ]
  
  let passedTests = 0
  
  suggestionTests.forEach((test, index) => {
    console.log(`📝 Suggestion Test ${index + 1}: ${test.stage} - ${test.userRole}`)
    
    const suggestions = AgriLinkAgent.generateSuggestions(
      test.stage,
      {},
      test.userRole,
      []
    )
    
    console.log(`💡 Generated ${suggestions.length} suggestions:`)
    suggestions.forEach((suggestion, i) => {
      console.log(`   ${i + 1}. "${suggestion}"`)
    })
    
    // Check if suggestions contain expected keywords
    const allSuggestions = suggestions.join(' ').toLowerCase()
    let hasExpectedKeywords = test.expectedKeywords.some(keyword => 
      allSuggestions.includes(keyword)
    )
    
    if (suggestions.length > 0 && hasExpectedKeywords) {
      console.log('✅ SUGGESTION TEST PASSED')
      passedTests++
    } else {
      console.log('❌ SUGGESTION TEST FAILED')
    }
    
    console.log('─'.repeat(40))
  })
  
  console.log(`\n📊 Suggestion Tests: ${passedTests}/${suggestionTests.length} passed`)
  return passedTests === suggestionTests.length
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting AgriLink Agent Test Suite...\n')
  console.log('=' * 60)
  
  const results = {
    conversationAnalysis: await testConversationAnalysis(),
    patternMatching: testPatternMatching(),
    suggestionGeneration: testSuggestionGeneration()
  }
  
  console.log('\n' + '=' * 60)
  console.log('📊 FINAL TEST RESULTS:')
  console.log(`🧠 Conversation Analysis: ${results.conversationAnalysis ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`🔍 Pattern Matching: ${results.patternMatching ? '✅ PASSED' : '❌ FAILED'}`)
  console.log(`💡 Suggestion Generation: ${results.suggestionGeneration ? '✅ PASSED' : '❌ FAILED'}`)
  
  const allPassed = Object.values(results).every(result => result)
  console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`)
  
  if (allPassed) {
    console.log('\n🎉 AgriLink Agent is ready for production!')
  } else {
    console.log('\n⚠️  Please review and fix the failing tests before deployment.')
  }
  
  return allPassed
}

// Export for use in other files or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testConversationAnalysis, testPatternMatching, testSuggestionGeneration }
} else {
  // Run tests if script is executed directly
  runAllTests().catch(console.error)
}
