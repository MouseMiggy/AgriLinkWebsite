import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/onboarding.module.css'

export default function Onboarding() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('home')

  const skipOnboarding = () => {
    // Mark onboarding as completed
    localStorage.setItem('agrilink_onboarding_completed', 'true')
    router.push('/signin')
  }

  const getStarted = () => {
    // Mark onboarding as completed
    localStorage.setItem('agrilink_onboarding_completed', 'true')
    router.push('/signup')
  }

  // For testing - clear localStorage to always show onboarding
  const resetOnboarding = () => {
    localStorage.removeItem('agrilink_onboarding_completed')
    window.location.reload()
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navHeight = 30 // Navigation bar height
      const elementPosition = element.offsetTop
      const offsetPosition = elementPosition - navHeight - (window.innerHeight / 2) + (element.offsetHeight / 2)
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    const updateActiveNav = () => {
      const sections = document.querySelectorAll('section, header')
      let current = ''
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop
        const sectionHeight = section.clientHeight
        if (window.pageYOffset >= (sectionTop - 200)) {
          current = section.getAttribute('id')
        }
      })
      
      setActiveSection(current)
    }

    window.addEventListener('scroll', updateActiveNav)
    window.addEventListener('load', updateActiveNav)
    
    return () => {
      window.removeEventListener('scroll', updateActiveNav)
      window.removeEventListener('load', updateActiveNav)
    }
  }, [])

  return (
    <div className={styles.onboardingWrapper}>
      <Head>
        <title>AgriLink PH | Livestock Waste Exchange Platform</title>
        <meta name="description" content="Connect livestock farmers with crop farmers to exchange organic waste materials in the Philippines. AgriLink helps turn waste into valuable fertilizer." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Raleway:wght@700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>

      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <a href="#home" className={styles.logo} onClick={(e) => { e.preventDefault(); scrollToSection('home') }}>
            <img src="/assets/images/AgrilinkLogo.png" alt="AgriLink Logo" />
          </a>
          <ul className={styles.navLinks}>
            <li><a href="#home" className={activeSection === 'home' ? styles.active : ''} onClick={(e) => { e.preventDefault(); scrollToSection('home') }}>Home</a></li>
            <li><a href="#how-it-works" className={activeSection === 'how-it-works' ? styles.active : ''} onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works') }}>How it works</a></li>
            <li><a href="#benefits" className={activeSection === 'benefits' ? styles.active : ''} onClick={(e) => { e.preventDefault(); scrollToSection('benefits') }}>Benefits</a></li>
            <li><a href="#suggestion-list" className={activeSection === 'suggestion-list' ? styles.active : ''} onClick={(e) => { e.preventDefault(); scrollToSection('suggestion-list') }}>Listings</a></li>
          </ul>
          <div className={styles.navButtons}>
            <button className={styles.signinBtn} onClick={skipOnboarding}>Sign In</button>
            <button className={styles.signupBtn} onClick={getStarted}>Sign Up</button>
          </div>
        </div>
      </nav>
      
      <header id="home" className={styles.header}>
        <h1>Connecting Livestock Waste to Crop Farmers</h1>
        <p>AgriLink transforms organic waste into valuable resources, creating sustainable partnerships between livestock and crop farmers <br />across the Philippines.</p>
        <div>
          <button className={styles.btn} onClick={() => scrollToSection('suggestion-list')}>Suggestion List</button>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => scrollToSection('how-it-works')}>Learn More</button>
        </div>
      </header>
      
      <section id="how-it-works" className={`${styles.container} ${styles.howItWorksSection}`}>
        <h2 className={styles.sectionTitle}>How AgriLink Works</h2>
        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3>Sign Up</h3>
            <p>Create your AgriLink account and set up your farmer profile with your location and farming details</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3>List Materials</h3>
            <p>Livestock farmers list available manure, compost, or other organic waste materials with quantities</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3>Search & Connect</h3>
            <p>Crop farmers search for organic fertilizers in their area and connect with suppliers nearby</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <h3>Negotiate Terms</h3>
            <p>Both parties communicate and agree on terms - pricing, quantities, delivery, or pickup arrangements</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>5</div>
            <h3>Complete Exchange</h3>
            <p>Finalize the transaction, arrange transportation, and complete the sustainable waste-to-resource exchange</p>
          </div>
        </div>
      </section>

      <section id="benefits" className={`${styles.container} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Benefits of Using AgriLink</h2>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitCard}>
            <div className={styles.benefitImage}>
              <img src="https://cdn.wikifarmer.com/images/detailed/2023/03/Training-livestock-farmers-for-sustainability-and-food-security.jpg" alt="For Livestock Farmers" />
            </div>
            <h3><span className={styles.benefitIcon}>🌱</span>For Livestock Farmers</h3>
            <p>Turn waste into profit by selling excess manure. Reduce disposal costs and environmental impact while contributing to sustainable agriculture.</p>
          </div>
          <div className={styles.benefitCard}>
            <div className={styles.benefitImage}>
              <img src="https://images.stockcake.com/public/e/6/e/e6e4865c-08b7-4633-b428-f5658462485e_large/farmers-tending-crops-stockcake.jpg" alt="For Crop Farmers" />
            </div>
            <h3><span className={styles.benefitIcon}>🌾</span>For Crop Farmers</h3>
            <p>Access affordable, high-quality organic fertilizer. Improve soil health and reduce chemical fertilizer costs with locally-sourced nutrients.</p>
          </div>
          <div className={styles.benefitCard}>
            <div className={styles.benefitImage}>
              <img src="https://naturesbeckon.org/wp-content/uploads/2022/05/environment.jpg" alt="For the Environment" />
            </div>
            <h3><span className={styles.benefitIcon}>♻️</span>For the Environment</h3>
            <p>Close the nutrient loop in agriculture. Reduce methane emissions from decomposing waste and prevent water contamination from runoff.</p>
          </div>
        </div>
      </section>

      <section id="suggestion-list" className={`${styles.container} ${styles.section}`}>
        <h2 className={styles.sectionTitle}>Suggestion List for Crop Farmers</h2>
        <div className={styles.listings}>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/6cd44865-88c8-403d-8e89-9efebd92b797.png" alt="Chicken Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Chicken Manure</h3>
              <p>Rich in nitrogen, chicken manure is excellent for leafy vegetables like lettuce, spinach, and cabbage. It promotes fast growth and lush green leaves.</p>
            </div>
          </div>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/22e8a4a0-4338-4022-841f-ff1dbdfc46da.png" alt="Composted Pig Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Composted Pig Manure</h3>
              <p>Composted pig manure improves soil structure and water retention, making it ideal for root crops such as carrots, potatoes, and sweet potatoes.</p>
            </div>
          </div>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/1f9b8452-0a8e-49b2-b20e-a0243838c4e4.png" alt="Pre-processed Cattle Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Pre-processed Cattle Manure</h3>
              <p>Cattle manure is a balanced fertilizer, suitable for grains like rice and corn. It adds organic matter and improves overall crop yield and soil health.</p>
            </div>
          </div>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://media.istockphoto.com/id/1494737370/photo/photo-of-goat-manure.jpg?s=612x612&w=0&k=20&c=l2wXRSHQssz9H2WtndtZMUQzSoip8BM3F5egQ5Y6nd0=" alt="Goat Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Goat Manure</h3>
              <p>Goat manure is dry, easy to handle, and rich in nutrients. It is ideal for vegetable gardens and flowering plants, improving soil aeration and fertility.</p>
            </div>
          </div>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://www.waldeneffect.org/20140516dampducks.jpg" alt="Duck Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Duck Manure</h3>
              <p>Duck manure is high in nitrogen and potassium, making it excellent for fruiting plants and vegetables. It decomposes quickly and enriches the soil.</p>
            </div>
          </div>
          <div className={styles.listingCard}>
            <div className={styles.listingImage}>
              <img src="https://cdn.shopify.com/s/files/1/0955/4450/files/IMG_0031_Large_77abb180-0b30-4812-bb10-f81c77e742be_1024x1024.jpg?v=1749688044" alt="Rabbit Manure" />
            </div>
            <div className={styles.listingContent}>
              <h3 className={styles.listingTitle}>Rabbit Manure</h3>
              <p>Rabbit manure is considered a "cold" manure, safe to use directly on plants. It is perfect for vegetable beds, herbs, and nurseries, providing quick nutrient boost.</p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerAbout}>
            <div className={styles.footerLogo}>Agri<span>Link</span></div>
            <p>Connecting livestock and crop farmers throughout the Philippines to create a sustainable agricultural ecosystem.</p>
            <div className={styles.socialLinks}>
              <a href="#"><i className="fab fa-facebook-f"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
              <a href="#"><i className="fab fa-youtube"></i></a>
            </div>
          </div>
          <div className={styles.footerLinks}>
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToSection('how-it-works') }}>How It Works</a></li>
              <li><a href="#suggestion-list" onClick={(e) => { e.preventDefault(); scrollToSection('suggestion-list') }}>Suggestion List</a></li>
              <li><a href="#marketplace">Marketplace</a></li>
              <li><a href="#benefits" onClick={(e) => { e.preventDefault(); scrollToSection('benefits') }}>Benefits</a></li>
            </ul>
          </div>
          <div className={styles.footerLinks}>
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Composting Guide</a></li>
              <li><a href="#">Livestock Management</a></li>
              <li><a href="#">Organic Farming</a></li>
              <li><a href="#">FAQ</a></li>
            </ul>
          </div>
          <div className={styles.footerLinks}>
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Safety Guidelines</a></li>
            </ul>
          </div>
        </div>
        <div className={styles.copyright}>
          <p>&copy; 2025 AgriLink Philippines. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
