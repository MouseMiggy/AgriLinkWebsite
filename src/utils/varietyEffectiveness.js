/**
 * Variety-Specific Manure Effectiveness System
 * 
 * This module provides detailed effectiveness ratings for different manure types
 * on specific crop varieties, helping farmers make informed decisions.
 */

// Manure effectiveness ratings for specific crop varieties
// Rating scale: 1-5 (1=Poor, 2=Fair, 3=Good, 4=Very Good, 5=Excellent)
export const VARIETY_MANURE_EFFECTIVENESS = {
  // RICE VARIETIES
  rice: {
    'White rice (Puting bigas)': {
      cattle: { rating: 5, reason: 'Excellent nitrogen content for grain development' },
      buffalo: { rating: 5, reason: 'Rich in organic matter, perfect for paddy fields' },
      pigs: { rating: 4, reason: 'High nitrogen promotes strong tillering' },
      chickens: { rating: 3, reason: 'Good phosphorus but may be too concentrated' },
      goats: { rating: 3, reason: 'Moderate nutrients, good for organic farming' },
      rabbits: { rating: 3, reason: 'Gentle nutrients suitable for rice cultivation' },
      ducks: { rating: 3, reason: 'Good for paddy field fertilization' },
      horses: { rating: 3, reason: 'Balanced organic matter for rice' },
      sheep: { rating: 3, reason: 'Dry pellets good for rice cultivation' }
    },
    'Brown rice (Kayumangging bigas)': {
      cattle: { rating: 5, reason: 'Balanced nutrients for whole grain production' },
      buffalo: { rating: 5, reason: 'Excellent for nutrient-dense grain development' },
      pigs: { rating: 4, reason: 'Supports robust plant growth' },
      chickens: { rating: 3, reason: 'Good but needs proper composting' },
      goats: { rating: 3, reason: 'Good organic matter for brown rice' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for organic rice farming' },
      ducks: { rating: 3, reason: 'Suitable for brown rice paddies' },
      horses: { rating: 3, reason: 'Good organic matter for brown rice' },
      sheep: { rating: 3, reason: 'Moderate nutrients for rice' }
    },
    'Glutinous rice (Malagkit)': {
      cattle: { rating: 5, reason: 'High nitrogen for sticky rice starch development' },
      buffalo: { rating: 5, reason: 'Perfect for glutinous varieties, improves texture' },
      pigs: { rating: 4, reason: 'Good for grain filling stage' },
      chickens: { rating: 3, reason: 'Adequate phosphorus for root development' },
      goats: { rating: 3, reason: 'Moderate nutrients for glutinous rice' },
      rabbits: { rating: 3, reason: 'Gentle organic matter for sticky rice' },
      ducks: { rating: 3, reason: 'Good for glutinous rice paddies' },
      horses: { rating: 3, reason: 'Balanced nutrients for sticky rice' },
      sheep: { rating: 3, reason: 'Suitable for glutinous rice' }
    },
    'Red rice (Pulang bigas)': {
      cattle: { rating: 5, reason: 'Supports anthocyanin production in grains' },
      buffalo: { rating: 5, reason: 'Rich organic matter for colored rice varieties' },
      pigs: { rating: 4, reason: 'Good nitrogen for pigment development' },
      goats: { rating: 3, reason: 'Good for organic red rice cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for colored rice varieties' },
      ducks: { rating: 3, reason: 'Suitable for red rice paddies' },
      horses: { rating: 3, reason: 'Good for colored rice' },
      sheep: { rating: 3, reason: 'Moderate nutrients for red rice' }
    },
    'Aromatic rice (Mabango na bigas)': {
      cattle: { rating: 5, reason: 'Enhances aromatic compound production' },
      buffalo: { rating: 5, reason: 'Organic matter improves grain fragrance' },
      pigs: { rating: 4, reason: 'Supports essential oil development in grains' },
      goats: { rating: 3, reason: 'Good for aromatic rice varieties' },
      rabbits: { rating: 3, reason: 'Gentle nutrients enhance rice aroma' },
      ducks: { rating: 3, reason: 'Good for aromatic rice paddies' },
      horses: { rating: 3, reason: 'Balanced nutrients for aromatic rice' },
      sheep: { rating: 3, reason: 'Suitable for aromatic varieties' }
    }
  },

  // CORN VARIETIES
  corn: {
    'Yellow corn (Dilaw na mais)': {
      chickens: { rating: 5, reason: 'High phosphorus for kernel development' },
      pigs: { rating: 5, reason: 'Excellent nitrogen for yellow pigment production' },
      cattle: { rating: 4, reason: 'Good organic matter for soil structure' },
      goats: { rating: 3, reason: 'Moderate nutrients, good for organic methods' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for corn cultivation' },
      buffalo: { rating: 4, reason: 'Rich organic matter for corn' },
      ducks: { rating: 3, reason: 'Suitable for corn fertilization' },
      horses: { rating: 3, reason: 'Good for corn cultivation' },
      sheep: { rating: 3, reason: 'Moderate nutrients for corn' }
    },
    'White corn (Puting mais)': {
      chickens: { rating: 5, reason: 'Perfect phosphorus levels for white kernels' },
      pigs: { rating: 5, reason: 'Balanced nutrients for grain filling' },
      cattle: { rating: 4, reason: 'Good for soil fertility' },
      goats: { rating: 3, reason: 'Good for organic white corn' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for corn growth' },
      buffalo: { rating: 4, reason: 'Good organic matter for white corn' },
      ducks: { rating: 3, reason: 'Suitable for white corn' },
      horses: { rating: 3, reason: 'Balanced nutrients for corn' },
      sheep: { rating: 3, reason: 'Good for white corn' }
    },
    'Sweet corn (Matamis na mais)': {
      chickens: { rating: 5, reason: 'High phosphorus enhances sugar content' },
      pigs: { rating: 5, reason: 'Nitrogen promotes sweet kernel development' },
      cattle: { rating: 4, reason: 'Organic matter improves sweetness' },
      goats: { rating: 3, reason: 'Good for organic sweet corn production' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for sweet corn' },
      buffalo: { rating: 4, reason: 'Rich organic matter for sweet corn' },
      ducks: { rating: 3, reason: 'Suitable for sweet corn' },
      horses: { rating: 3, reason: 'Good for sweet corn cultivation' },
      sheep: { rating: 3, reason: 'Moderate nutrients for sweet corn' }
    }
  },

  // VEGETABLE VARIETIES
  vegetables: {
    'Tomato (Kamatis)': {
      chickens: { rating: 5, reason: 'High phosphorus for fruit development' },
      goats: { rating: 4, reason: 'Balanced NPK for healthy tomatoes' },
      rabbits: { rating: 4, reason: 'Gentle nutrients, reduces blossom end rot' },
      cattle: { rating: 3, reason: 'Good but may be too rich' },
      pigs: { rating: 3, reason: 'Good nutrients for tomatoes' },
      buffalo: { rating: 3, reason: 'Rich organic matter for tomatoes' },
      ducks: { rating: 3, reason: 'Suitable for tomato cultivation' },
      horses: { rating: 3, reason: 'Good for tomato gardens' },
      sheep: { rating: 3, reason: 'Moderate nutrients for tomatoes' }
    },
    'Eggplant (Talong)': {
      chickens: { rating: 5, reason: 'Excellent for fruit production' },
      goats: { rating: 4, reason: 'Good potassium for fruit quality' },
      rabbits: { rating: 4, reason: 'Balanced nutrients for continuous harvest' },
      cattle: { rating: 3, reason: 'Good organic matter for eggplant' },
      pigs: { rating: 3, reason: 'Suitable for eggplant cultivation' },
      buffalo: { rating: 3, reason: 'Rich nutrients for eggplant' },
      ducks: { rating: 3, reason: 'Good for eggplant gardens' },
      horses: { rating: 3, reason: 'Balanced nutrients for eggplant' },
      sheep: { rating: 3, reason: 'Moderate nutrients for eggplant' }
    },
    'Lettuce (Letsugas)': {
      rabbits: { rating: 5, reason: 'Perfect gentle nutrients for leafy greens' },
      chickens: { rating: 4, reason: 'Good nitrogen for leaf development' },
      goats: { rating: 4, reason: 'Balanced for crisp leaves' },
      cattle: { rating: 3, reason: 'Good but may be too rich for lettuce' },
      pigs: { rating: 3, reason: 'Suitable for leafy greens' },
      buffalo: { rating: 3, reason: 'Good organic matter for lettuce' },
      ducks: { rating: 3, reason: 'Suitable for lettuce cultivation' },
      horses: { rating: 3, reason: 'Good for leafy vegetables' },
      sheep: { rating: 3, reason: 'Moderate nutrients for lettuce' }
    },
    'Cabbage (Repolyo)': {
      chickens: { rating: 5, reason: 'High nitrogen for head formation' },
      goats: { rating: 4, reason: 'Good for dense head development' },
      rabbits: { rating: 4, reason: 'Gentle nutrients prevent bolting' },
      cattle: { rating: 3, reason: 'Good organic matter for cabbage' },
      pigs: { rating: 3, reason: 'Suitable for cabbage cultivation' },
      buffalo: { rating: 3, reason: 'Rich nutrients for cabbage' },
      ducks: { rating: 3, reason: 'Good for cabbage gardens' },
      horses: { rating: 3, reason: 'Balanced nutrients for cabbage' },
      sheep: { rating: 3, reason: 'Moderate nutrients for cabbage' }
    }
  },

  // FRUIT VARIETIES
  fruits: {
    'Banana - Lakatan': {
      cattle: { rating: 5, reason: 'Rich potassium for sweet fruit development' },
      goats: { rating: 4, reason: 'Good organic matter for fruit quality' },
      horses: { rating: 4, reason: 'Excellent for large banana plantations' },
      buffalo: { rating: 4, reason: 'Rich nutrients for banana trees' },
      pigs: { rating: 3, reason: 'Good for banana cultivation' },
      chickens: { rating: 3, reason: 'Suitable for banana gardens' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for bananas' },
      ducks: { rating: 3, reason: 'Good for banana plantations' },
      sheep: { rating: 3, reason: 'Moderate nutrients for bananas' }
    },
    'Banana - Saba': {
      cattle: { rating: 5, reason: 'Perfect for cooking banana varieties' },
      goats: { rating: 4, reason: 'Good for starchy fruit development' },
      horses: { rating: 4, reason: 'Supports large fruit size' },
      buffalo: { rating: 4, reason: 'Rich organic matter for saba' },
      pigs: { rating: 3, reason: 'Good for cooking bananas' },
      chickens: { rating: 3, reason: 'Suitable for saba cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for bananas' },
      ducks: { rating: 3, reason: 'Good for banana gardens' },
      sheep: { rating: 3, reason: 'Moderate nutrients for saba' }
    },
    'Mango (Mangga)': {
      cattle: { rating: 5, reason: 'Excellent for fruit sweetness and size' },
      goats: { rating: 5, reason: 'Perfect potassium for mango quality' },
      horses: { rating: 4, reason: 'Good for established mango trees' },
      buffalo: { rating: 4, reason: 'Rich nutrients for mango orchards' },
      pigs: { rating: 3, reason: 'Good for mango cultivation' },
      chickens: { rating: 3, reason: 'Suitable for mango trees' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for mangoes' },
      ducks: { rating: 3, reason: 'Good for mango orchards' },
      sheep: { rating: 3, reason: 'Moderate nutrients for mangoes' }
    },
    'Papaya (Papaya)': {
      cattle: { rating: 5, reason: 'Rich nutrients for fast-growing papaya' },
      goats: { rating: 4, reason: 'Good for fruit sweetness' },
      chickens: { rating: 4, reason: 'High phosphorus for fruiting' },
      buffalo: { rating: 4, reason: 'Good organic matter for papaya' },
      pigs: { rating: 3, reason: 'Suitable for papaya cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for papaya' },
      horses: { rating: 3, reason: 'Good for papaya gardens' },
      ducks: { rating: 3, reason: 'Suitable for papaya' },
      sheep: { rating: 3, reason: 'Moderate nutrients for papaya' }
    }
  },

  // LEGUME VARIETIES
  legumes: {
    'Mung bean (Monggo)': {
      cattle: { rating: 5, reason: 'Excellent organic matter for nitrogen fixation' },
      buffalo: { rating: 5, reason: 'Perfect for legume root development' },
      goats: { rating: 4, reason: 'Good balanced nutrients' },
      pigs: { rating: 3, reason: 'Suitable for mung bean cultivation' },
      chickens: { rating: 3, reason: 'Good for legume farming' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for mung beans' },
      horses: { rating: 3, reason: 'Good for legume fields' },
      ducks: { rating: 3, reason: 'Suitable for mung beans' },
      sheep: { rating: 3, reason: 'Moderate nutrients for legumes' }
    },
    'Peanut (Mani)': {
      cattle: { rating: 5, reason: 'Rich calcium for pod development' },
      buffalo: { rating: 5, reason: 'Excellent for underground nut formation' },
      goats: { rating: 4, reason: 'Good for organic peanut farming' },
      pigs: { rating: 3, reason: 'Suitable for peanut cultivation' },
      chickens: { rating: 3, reason: 'Good for peanut fields' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for peanuts' },
      horses: { rating: 3, reason: 'Good for peanut farming' },
      ducks: { rating: 3, reason: 'Suitable for peanuts' },
      sheep: { rating: 3, reason: 'Moderate nutrients for peanuts' }
    }
  },

  // ROOT CROP VARIETIES
  root_crops: {
    'Sweet potato (Kamote)': {
      pigs: { rating: 5, reason: 'Perfect phosphorus for tuber development' },
      goats: { rating: 5, reason: 'Excellent potassium for sweet roots' },
      cattle: { rating: 4, reason: 'Good organic matter for soil structure' },
      buffalo: { rating: 4, reason: 'Rich nutrients for sweet potato' },
      chickens: { rating: 3, reason: 'Suitable for kamote cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for tubers' },
      horses: { rating: 3, reason: 'Good for sweet potato fields' },
      ducks: { rating: 3, reason: 'Suitable for kamote' },
      sheep: { rating: 3, reason: 'Moderate nutrients for sweet potato' }
    },
    'Cassava (Kamoteng kahoy)': {
      pigs: { rating: 5, reason: 'High phosphorus for large tubers' },
      goats: { rating: 5, reason: 'Perfect for starchy root development' },
      cattle: { rating: 4, reason: 'Good for cassava plantations' },
      buffalo: { rating: 4, reason: 'Rich organic matter for cassava' },
      chickens: { rating: 3, reason: 'Suitable for cassava cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for cassava' },
      horses: { rating: 3, reason: 'Good for cassava fields' },
      ducks: { rating: 3, reason: 'Suitable for cassava' },
      sheep: { rating: 3, reason: 'Moderate nutrients for cassava' }
    },
    'Potato (Patatas)': {
      pigs: { rating: 5, reason: 'Excellent for tuber formation' },
      goats: { rating: 4, reason: 'Good balanced nutrients' },
      cattle: { rating: 4, reason: 'Rich organic matter for potatoes' },
      buffalo: { rating: 4, reason: 'Good for potato cultivation' },
      chickens: { rating: 3, reason: 'Suitable for potato fields' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for potatoes' },
      horses: { rating: 3, reason: 'Good for potato farming' },
      ducks: { rating: 3, reason: 'Suitable for potatoes' },
      sheep: { rating: 3, reason: 'Moderate nutrients for potatoes' }
    }
  },

  // HERBS AND SPICES
  herbs_spices: {
    'Basil (Balanoy)': {
      rabbits: { rating: 5, reason: 'Gentle nutrients enhance essential oils' },
      chickens: { rating: 4, reason: 'Good nitrogen for leafy growth' },
      goats: { rating: 4, reason: 'Balanced for aromatic herb production' },
      cattle: { rating: 3, reason: 'Good for herb gardens' },
      pigs: { rating: 3, reason: 'Suitable for basil cultivation' },
      buffalo: { rating: 3, reason: 'Good organic matter for herbs' },
      horses: { rating: 3, reason: 'Good for herb gardens' },
      ducks: { rating: 3, reason: 'Suitable for basil' },
      sheep: { rating: 3, reason: 'Moderate nutrients for herbs' }
    },
    'Ginger (Luya)': {
      cattle: { rating: 5, reason: 'Rich organic matter for rhizome development' },
      goats: { rating: 4, reason: 'Good for spicy root quality' },
      pigs: { rating: 4, reason: 'Excellent phosphorus for root growth' },
      buffalo: { rating: 4, reason: 'Rich nutrients for ginger' },
      chickens: { rating: 3, reason: 'Suitable for ginger cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for ginger' },
      horses: { rating: 3, reason: 'Good for ginger fields' },
      ducks: { rating: 3, reason: 'Suitable for ginger' },
      sheep: { rating: 3, reason: 'Moderate nutrients for ginger' }
    },
    'Chili (Sili)': {
      chickens: { rating: 5, reason: 'High phosphorus for fruit production' },
      goats: { rating: 4, reason: 'Good for capsaicin development' },
      rabbits: { rating: 4, reason: 'Balanced nutrients for continuous harvest' },
      cattle: { rating: 3, reason: 'Good for chili cultivation' },
      pigs: { rating: 3, reason: 'Suitable for chili peppers' },
      buffalo: { rating: 3, reason: 'Good organic matter for chili' },
      horses: { rating: 3, reason: 'Good for chili gardens' },
      ducks: { rating: 3, reason: 'Suitable for chili' },
      sheep: { rating: 3, reason: 'Moderate nutrients for chili' }
    }
  },

  // INDUSTRIAL CROPS
  industrial_crops: {
    'Sugarcane - Noble Cane': {
      cattle: { rating: 5, reason: 'Excellent nitrogen for sugar accumulation' },
      pigs: { rating: 5, reason: 'High nutrients for cane growth' },
      buffalo: { rating: 4, reason: 'Good organic matter for large plantations' },
      goats: { rating: 3, reason: 'Suitable for sugarcane cultivation' },
      chickens: { rating: 3, reason: 'Good for sugarcane fields' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for sugarcane' },
      horses: { rating: 3, reason: 'Good for large plantations' },
      ducks: { rating: 3, reason: 'Suitable for sugarcane' },
      sheep: { rating: 3, reason: 'Moderate nutrients for sugarcane' }
    },
    'Coffee - Arabica': {
      goats: { rating: 5, reason: 'Perfect for high-quality coffee beans' },
      chickens: { rating: 4, reason: 'Good phosphorus for cherry development' },
      cattle: { rating: 4, reason: 'Rich organic matter for coffee trees' },
      buffalo: { rating: 4, reason: 'Good for coffee plantations' },
      pigs: { rating: 3, reason: 'Suitable for coffee cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for coffee' },
      horses: { rating: 3, reason: 'Good for coffee farms' },
      ducks: { rating: 3, reason: 'Suitable for coffee' },
      sheep: { rating: 3, reason: 'Moderate nutrients for coffee' }
    },
    'Cacao - Criollo': {
      cattle: { rating: 5, reason: 'Excellent for premium cacao quality' },
      goats: { rating: 5, reason: 'Perfect nutrients for fine flavor cacao' },
      chickens: { rating: 4, reason: 'Good for pod development' },
      buffalo: { rating: 4, reason: 'Rich organic matter for cacao' },
      pigs: { rating: 3, reason: 'Suitable for cacao cultivation' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for cacao' },
      horses: { rating: 3, reason: 'Good for cacao farms' },
      ducks: { rating: 3, reason: 'Suitable for cacao' },
      sheep: { rating: 3, reason: 'Moderate nutrients for cacao' }
    }
  },

  // MUSHROOMS
  mushrooms: {
    'Oyster mushroom (Kabuteng talaba)': {
      chickens: { rating: 5, reason: 'Perfect nitrogen for mushroom substrate' },
      cattle: { rating: 4, reason: 'Good organic matter for growing medium' },
      goats: { rating: 4, reason: 'Balanced nutrients for fruiting bodies' },
      horses: { rating: 4, reason: 'Excellent for mushroom substrate' },
      pigs: { rating: 3, reason: 'Suitable for mushroom cultivation' },
      buffalo: { rating: 3, reason: 'Good for mushroom substrate' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for mushrooms' },
      ducks: { rating: 3, reason: 'Suitable for mushroom growing' },
      sheep: { rating: 3, reason: 'Moderate nutrients for mushrooms' }
    },
    'Button mushroom (Kabuteng buton)': {
      chickens: { rating: 5, reason: 'Excellent for commercial production' },
      cattle: { rating: 4, reason: 'Rich compost for mushroom beds' },
      horses: { rating: 4, reason: 'Traditional substrate for button mushrooms' },
      goats: { rating: 3, reason: 'Good for mushroom cultivation' },
      pigs: { rating: 3, reason: 'Suitable for button mushrooms' },
      buffalo: { rating: 3, reason: 'Good for mushroom substrate' },
      rabbits: { rating: 3, reason: 'Gentle nutrients for mushrooms' },
      ducks: { rating: 3, reason: 'Suitable for mushroom growing' },
      sheep: { rating: 3, reason: 'Moderate nutrients for mushrooms' }
    }
  }
};

/**
 * Get effectiveness rating for a specific variety and manure type
 * @param {string} variety - The crop variety name
 * @param {string} manureType - The livestock/manure type
 * @param {string} cropType - The crop type category
 * @returns {Object} Effectiveness data with rating and reason
 */
export const getVarietyEffectiveness = (variety, manureType, cropType) => {
  if (!variety || !manureType || !cropType) {
    return { rating: 0, reason: 'Information not available' };
  }

  const cropData = VARIETY_MANURE_EFFECTIVENESS[cropType];
  if (!cropData) {
    return { rating: 0, reason: 'Crop type not found' };
  }

  const varietyData = cropData[variety];
  if (!varietyData) {
    // Try to find a partial match
    const matchingVariety = Object.keys(cropData).find(v => 
      v.toLowerCase().includes(variety.toLowerCase()) || 
      variety.toLowerCase().includes(v.split('(')[0].trim().toLowerCase())
    );
    
    if (matchingVariety) {
      const effectiveness = cropData[matchingVariety][manureType];
      return effectiveness || { rating: 0, reason: 'No data for this manure type' };
    }
    
    return { rating: 0, reason: 'Variety not found in database' };
  }

  const effectiveness = varietyData[manureType];
  return effectiveness || { rating: 0, reason: 'No data for this manure type' };
};

/**
 * Normalize livestock type to match database format
 * @param {string} livestockType - Raw livestock type from listing
 * @returns {string} Normalized livestock type
 */
const normalizeLivestockType = (livestockType) => {
  if (!livestockType) return '';
  
  const normalized = livestockType.toLowerCase().trim();
  
  // Map common variations to standard types
  const typeMap = {
    // Cattle variations
    'cow': 'cattle',
    'cows': 'cattle',
    'cattle': 'cattle',
    'beef cattle': 'cattle',
    'dairy cattle': 'cattle',
    'dairy cow': 'cattle',
    'beef cow': 'cattle',
    
    // Buffalo/Carabao variations
    'carabao': 'buffalo',
    'water buffalo': 'buffalo',
    'buffalo': 'buffalo',
    
    // Pig/Swine variations
    'pig': 'pigs',
    'pigs': 'pigs',
    'swine': 'pigs',
    'hog': 'pigs',
    'hogs': 'pigs',
    'baboy': 'pigs',
    
    // Chicken/Poultry variations
    'chicken': 'chickens',
    'chickens': 'chickens',
    'poultry': 'chickens',
    'hen': 'chickens',
    'hens': 'chickens',
    'rooster': 'chickens',
    'broiler': 'chickens',
    'layer': 'chickens',
    'manok': 'chickens',
    'quail': 'chickens',
    'pugo': 'chickens',
    'turkey': 'chickens',
    'pabo': 'chickens',
    'goose': 'chickens',
    'gansa': 'chickens',
    
    // Goat variations
    'goat': 'goats',
    'goats': 'goats',
    'kambing': 'goats',
    
    // Sheep variations
    'sheep': 'sheep',
    'tupa': 'sheep',
    
    // Rabbit variations
    'rabbit': 'rabbits',
    'rabbits': 'rabbits',
    'kuneho': 'rabbits',
    
    // Horse variations
    'horse': 'horses',
    'horses': 'horses',
    'kabayo': 'horses',
    
    // Duck variations
    'duck': 'ducks',
    'ducks': 'ducks',
    'pato': 'ducks',
    
    // Other/Others - map to most common type (cattle)
    'other': 'cattle',
    'others': 'cattle',
    'iba': 'cattle'
  };
  
  return typeMap[normalized] || normalized;
};

/**
 * Get all effectiveness ratings for a listing based on user's crop varieties
 * @param {Object} listing - The livestock listing
 * @param {Object} userCropVarieties - User's selected crop varieties by type
 * @returns {Array} Array of effectiveness data for each user variety
 */
/**
 * Detect livestock type from listing title and description
 * This is a fallback when livestockTypes field is missing or incorrect
 * @param {Object} listing - The listing object
 * @returns {Array} Detected livestock types
 */
const detectLivestockTypeFromText = (listing) => {
  const text = `${listing.name || ''} ${listing.details || ''}`.toLowerCase();
  
  const detectedTypes = [];
  
  // Detection patterns for each livestock type
  const patterns = {
    chickens: ['chicken', 'manok', 'poultry', 'hen', 'rooster', 'broiler', 'layer', 'itlog', 'egg'],
    cattle: ['cattle', 'cow', 'baka', 'beef', 'dairy'],
    buffalo: ['buffalo', 'carabao', 'kalabaw', 'kabaw'],
    pigs: ['pig', 'swine', 'baboy', 'hog'],
    goats: ['goat', 'kambing', 'kanding'],
    rabbits: ['rabbit', 'kuneho'],
    horses: ['horse', 'kabayo', 'donkey', 'mule', 'asno'],
    sheep: ['sheep', 'tupa', 'lamb'],
    ducks: ['duck', 'pato', 'itik']
  };
  
  // Check each pattern
  for (const [livestockType, keywords] of Object.entries(patterns)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      detectedTypes.push(livestockType);
    }
  }
  
  // If no types detected, return empty array (will use listing.livestockTypes)
  return detectedTypes;
};

/**
 * Get all effectiveness ratings for a listing based on user's crop varieties
 * @param {Object} listing - The livestock listing
 * @param {Object} userCropVarieties - User's selected crop varieties by type
 * @returns {Array} Array of effectiveness data for each user variety
 */
/**
 * Get all effectiveness ratings for a listing based on user's crop varieties
 * @param {Object} listing - The livestock listing
 * @param {Object} userCropVarieties - User's selected crop varieties by type
 * @param {string} selectedCropType - Currently selected crop type from dropdown (optional)
 * @returns {Array} Array of effectiveness data for each user variety
 */
export const getListingEffectivenessForUser = (listing, userCropVarieties, selectedCropType = null) => {
  if (!listing || !userCropVarieties) {
    console.log('⚠️ Missing listing or userCropVarieties');
    return [];
  }

  // SMART DETECTION: Try to detect livestock type from title/description first
  let livestockTypes = detectLivestockTypeFromText(listing);
  
  // Fallback to listing.livestockTypes if detection found nothing
  if (livestockTypes.length === 0) {
    livestockTypes = listing.livestockTypes || [];
  } else {
    console.log(`🔍 Detected livestock types from text for "${listing.name}":`, livestockTypes);
  }

  // Check if we have any livestock types
  if (livestockTypes.length === 0) {
    console.log('⚠️ Listing has no livestockTypes:', listing.id);
    return [];
  }

  const effectivenessData = [];

  // For each crop type the user has
  Object.keys(userCropVarieties).forEach(cropType => {
    const varieties = userCropVarieties[cropType] || [];
    
    // SMART FALLBACK: Only expand to ALL varieties if this is the SELECTED crop type
    let varietiesToCheck = varieties;
    
    if (selectedCropType && selectedCropType === cropType && (varieties.length === 0 || varieties.length <= 2)) {
      // User selected this crop type in dropdown AND has few varieties → Show ALL varieties
      const cropData = VARIETY_MANURE_EFFECTIVENESS[cropType];
      if (cropData && Object.keys(cropData).length > 0) {
        varietiesToCheck = Object.keys(cropData);
        console.log(`📋 Selected crop type ${cropType} has ${varieties.length} varieties, showing ALL ${varietiesToCheck.length} varieties`);
      }
    } else if (!selectedCropType && varieties.length === 0) {
      // No crop type selected (e.g., in modal) AND user has no varieties → Use first variety as representative
      const cropData = VARIETY_MANURE_EFFECTIVENESS[cropType];
      if (cropData && Object.keys(cropData).length > 0) {
        varietiesToCheck = [Object.keys(cropData)[0]];
      }
    } else if (varieties.length === 0) {
      // Crop type NOT selected but user has no varieties → Use first variety as representative
      const cropData = VARIETY_MANURE_EFFECTIVENESS[cropType];
      if (cropData && Object.keys(cropData).length > 0) {
        varietiesToCheck = [Object.keys(cropData)[0]];
      }
    }
    // else: Use the varieties the user actually selected
    
    // Skip if still no varieties to check
    if (varietiesToCheck.length === 0) {
      return;
    }
    
    // For each variety in that crop type
    varietiesToCheck.forEach(variety => {
      // For each livestock type in the listing
      livestockTypes.forEach(livestockType => {
        // Normalize livestock type to match database format
        const normalizedType = normalizeLivestockType(livestockType);
        
        if (!normalizedType) {
          console.log('⚠️ Could not normalize livestock type:', livestockType);
          return;
        }
        
        const effectiveness = getVarietyEffectiveness(variety, normalizedType, cropType);
        
        if (effectiveness.rating > 0) {
          effectivenessData.push({
            cropType,
            variety,
            livestockType: normalizedType,
            ...effectiveness
          });
        }
      });
    });
  });

  // Sort by rating (highest first)
  effectivenessData.sort((a, b) => b.rating - a.rating);

  return effectivenessData;
};

/**
 * Get rating color based on effectiveness rating
 * @param {number} rating - Rating from 1-5
 * @returns {string} Color code
 */
export const getRatingColor = (rating) => {
  if (rating >= 5) return '#4CAF50'; // Excellent - Green
  if (rating >= 4) return '#8BC34A'; // Very Good - Light Green
  if (rating >= 3) return '#FFC107'; // Good - Amber
  if (rating >= 2) return '#FF9800'; // Fair - Orange
  return '#F44336'; // Poor - Red
};

/**
 * Get rating label based on effectiveness rating
 * @param {number} rating - Rating from 1-5
 * @returns {string} Rating label
 */
export const getRatingLabel = (rating) => {
  if (rating >= 5) return 'Excellent';
  if (rating >= 4) return 'Very Good';
  if (rating >= 3) return 'Good';
  if (rating >= 2) return 'Fair';
  if (rating >= 1) return 'Poor';
  return 'No Data';
};

/**
 * Get star rating display
 * @param {number} rating - Rating from 1-5
 * @returns {string} Star string
 */
export const getStarRating = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  return '⭐'.repeat(fullStars) + 
         (halfStar ? '✨' : '') + 
         '☆'.repeat(emptyStars);
};
