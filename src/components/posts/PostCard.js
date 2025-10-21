// Post Component - Individual Post Card
import React, { useState } from 'react'
import PostDropdown from './PostDropdown'
import PostActions from './PostActions'
import PostCarousel from './PostCarousel'
import styles from '../../../styles/modules/PostCard.module.css'

const PostCard = ({ 
  post, 
  currentUser, 
  onLike, 
  onComment, 
  onEdit, 
  onDelete, 
  onReport,
  formatTimeAgo 
}) => {
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const isOwnPost = currentUser?.uid === post.userId

  const getPostImages = (post) => {
    if (!post) return []
    
    // Priority order: use the most comprehensive image source available
    if (post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0) {
      return post.imageUrls.filter(Boolean)
    }
    
    if (post.images && Array.isArray(post.images) && post.images.length > 0) {
      return post.images.filter(Boolean)
    }
    
    if (post.imageUrl || post.image) {
      return [post.imageUrl || post.image].filter(Boolean)
    }
    
    return []
  }

  const images = getPostImages(post)

  return (
    <div className={styles.post}>
      {/* Post Header */}
      <div className={styles.header}>
        <div className={styles.avatar}>
          {post.userName ? post.userName[0].toUpperCase() : 'U'}
        </div>
        <div className={styles.info}>
          <h4 className={styles.author}>{post.userName || 'Anonymous'}</h4>
          <span className={styles.time}>
            {formatTimeAgo(post.createdAt)}
            {post.editedAt && <span className={styles.edited}> (edited)</span>}
          </span>
        </div>
        
        {/* Post Options Dropdown */}
        <PostDropdown
          post={post}
          isOwnPost={isOwnPost}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          onEdit={onEdit}
          onDelete={onDelete}
          onReport={onReport}
        />
      </div>

      {/* Post Content */}
      <div className={styles.content}>
        <p className={styles.text}>{post.text}</p>
        
        {/* Media Content */}
        {images.length > 0 && (
          <PostCarousel
            images={images}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
          />
        )}
        
        {post.videoUrl && (
          <div className={styles.videoContainer}>
            <video controls className={styles.video}>
              <source src={post.videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* Post Actions */}
      <PostActions
        post={post}
        currentUser={currentUser}
        onLike={onLike}
        onComment={onComment}
      />
    </div>
  )
}

export default PostCard
