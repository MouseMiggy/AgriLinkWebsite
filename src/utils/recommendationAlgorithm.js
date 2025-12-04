import { db } from '../lib/firebase'
import { getDoc, doc, getDocs, collection } from 'firebase/firestore'

// User profile cache to optimize performance
const userProfileCache = new Map()
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

// Cache helper functions
const getCachedUserProfile = async (userId) => {
  if (userProfileCache.has(userId)) {
    const cached = userProfileCache.get(userId)
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log('📦 Using cached user profile for:', userId)
      return cached.data
    } else {
      userProfileCache.delete(userId)
    }
  }
  
  console.log('🔍 Fetching user profile for:', userId)
  const userDoc = await getDoc(doc(db, 'Users', userId))
  if (userDoc.exists()) {
    const userData = userDoc.data()
    userProfileCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    })
    return userData
  }
  
  return null
}

// Clear cache helper
const clearUserProfileCache = () => {
  userProfileCache.clear()
  console.log('🗑️ User profile cache cleared')
}

// Crop-waste compatibility mapping
const CROP_WASTE_COMPATIBILITY = {
  rice: ['cattle', 'buffalo', 'pigs'],
  corn: ['chickens', 'pigs'],
  vegetables: ['chickens', 'goats', 'rabbits'],
  fruits: ['cattle', 'goats', 'horses'],
  legumes: ['cattle', 'buffalo'],
  root_crops: ['pigs', 'goats'],
  herbs: ['rabbits', 'chickens'],
  coconut: ['cattle', 'buffalo'],
  banana: ['cattle', 'goats'],
  sugarcane: ['cattle', 'pigs'],
  coffee: ['goats', 'chickens'],
  cacao: ['cattle', 'goats'],
  other: ['cattle', 'pigs', 'chickens']
}

// Waste volume mapping (kg per day per animal)
const WASTE_VOLUME_PER_ANIMAL = {
  cattle: 40,
  buffalo: 45,
  pigs: 8,
  chickens: 0.18,
  goats: 3,
  sheep: 2.5,
  rabbits: 0.5,
  horses: 20,
  ducks: 0.15,
  other: 10
}

// Farm size to waste requirement mapping (kg per day)
const FARM_SIZE_WASTE_REQUIREMENTS = {
  small: { min: 5, max: 50 },
  medium: { min: 50, max: 200 },
  large: { min: 200, max: 1000 },
  very_large: { min: 1000, max: 5000 }
}

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const calculateProximityScore = (distance) => {
  const maxDistance = 100
  if (distance == null || isNaN(distance)) return 0
  if (distance >= maxDistance) return 0
  return Math.exp(-distance / 20)
}

export const calculateCompatibilityScore = (cropTypes, livestockTypes) => {
  if (!cropTypes || !livestockTypes || cropTypes.length === 0 || livestockTypes.length === 0) {
    return 0
  }

  let totalMatches = 0
  let totalPossible = 0

  cropTypes.forEach((cropType) => {
    const compatibleWastes = CROP_WASTE_COMPATIBILITY[cropType] || []
    totalPossible += compatibleWastes.length

    livestockTypes.forEach((livestockType) => {
      if (compatibleWastes.includes(livestockType)) {
        totalMatches++
      }
    })
  })

  return totalPossible > 0 ? Math.min(totalMatches / totalPossible, 1) : 0
}

export const calculateVolumeScore = (farmSize, livestockTypes, livestockCount = 10) => {
  if (!farmSize || !livestockTypes) return 0.5

  const requirements = FARM_SIZE_WASTE_REQUIREMENTS[farmSize]
  if (!requirements) return 0.5

  let totalWastePerDay = 0
  livestockTypes.forEach((type) => {
    const wastePerAnimal = WASTE_VOLUME_PER_ANIMAL[type] || WASTE_VOLUME_PER_ANIMAL.other
    totalWastePerDay += wastePerAnimal * livestockCount
  })

  const { min, max } = requirements
  if (totalWastePerDay < min) return totalWastePerDay / min
  if (totalWastePerDay > max) return max / totalWastePerDay
  return 1
}

export const calculateRecommendationScore = (listing, cropFarmer, customWeights = {}) => {
  try {
    const locationWeight = customWeights.location || 0.6
    const compatibilityWeight = customWeights.compatibility || 0.3
    const volumeWeight = customWeights.volume || 0.1

    let proximityScore = 0
    let compatibilityScore = 0
    let volumeScore = 0

    if (cropFarmer && cropFarmer.location) {
      let listingLocation = null

      if (listing && listing.location) {
        listingLocation = listing.location
      } else if (listing && listing.ownerLocation) {
        listingLocation = listing.ownerLocation
      }

      if (listingLocation && listingLocation.latitude && listingLocation.longitude) {
        try {
          const distance = calculateDistance(
            cropFarmer.location.latitude,
            cropFarmer.location.longitude,
            listingLocation.latitude,
            listingLocation.longitude
          )
          proximityScore = calculateProximityScore(distance)
        } catch (error) {
          console.warn('Error calculating proximity score:', error)
          proximityScore = 0
        }
      } else {
        proximityScore = 0
      }
    }

    if (cropFarmer && cropFarmer.cropTypes && listing && listing.livestockTypes) {
      try {
        compatibilityScore = calculateCompatibilityScore(
          cropFarmer.cropTypes,
          listing.livestockTypes
        )
      } catch (error) {
        console.warn('Error calculating compatibility score:', error)
        compatibilityScore = 0
      }
    }

    if (cropFarmer && cropFarmer.farmSize && listing && listing.livestockTypes) {
      try {
        volumeScore = calculateVolumeScore(
          cropFarmer.farmSize,
          listing.livestockTypes,
          listing.estimatedCount || 10
        )
      } catch (error) {
        console.warn('Error calculating volume score:', error)
        volumeScore = 0.5
      }
    }

    const totalScore =
      locationWeight * proximityScore +
      compatibilityWeight * compatibilityScore +
      volumeWeight * volumeScore

    return {
      totalScore: totalScore || 0,
      breakdown: {
        proximity: proximityScore || 0,
        compatibility: compatibilityScore || 0,
        volume: volumeScore || 0
      }
    }
  } catch (error) {
    console.error('Error in calculateRecommendationScore:', error)
    return {
      totalScore: 0,
      breakdown: {
        proximity: 0,
        compatibility: 0,
        volume: 0
      }
    }
  }
}

export const getCropFarmerProfile = async (userId) => {
  const userDoc = await getDoc(doc(db, 'Users', userId))

  if (!userDoc.exists()) {
    throw new Error('User not found')
  }

  const userData = userDoc.data()

  let cropTypes = []
  if (userData.cropFarmer?.cropType) {
    cropTypes = Array.isArray(userData.cropFarmer.cropType)
      ? userData.cropFarmer.cropType
      : [userData.cropFarmer.cropType]
  } else if (userData.onboarding?.cropTypes) {
    cropTypes = Array.isArray(userData.onboarding.cropTypes)
      ? userData.onboarding.cropTypes
      : [userData.onboarding.cropTypes]
  }

  let location = null
  if (userData.location) {
    const lat = userData.location.latitude
    const lon = userData.location.longitude
    if (lat != null && lon != null) {
      const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat)
      const parsedLon = typeof lon === 'number' ? lon : parseFloat(lon)
      if (
        !isNaN(parsedLat) &&
        !isNaN(parsedLon) &&
        parsedLat >= -90 &&
        parsedLat <= 90 &&
        parsedLon >= -180 &&
        parsedLon <= 180
      ) {
        location = {
          latitude: parsedLat,
          longitude: parsedLon
        }
      }
    }
  }

  return {
    userId,
    role: userData.role,
    location,
    cropTypes,
    farmSize: userData.cropFarmer?.farmSize || userData.onboarding?.farmSize || 'medium'
  }
}

export const getEnhancedLivestockListings = async () => {
  console.log('🔍 Fetching ALL livestock listings from Firebase...')
  const listingsSnapshot = await getDocs(collection(db, 'livestock_listings'))
  const listings = []

  console.log(`📊 Total documents found in livestock_listings collection: ${listingsSnapshot.size}`)

  // Filter out hidden listings for crop farmers
  let hiddenCount = 0
  for (const listingDoc of listingsSnapshot.docs) {
    const listingData = listingDoc.data()
    // Skip hidden listings (only show to owners)
    if (listingData.status === 'hidden') {
      hiddenCount++
      continue
    }
    listings.push({
      id: listingDoc.id,
      ...listingData
    })
  }

  console.log(`🚫 Filtered out ${hiddenCount} hidden listings. Showing ${listings.length} visible listings`)

  // Collect unique owner IDs for batch processing
  const uniqueOwnerIds = new Set()
  for (const listing of listings) {
    if (listing.ownerId) {
      uniqueOwnerIds.add(listing.ownerId)
    }
  }

  console.log(`👥 Found ${uniqueOwnerIds.size} unique owners to fetch`)

  // Batch fetch user profiles with caching
  const ownerProfiles = new Map()
  const profilePromises = Array.from(uniqueOwnerIds).map(async (ownerId) => {
    const profile = await getCachedUserProfile(ownerId)
    if (profile) {
      ownerProfiles.set(ownerId, profile)
    }
  })

  await Promise.all(profilePromises)
  console.log('✅ User profiles fetched and cached')

  // Process listings with cached owner data
  for (const listingDoc of listingsSnapshot.docs) {
    const listingData = listingDoc.data()

    // Skip sold listings
    if (listingData.status === 'sold') {
      console.log('⏭️ Skipping sold listing:', listingDoc.id)
      continue
    }

    // Skip deleted listings
    if (listingData.status === 'deleted') {
      console.log('⏭️ Skipping deleted listing:', listingDoc.id)
      continue
    }

    console.log('✅ Processing listing:', listingDoc.id, 'Status:', listingData.status || 'undefined')

    try {
      // Get owner data from cache
      let ownerLocation = null
      let livestockTypes = []
      let ownerRating = null
      
      if (listingData.ownerId && ownerProfiles.has(listingData.ownerId)) {
        const ownerData = ownerProfiles.get(listingData.ownerId)
        ownerLocation = ownerData.location || null
        ownerRating = ownerData.rating ?? ownerData.averageRating ?? null
        
        // Get livestock types from owner profile
        if (ownerData.livestock?.animals) {
          livestockTypes = ownerData.livestock.animals
        } else if (ownerData.onboarding?.livestockTypes) {
          livestockTypes = ownerData.onboarding.livestockTypes
        }
      }

      // Add listing with enhanced data
      listings.push({
        id: listingDoc.id,
        ...listingData,
        ownerLocation: ownerLocation,
        livestockTypes: livestockTypes,
        ownerRating: ownerRating,
        location: ownerLocation // Also add as location for compatibility
      })
    } catch (e) {
      console.error('Error processing listing:', listingDoc.id, e)
      // Add listing without owner data
      listings.push({
        id: listingDoc.id,
        ...listingData
      })
    }
  }

  console.log(`✅ Final processed listings count: ${listings.length}`)
  console.log('📋 Listing statuses:', listings.map(l => ({ id: l.id, status: l.status || 'undefined' })))
  
  return listings
}

export const getRecommendedListings = async (cropFarmerId, options = {}) => {
  try {
    // Remove artificial limit - return all available listings for pagination
    const { limit = null, minScore = 0.0, searchQuery = null } = options
    
    // Get crop farmer profile
    const cropFarmer = await getCropFarmerProfile(cropFarmerId)
    
    // Get all enhanced listings with owner location
    const allListings = await getEnhancedLivestockListings()
    
    // Filter out listings owned by the current user (in case they switched roles)
    const filteredListings = allListings.filter(listing => listing.ownerId !== cropFarmerId)
    
    // Calculate recommendation scores and distances for each listing
    const listingsWithScores = filteredListings.map(listing => {
      const scoreData = calculateRecommendationScore(listing, cropFarmer)
      
      // Calculate distance
      let distanceKm = null
      if (cropFarmer.location && listing.ownerLocation) {
        distanceKm = calculateDistance(
          cropFarmer.location.latitude,
          cropFarmer.location.longitude,
          listing.ownerLocation.latitude,
          listing.ownerLocation.longitude
        )
      }
      
      return {
        ...listing,
        recommendationScore: scoreData.totalScore,
        scoreBreakdown: scoreData.breakdown,
        distanceKm: distanceKm
      }
    })
    
    // Sort by recommendation score (highest first)
    listingsWithScores.sort((a, b) => b.recommendationScore - a.recommendationScore)
    
    // Apply search filtering if searchQuery is provided
    let searchResults = []
    let outsideSearchResults = []
    
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      
      // Find direct search matches
      searchResults = listingsWithScores.filter(listing =>
        listing.name?.toLowerCase().includes(searchLower) ||
        listing.details?.toLowerCase().includes(searchLower) ||
        listing.ownerName?.toLowerCase().includes(searchLower)
      )
      
      // Find "outside search" recommendations (high scoring non-matches)
      outsideSearchResults = listingsWithScores.filter(listing =>
        !listing.name?.toLowerCase().includes(searchLower) &&
        !listing.details?.toLowerCase().includes(searchLower) &&
        !listing.ownerName?.toLowerCase().includes(searchLower) &&
        listing.recommendationScore >= minScore
      )
    } else {
      // No search query - all listings are main results
      searchResults = listingsWithScores.filter(listing => 
        listing.recommendationScore >= minScore
      )
      outsideSearchResults = []
    }
    
    // Apply limit if specified (for backward compatibility)
    if (limit) {
      return {
        searchResults: searchResults.slice(0, limit),
        outsideSearchResults: outsideSearchResults.slice(0, limit),
        hasSearchQuery: !!searchQuery
      }
    }
    
    // Return all results for dual pagination
    return {
      searchResults: searchResults,
      outsideSearchResults: outsideSearchResults,
      hasSearchQuery: !!searchQuery
    }
  } catch (error) {
    console.error('Error in getRecommendedListings:', error)
    // Fallback: return all listings without scoring
    const allListings = await getEnhancedLivestockListings()
    
    // Apply search filtering if searchQuery is provided
    let searchResults = allListings
    let outsideSearchResults = []
    
    if (options.searchQuery) {
      const searchLower = options.searchQuery.toLowerCase()
      
      searchResults = allListings.filter(listing =>
        listing.name?.toLowerCase().includes(searchLower) ||
        listing.details?.toLowerCase().includes(searchLower) ||
        listing.ownerName?.toLowerCase().includes(searchLower)
      )
      
      outsideSearchResults = allListings.filter(listing =>
        !listing.name?.toLowerCase().includes(searchLower) &&
        !listing.details?.toLowerCase().includes(searchLower) &&
        !listing.ownerName?.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply limit if specified (for backward compatibility)
    if (options.limit) {
      return {
        searchResults: searchResults.slice(0, options.limit),
        outsideSearchResults: outsideSearchResults.slice(0, options.limit),
        hasSearchQuery: !!options.searchQuery
      }
    }
    
    return {
      searchResults: searchResults,
      outsideSearchResults: outsideSearchResults,
      hasSearchQuery: !!options.searchQuery
    }
  }
}
