import { db } from '../lib/firebase'
import { getDoc, doc, getDocs, collection } from 'firebase/firestore'

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
  const listingsSnapshot = await getDocs(collection(db, 'livestock_listings'))
  const listings = []

  for (const listingDoc of listingsSnapshot.docs) {
    const listingData = listingDoc.data()

    // Skip sold listings
    if (listingData.status === 'sold') {
      continue
    }

    try {
      // Get owner data to include location
      let ownerLocation = null
      let livestockTypes = []
      
      if (listingData.ownerId) {
        const ownerDoc = await getDoc(doc(db, 'Users', listingData.ownerId))
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data()
          ownerLocation = ownerData.location || null
          
          // Get livestock types from owner profile
          if (ownerData.livestock?.animals) {
            livestockTypes = ownerData.livestock.animals
          } else if (ownerData.onboarding?.livestockTypes) {
            livestockTypes = ownerData.onboarding.livestockTypes
          }
        }
      }

      // Add listing with enhanced data
      listings.push({
        id: listingDoc.id,
        ...listingData,
        ownerLocation: ownerLocation,
        livestockTypes: livestockTypes,
        location: ownerLocation // Also add as location for compatibility
      })
    } catch (e) {
      console.error('Error fetching owner data for listing:', listingDoc.id, e)
      // Add listing without owner data
      listings.push({
        id: listingDoc.id,
        ...listingData
      })
    }
  }

  return listings
}

export const getRecommendedListings = async (cropFarmerId, options = {}) => {
  try {
    const { limit = 50 } = options
    
    // Get crop farmer profile
    const cropFarmer = await getCropFarmerProfile(cropFarmerId)
    
    // Get all enhanced listings with owner location
    const allListings = await getEnhancedLivestockListings()
    
    // Calculate recommendation scores and distances for each listing
    const listingsWithScores = allListings.map(listing => {
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
    
    return {
      searchResults: listingsWithScores.slice(0, limit),
      outsideSearchResults: [],
      hasSearchQuery: false
    }
  } catch (error) {
    console.error('Error in getRecommendedListings:', error)
    // Fallback: return all listings without scoring
    const allListings = await getEnhancedLivestockListings()
    return {
      searchResults: allListings.slice(0, options.limit || 50),
      outsideSearchResults: [],
      hasSearchQuery: false
    }
  }
}
