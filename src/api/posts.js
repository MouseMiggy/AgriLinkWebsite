// Backend API - Posts Service
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore'
import { db } from '../../lib/firebase'

export class PostsAPI {
  static async createPost(postData, userId, userName) {
    try {
      const docRef = await addDoc(collection(db, 'Posts'), {
        ...postData,
        userId,
        userName,
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        comments: []
      })
      return docRef.id
    } catch (error) {
      console.error('Error creating post:', error)
      throw new Error('Failed to create post')
    }
  }

  static async updatePost(postId, updates) {
    try {
      const postRef = doc(db, 'Posts', postId)
      await updateDoc(postRef, {
        ...updates,
        editedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating post:', error)
      throw new Error('Failed to update post')
    }
  }

  static async deletePost(postId) {
    try {
      await deleteDoc(doc(db, 'Posts', postId))
    } catch (error) {
      console.error('Error deleting post:', error)
      throw new Error('Failed to delete post')
    }
  }

  static async getPost(postId) {
    try {
      const postDoc = await getDoc(doc(db, 'Posts', postId))
      if (postDoc.exists()) {
        return { id: postDoc.id, ...postDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error getting post:', error)
      throw new Error('Failed to get post')
    }
  }

  static async getUserPosts(userId) {
    try {
      const q = query(
        collection(db, 'Posts'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error getting user posts:', error)
      throw new Error('Failed to get user posts')
    }
  }

  static async likePost(postId, userId) {
    try {
      const postRef = doc(db, 'Posts', postId)
      const postDoc = await getDoc(postRef)
      
      if (postDoc.exists()) {
        const currentLikes = postDoc.data().likes || 0
        await updateDoc(postRef, {
          likes: currentLikes + 1,
          likedBy: arrayUnion(userId)
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
      throw new Error('Failed to like post')
    }
  }

  static async unlikePost(postId, userId) {
    try {
      const postRef = doc(db, 'Posts', postId)
      const postDoc = await getDoc(postRef)
      
      if (postDoc.exists()) {
        const currentLikes = Math.max(0, (postDoc.data().likes || 1) - 1)
        await updateDoc(postRef, {
          likes: currentLikes,
          likedBy: arrayRemove(userId)
        })
      }
    } catch (error) {
      console.error('Error unliking post:', error)
      throw new Error('Failed to unlike post')
    }
  }

  static async addComment(postId, comment) {
    try {
      const postRef = doc(db, 'Posts', postId)
      await updateDoc(postRef, {
        comments: arrayUnion({
          ...comment,
          id: Date.now().toString(),
          createdAt: new Date()
        })
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      throw new Error('Failed to add comment')
    }
  }

  static async deleteComment(postId, commentId) {
    try {
      const postRef = doc(db, 'Posts', postId)
      const postDoc = await getDoc(postRef)
      
      if (postDoc.exists()) {
        const comments = postDoc.data().comments || []
        const updatedComments = comments.filter(comment => comment.id !== commentId)
        
        await updateDoc(postRef, {
          comments: updatedComments
        })
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      throw new Error('Failed to delete comment')
    }
  }
}
