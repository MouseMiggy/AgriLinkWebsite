// Test script to verify bidirectional chat functionality
// This script creates test data to verify chat works between users

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDjXqFItKlBNiEHWOE8kpgFhzRhJTN5jrM",
  authDomain: "agrilinkapp-fed09.firebaseapp.com",
  projectId: "agrilinkapp-fed09",
  storageBucket: "agrilinkapp-fed09.firebasestorage.app",
  messagingSenderId: "1056467350404",
  appId: "1:1056467350404:web:7b8a4c5d9e2f1a3b4c5d6e"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function createTestChat() {
  try {
    // Create test users
    const user1Id = 'test_user_1'
    const user2Id = 'test_user_2'
    
    await setDoc(doc(db, 'users', user1Id), {
      name: 'John Farmer',
      email: 'john@test.com',
      firstName: 'John',
      lastName: 'Farmer'
    })
    
    await setDoc(doc(db, 'users', user2Id), {
      name: 'Jane Buyer',
      email: 'jane@test.com',
      firstName: 'Jane',
      lastName: 'Buyer'
    })
    
    // Create chat ID (sorted)
    const chatId = [user1Id, user2Id].sort().join('_')
    
    // Create chat document
    await setDoc(doc(db, 'chats', chatId), {
      participants: [user1Id, user2Id],
      lastMessage: 'Hello! I\'m interested in your livestock.',
      lastMessageTime: new Date(),
      lastMessageSenderId: user2Id
    })
    
    // Add test messages
    const messages = [
      {
        text: 'Hello! I\'m interested in your livestock.',
        senderId: user2Id,
        senderName: 'Jane Buyer',
        receiverId: user1Id,
        createdAt: new Date(Date.now() - 300000), // 5 minutes ago
        read: false
      },
      {
        text: 'Hi Jane! Which animals are you looking for?',
        senderId: user1Id,
        senderName: 'John Farmer',
        receiverId: user2Id,
        createdAt: new Date(Date.now() - 240000), // 4 minutes ago
        read: true
      },
      {
        text: 'I\'m looking for dairy cows. Do you have any available?',
        senderId: user2Id,
        senderName: 'Jane Buyer',
        receiverId: user1Id,
        createdAt: new Date(Date.now() - 180000), // 3 minutes ago
        read: false
      },
      {
        text: 'Yes, I have several Holstein cows available. Would you like to see them?',
        senderId: user1Id,
        senderName: 'John Farmer',
        receiverId: user2Id,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
        read: true
      }
    ]
    
    // Add messages to chat
    for (const message of messages) {
      await addDoc(collection(db, 'chats', chatId, 'messages'), message)
    }
    
    console.log('Test chat created successfully!')
    console.log('Chat ID:', chatId)
    console.log('User 1 (John):', user1Id)
    console.log('User 2 (Jane):', user2Id)
    
  } catch (error) {
    console.error('Error creating test chat:', error)
  }
}

// Run the test
createTestChat()
