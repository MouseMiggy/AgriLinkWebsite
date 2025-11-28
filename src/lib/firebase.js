import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase config - same as mobile app
const firebaseConfig = {
  apiKey: "AIzaSyCcdKYwcKw4QH_R5plTAa9Yd4IKDv48oro",
  authDomain: "agrilinkapp-fed09.firebaseapp.com",
  projectId: "agrilinkapp-fed09",
  storageBucket: "agrilinkapp-fed09.firebasestorage.app",
  messagingSenderId: "1072986746954",
  appId: "1:1072986746954:web:6dd2c1035d3d4612d176b3"
}

// Initialize Firebase only on client side
let app, auth, db, storage

if (typeof window !== 'undefined') {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

export { auth, db, storage }
export default app
