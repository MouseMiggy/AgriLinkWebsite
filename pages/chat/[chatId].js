import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../../lib/firebase'
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  updateDoc,
  setDoc,
  where,
  getDocs
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import styles from '../../styles/chatroom.module.css'

export default function ChatRoom() {
  const router = useRouter()
  const { chatId } = router.query
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Ensure immediate scroll to bottom when chat loads with existing messages
  useEffect(() => {
    if (messages.length > 0) {
      // First scroll immediately without animation for initial load
      setTimeout(() => scrollToBottom(false), 50)
      // Then a smooth scroll to ensure we're at the bottom
      setTimeout(() => scrollToBottom(true), 150)
    }
  }, [messages.length > 0])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Load other user info from chat document
  useEffect(() => {
    if (!chatId || !user) return

    const loadOtherUser = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId))
        if (chatDoc.exists()) {
          const chatData = chatDoc.data()
          const participants = chatId.split('_')
          const otherUserId = participants.find(id => id !== user.uid)
          
          if (otherUserId && chatData.participantNames) {
            const otherUserName = chatData.participantNames[otherUserId] || 'User'
            const otherUserEmail = chatData.participantEmails?.[otherUserId] || ''
            setOtherUser({ 
              id: otherUserId, 
              name: otherUserName,
              email: otherUserEmail 
            })
          }
        }
      } catch (error) {
        console.error('Error loading other user:', error)
      }
    }

    loadOtherUser()
  }, [chatId, user])

  // Listen to messages
  useEffect(() => {
    if (!chatId) return

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    const q = query(messagesRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMessages(messagesList)

      // Mark messages as read
      if (user) {
        snapshot.docs.forEach(async (messageDoc) => {
          const messageData = messageDoc.data()
          if (messageData.senderId !== user.uid && !messageData.read) {
            await updateDoc(messageDoc.ref, {
              read: true
            })
          }
        })
      }
    })

    return () => unsubscribe()
  }, [chatId, user])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !user || !otherUser) return

    setSending(true)
    try {
      const messageData = {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || 'User',
        receiverId: otherUser.id,
        createdAt: new Date(),
        read: false
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)

      // Update or create chat document with last message info and participant names
      const chatRef = doc(db, 'chats', chatId)
      const chatDoc = await getDoc(chatRef)
      
      const chatUpdateData = {
        lastMessage: newMessage.trim(),
        lastMessageTime: new Date(),
        lastMessageSenderId: user.uid,
        participants: [user.uid, otherUser.id]
      }
      
      // Add participant names if not already present
      if (!chatDoc.exists() || !chatDoc.data().participantNames) {
        chatUpdateData.participantNames = {
          [user.uid]: user.displayName || 'User',
          [otherUser.id]: otherUser.name || 'User'
        }
        chatUpdateData.participantEmails = {
          [user.uid]: user.email || '',
          [otherUser.id]: otherUser.email || ''
        }
      }
      
      if (chatDoc.exists()) {
        await updateDoc(chatRef, chatUpdateData)
      } else {
        await setDoc(chatRef, chatUpdateData)
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!user) {
    router.push('/signin')
    return null
  }

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <button 
          className={styles.backButton}
          onClick={() => router.push('/dashboard')}
        >
          <img src="/assets/icons/back.png" alt="Back" className={styles.backIcon} />
        </button>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {otherUser?.name ? otherUser.name[0].toUpperCase() : 'U'}
          </div>
          <div className={styles.userDetails}>
            <h3 className={styles.userName}>{otherUser?.name || 'User'}</h3>
            <span className={styles.userStatus}>Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyMessages}>
            <img src="/assets/icons/chat.png" alt="No messages" className={styles.emptyIcon} />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.senderId === user.uid
            const showTime = index === 0 || 
              (messages[index - 1] && 
               new Date(message.createdAt?.toDate?.() || message.createdAt) - 
               new Date(messages[index - 1].createdAt?.toDate?.() || messages[index - 1].createdAt) > 300000)

            return (
              <div key={message.id} className={styles.messageGroup}>
                {showTime && (
                  <div className={styles.timeStamp}>
                    {formatTime(message.createdAt)}
                  </div>
                )}
                <div className={`${styles.message} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}>
                  <div className={styles.messageContent}>
                    <p className={styles.messageText}>{message.text}</p>
                  </div>
                  {isOwnMessage && (
                    <div className={styles.messageStatus}>
                      {message.read ? (
                        <img src="/assets/icons/read.png" alt="Read" className={styles.statusIcon} />
                      ) : (
                        <img src="/assets/icons/sent.png" alt="Sent" className={styles.statusIcon} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className={styles.messageInputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className={styles.messageInput}
            rows={1}
            disabled={sending}
          />
          <button 
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className={styles.sendButton}
          >
            <img src="/assets/icons/send.png" alt="Send" className={styles.sendIcon} />
          </button>
        </div>
      </div>
    </div>
  )
}
