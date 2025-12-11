import { useState } from 'react'
import { db } from '../lib/firebase'
import { doc, updateDoc, increment, arrayUnion, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { sendPostLikeNotification, sendCommentNotification, sendCommentReplyNotification } from '../lib/notificationService'

export const usePostHandlers = (user) => {
  const [likingPosts, setLikingPosts] = useState(new Set())
  const [commenting, setCommenting] = useState(false)

  const handleLikePost = async (post) => {
    if (!user || !post) {
      console.log('❌ No user or post')
      return
    }
    
    const postId = post.id
    const userId = user.uid
    
    console.log('👍 Like button clicked:', { postId, userId })
    
    // Prevent multiple simultaneous likes
    if (likingPosts.has(postId)) {
      console.log('⏳ Already processing like for this post')
      return
    }
    
    setLikingPosts(prev => new Set(prev).add(postId))
    
    try {
      const postRef = doc(db, 'Posts', postId)
      
      // Get current post data to check like status
      const postDoc = await getDoc(postRef)
      if (!postDoc.exists()) {
        console.log('❌ Post not found')
        return
      }
      
      const currentData = postDoc.data()
      const currentLikes = currentData.likes || []
      const isLiked = currentLikes.includes(userId)
      
      console.log('📊 Current state:', { 
        currentLikes, 
        currentLikesCount: currentData.likesCount,
        isLiked 
      })
      
      if (isLiked) {
        // Unlike the post
        const newLikes = currentLikes.filter(id => id !== userId)
        console.log('💔 Unliking post, new count:', newLikes.length)
        await updateDoc(postRef, {
          likes: newLikes,
          likesCount: newLikes.length,
          likedBy: newLikes // Keep backward compatibility
        })
      } else {
        // Like the post
        const newLikes = [...currentLikes, userId]
        console.log('❤️ Liking post, new count:', newLikes.length)
        await updateDoc(postRef, {
          likes: newLikes,
          likesCount: newLikes.length,
          likedBy: newLikes // Keep backward compatibility
        })
        
        // Send notification to post owner
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Someone'
        await sendPostLikeNotification(postId, post.userId, userId, userName)
      }
      
      console.log('✅ Like updated successfully')
    } catch (error) {
      console.error('❌ Error liking post:', error)
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const handleAddComment = async (postId, commentText, user) => {
    if (!commentText.trim() || !user || !db) {
      console.log('❌ Cannot add comment: missing data')
      return
    }

    console.log('💬 Adding comment to post:', postId)
    setCommenting(true)
    
    try {
      const postRef = doc(db, 'Posts', postId)
      
      // Get post data to find the owner and current comments
      const postDoc = await getDoc(postRef)
      if (!postDoc.exists()) {
        throw new Error('Post not found')
      }
      const postData = postDoc.data()
      const currentComments = postData.comments || []
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Anonymous'
      
      const commentData = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: commentText.trim(),
        userName: userName,
        userId: user.uid,
        userEmail: user.email,
        userProfilePicture: user.profilePicture || null,
        createdAt: new Date().toISOString(),
        likes: [],
        likesCount: 0,
        replies: []
      }

      console.log('📝 Comment data:', commentData)

      // Add comment to array and update count
      const newComments = [...currentComments, commentData]
      await updateDoc(postRef, {
        comments: newComments,
        commentsCount: newComments.length
      })

      console.log('✅ Comment added successfully, new count:', newComments.length)

      // Send notification to post owner
      await sendCommentNotification(postId, postData.userId, user.uid, userName, commentText.trim())

      return commentData
    } catch (error) {
      console.error('❌ Error adding comment:', error)
      throw error
    } finally {
      setCommenting(false)
    }
  }

  const handleAddReply = async (postId, commentId, replyText, user, parentReplyId = null) => {
    if (!replyText.trim() || !user || !db) return

    try {
      const postRef = doc(db, 'Posts', postId)
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Anonymous'
      
      const replyData = {
        id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: replyText.trim(),
        userName: userName,
        userId: user.uid,
        userEmail: user.email,
        userProfilePicture: user.profilePicture || null,
        createdAt: new Date().toISOString(),
        likes: [],
        likesCount: 0,
        parentReplyId: parentReplyId || null
      }

      // Get the current post data
      const postDoc = await getDoc(postRef)
      if (!postDoc.exists()) return

      const postData = postDoc.data()
      const comments = postData.comments || []

      // Find the comment to get the original commenter's ID
      let originalCommenterId = null
      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          originalCommenterId = comment.authorId || comment.userId
          return {
            ...comment,
            replies: [...(comment.replies || []), replyData],
            repliesCount: (comment.repliesCount || 0) + 1
          }
        }
        return comment
      })

      // Calculate total comment count (comments + all replies)
      let totalCount = updatedComments.length
      updatedComments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          totalCount += comment.replies.length
        }
      })

      await updateDoc(postRef, { 
        comments: updatedComments,
        commentsCount: totalCount
      })
      
      // Send notification to the original commenter
      if (originalCommenterId) {
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'Someone'
        await sendCommentReplyNotification(postId, originalCommenterId, user.uid, userName, replyText.trim())
      }
      
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
