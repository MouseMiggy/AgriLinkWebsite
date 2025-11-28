import { useState } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'

export const usePostHandlers = (user) => {
  const [likingPosts, setLikingPosts] = useState(new Set())
  const [commenting, setCommenting] = useState(false)

  const handleLikePost = async (post) => {
    if (!user || !post) return
    
    const postId = post.id
    const userId = user.uid
    
    // Prevent multiple simultaneous likes
    if (likingPosts.has(postId)) return
    
    setLikingPosts(prev => new Set(prev).add(postId))
    
    try {
      const postRef = doc(db, 'Posts', postId)
      const isLiked = post.likes?.includes(userId)
      
      if (isLiked) {
        // Unlike the post
        await updateDoc(postRef, {
          likes: post.likes.filter(id => id !== userId),
          likesCount: increment(-1)
        })
      } else {
        // Like the post
        await updateDoc(postRef, {
          likes: [...(post.likes || []), userId],
          likesCount: increment(1)
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleAddComment = async (postId, commentText, user) => {
    if (!commentText.trim() || !user || !db) return

    setCommenting(true)
    try {
      const postRef = doc(db, 'Posts', postId)
      const commentData = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: commentText.trim(),
        author: user.displayName || 'Anonymous',
        authorId: user.uid,
        createdAt: serverTimestamp(),
        likes: [],
        likesCount: 0,
        replies: []
      }

      await updateDoc(postRef, {
        comments: arrayUnion(commentData),
        commentsCount: increment(1)
      })

      return commentData
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    } finally {
      setCommenting(false)
    }
  }

  const handleAddReply = async (postId, commentId, replyText, user, parentReplyId = null) => {
    if (!replyText.trim() || !user || !db) return

    try {
      const postRef = doc(db, 'Posts', postId)
      const replyData = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: replyText.trim(),
        author: user.displayName || 'Anonymous',
        authorId: user.uid,
        createdAt: serverTimestamp(),
        likes: [],
        likesCount: 0,
        parentReplyId: parentReplyId || null
      }

      // Get the current post data
      const postDoc = await getDoc(postRef)
      if (!postDoc.exists()) return

      const postData = postDoc.data()
      const comments = postData.comments || []

      // Find the comment and add the reply
      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), replyData],
            repliesCount: (comment.repliesCount || 0) + 1
          }
        }
        return comment
      })

      await updateDoc(postRef, { comments: updatedComments })
      return replyData
    } catch (error) {
      console.error('Error adding reply:', error)
      throw error
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'now'
    
    const now = new Date()
    let postTime
    
    if (timestamp.toDate) {
      postTime = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      postTime = timestamp
    } else if (timestamp.seconds) {
      postTime = new Date(timestamp.seconds * 1000)
    } else {
      postTime = new Date(timestamp)
    }
    
    const diffInSeconds = Math.floor((now - postTime) / 1000)
    
    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    return `${Math.floor(diffInSeconds / 31536000)}y ago`
  }

  return {
    handleLikePost,
    handleAddComment,
    handleAddReply,
    formatTimeAgo,
    likingPosts,
    commenting
  }
}
