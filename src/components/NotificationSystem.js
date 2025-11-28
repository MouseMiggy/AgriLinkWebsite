import React, { useState } from 'react';
import styles from '../../styles/modules/dashboard.module.css';
import { markAllNotificationsAsRead, markNotificationAsRead } from '../lib/notificationService';

const NotificationSystem = ({ user, unreadCount, setUnreadCount, notifications, setNotifications }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return 'now';
    
    const now = new Date();
    let notificationTime;
    
    if (timestamp.toDate) {
      notificationTime = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      notificationTime = timestamp;
    } else {
      notificationTime = new Date(timestamp);
    }
    
    if (isNaN(notificationTime.getTime())) {
      return 'now';
    }
    
    const diffMs = now - notificationTime;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    return `${Math.floor(diffDays / 7)}w`;
  };

  const handleNotificationClick = async (notification) => {
    console.log('Notification clicked:', notification);
    setShowNotifications(false);
    
    // Mark notification as read if it's unread
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        // Update local state to reflect the change immediately
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'post_like':
      case 'post_comment':
      case 'comment_reply':
        // ... (rest of the function)
        break;
      // ... other cases ...
    }
  };

  return (
    <div className={styles.floatingNotifications}>
      <div 
        className={styles.notificationsButton}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (showNotifications) {
            setShowNotifications(false);
            document.body.style.overflow = 'auto';
          } else {
            if (showChat) { // Note: showChat is not available here, we might need to pass it or lift state up
              // We'll remove this part for now and handle it in the parent
            }
            setShowNotifications(true);
          }
        }}
        onMouseEnter={() => {
          document.body.style.overflow = 'hidden';
        }}
        onMouseLeave={() => {
          document.body.style.overflow = 'auto';
        }}
      >
        <img src="/assets/icons/bell.png" alt="Notifications" className={styles.notificationIcon} />
        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      
      {showNotifications && (
        <div 
          className={styles.notificationsDropdown}
          onMouseEnter={() => {
            document.body.style.overflow = 'hidden';
          }}
          onMouseLeave={() => {
            document.body.style.overflow = 'auto';
          }}
        >
          <div className={styles.notificationsHeader}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className={styles.markAllReadBtn}
                onClick={async () => {
                  await markAllNotificationsAsRead(user.uid);
                  setUnreadCount(0);
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className={styles.notificationsList}>
            {notifications.length === 0 ? (
              <div className={styles.noNotifications}>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications
                .sort((a, b) => {
                  const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                  const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                  return timeB - timeA;
                })
                .slice(0, 10)
                .map((notification) => (
                  <div 
                    key={notification.id}
                    className={`${styles.notificationItem} ${!notification.read ? styles.unread : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={styles.notificationAvatar}>
                      {notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName[0].toUpperCase() : 'A'}
                    </div>
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationMainText}>
                        <span>
                          {notification.type === 'listing_request' ? (
                            `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'A crop farmer'} is interested in your listing: ${notification.listingName || 'your listing'}`
                          ) : notification.type === 'report_status' ? (
                            `${notification.message || 'Your content has been reported'}`
                          ) : notification.type === 'comment_reply' ? (
                            `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'Someone'} replied to your comment`
                          ) : (
                            `${notification.fromUserName && notification.fromUserName !== 'Someone' ? notification.fromUserName : 'AgriLink User'} ${notification.actionText || (notification.actionType === 'like' ? 'liked your post' : 'commented on your post')}`
                          )}
                        </span>
                      </div>
                      {notification.type === 'report_status' && notification.reportReason && (
                        <div className={styles.notificationSubText}>
                          <span style={{ fontSize: '12px', color: '#e74c3c' }}>Reason: {notification.reportReason}</span>
                        </div>
                      )}
                      <div className={styles.notificationTimeLine}>
                        <span className={styles.notificationTime}>
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.notificationIcon}>
                      {notification.type === 'listing_request' ? (
                        <img src="/assets/icons/listing.png" alt="Listing Request" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                      ) : notification.type === 'report_status' ? (
                        <img src="/assets/icons/triangle-warning.png" alt="Report" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                      ) : notification.type === 'comment_reply' ? (
                        <img src="/assets/icons/comment-all-dots.png" alt="Reply" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                      ) : notification.actionType === 'like' ? (
                        <img src="/assets/icons/red-heart.png" alt="Like" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                      ) : (
                        <img src="/assets/icons/comment-all-dots.png" alt="Comment" style={{width: '28px', height: '28px', pointerEvents: 'none'}} />
                      )}
                    </div>
                    {!notification.read && <div className={styles.unreadDot}></div>}
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSystem;
