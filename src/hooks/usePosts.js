// Custom Hook - Posts Data Management
import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export const usePosts = (user) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load posts from Firebase
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const postsRef = collection(db, 'Posts')
    const q = query(postsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setPosts(postsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading posts:', error)
        setError(error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Create new post
  const createPost = async (postData) => {
    try {
      const docRef = await addDoc(collection(db, 'Posts'), {
        ...postData,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: []
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  // Update post
  const updatePost = async (postId, updates) => {
    try {
      const postRef = doc(db, 'Posts', postId)
      await updateDoc(postRef, {
        ...updates,
        editedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating post:', error)
      throw error
    }
  }

  // Delete post
  const deletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, 'Posts', postId))
    } catch (error) {
      console.error('Error deleting post:', error)
      throw error
    }
  }

  // Like/Unlike post
  const toggleLike = async (postId, isLiked) => {
    try {
      const postRef = doc(db, 'Posts', postId)
      
      if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
          likes: posts.find(p => p.id === postId)?.likes - 1 || 0,
          likedBy: arrayRemove(user.uid)
        })
      } else {
        // Like
        await updateDoc(postRef, {
          likes: posts.find(p => p.id === postId)?.likes + 1 || 1,
          likedBy: arrayUnion(user.uid)
        })
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      throw error
    }
  }

  // Add comment to post
  const addComment = async (postId, commentText) => {
    try {
      const postRef = doc(db, 'Posts', postId)
      const comment = {
        id: Date.now().toString(),
        text: commentText,
        userId: user.uid,
        userName: user.displayName || user.email,
        createdAt: new Date()
      }

      await updateDoc(postRef, {
        comments: arrayUnion(comment)
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    addComment
  }
}
