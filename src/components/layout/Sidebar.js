// Layout Component - Left Navigation Sidebar
import React from 'react'
import { useRouter } from 'next/router'
import styles from '../../../styles/modules/Sidebar.module.css'

const Sidebar = ({ activeMenuItem, setActiveMenuItem, user, onMenuItemClick }) => {
  const router = useRouter()

  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      icon: '/assets/icons/home.png',
      onClick: () => {
        setActiveMenuItem('home')
        onMenuItemClick?.('home')
      }
    },
    {
      id: 'search',
      label: 'Search',
      icon: '/assets/icons/search.png',
      onClick: () => {
        setActiveMenuItem('search')
        onMenuItemClick?.('search')
      }
    },
    {
      id: 'listings',
      label: 'Listings',
      icon: '/assets/icons/listing.png',
      onClick: () => {
        setActiveMenuItem('listings')
        router.push('/listings')
      }
    },
    {
      id: 'transactions',
      label: 'Transaction History',
      icon: '/assets/icons/time-past.png',
      onClick: () => {
        setActiveMenuItem('transactions')
        onMenuItemClick?.('transactions')
      }
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: '/assets/icons/bell.png',
      onClick: () => {
        setActiveMenuItem('notifications')
        onMenuItemClick?.('notifications')
      }
    },
    {
      id: 'reports',
      label: 'My Reports',
      icon: '/assets/icons/triangle-warning.png',
      onClick: () => {
        setActiveMenuItem('reports')
        onMenuItemClick?.('reports')
      }
    }
  ]

  return (
    <aside className={styles.sidebar}>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoContainer}>
          <img 
            src="/assets/images/AgrilinkLogo.png" 
            alt="AgriLink Logo" 
            className={styles.logo} 
          />
        </div>
        
        {/* Menu Items */}
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${activeMenuItem === item.id ? styles.active : ''}`}
              onClick={item.onClick}
            >
              <img 
                src={item.icon} 
                alt={item.label} 
                className={styles.menuIcon} 
              />
              <span className={styles.menuText}>{item.label}</span>
            </button>
          ))}
          
          {/* Profile */}
          <button className={styles.menuItem}>
            <div className={styles.profileAvatar}>
              {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className={styles.menuText}>Profile</span>
          </button>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar
