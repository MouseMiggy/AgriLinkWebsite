# Comprehensive crop-waste compatibility knowledge base with explanations

CROP_WASTE_KNOWLEDGE = {
    "cattle_manure": {
        "name": "Cattle Manure (Dumi ng Baka)",
        "npk_ratio": "1-0.8-1",
        "organic_matter": "High",
        "best_crops": [
            {
                "crop_type": "rice",
                "crop_name": "Rice (Palay)",
                "reason": "Cattle manure provides balanced nutrients essential for rice growth. Its high organic matter content improves soil structure in flooded rice paddies, enhancing root development and water retention.",
                "benefits": ["Increases grain yield", "Improves soil structure", "Enhances water retention"]
            },
            {
                "crop_type": "corn",
                "crop_name": "Corn (Maize)",
                "reason": "The balanced NPK ratio in cattle manure supports corn's high nitrogen demand during vegetative growth and potassium needs during ear development.",
                "benefits": ["Boosts stalk strength", "Improves ear size", "Enhances overall yield"]
            },
            {
                "crop_type": "vegetables",
                "crop_name": "Leafy Vegetables (Lettuce, Spinach, Cabbage)",
                "reason": "High nitrogen content promotes rapid leaf development in vegetables. The slow-release nature prevents leaf burn while ensuring continuous nutrition.",
                "benefits": ["Promotes leaf growth", "Improves color", "Enhances nutritional value"]
            },
            {
                "crop_type": "fruits",
                "crop_name": "Fruit Trees (Mango, Banana, Citrus)",
                "reason": "Provides balanced nutrients for sustained fruit production. Organic matter improves soil drainage and aeration crucial for fruit tree roots.",
                "benefits": ["Improves fruit quality", "Enhances flowering", "Strengthens tree structure"]
            },
            {
                "crop_type": "rootCrops",
                "crop_name": "Root Crops (Carrots, Radish, Sweet Potato)",
                "reason": "Improves soil structure for better root expansion. The phosphorus content supports root development while potassium enhances storage organ formation.",
                "benefits": ["Enlarges root size", "Improves flavor", "Increases storage quality"]
            }
        ]
    },
    "poultry_waste": {
        "name": "Poultry Waste (Dumi ng Manok)",
        "npk_ratio": "3-2-2",
        "organic_matter": "Medium",
        "best_crops": [
            {
                "crop_type": "vegetables",
                "crop_name": "Leafy Greens (Kale, Mustard, Bok Choy)",
                "reason": "Very high nitrogen content accelerates leaf production. Ideal for fast-growing vegetables that require quick nutrient availability.",
                "benefits": ["Rapid leaf growth", "Dark green foliage", "Higher protein content"]
            },
            {
                "crop_type": "corn",
                "crop_name": "Sweet Corn",
                "reason": "High nitrogen supports rapid vegetative growth, while phosphorus aids in kernel development. Particularly good for early growth stages.",
                "benefits": ["Faster growth", "Larger ears", "Better kernel fill"]
            },
            {
                "crop_type": "legumes",
                "crop_name": "Beans and Peas",
                "reason": "Despite being nitrogen-fixers, legumes benefit from the phosphorus and potassium for pod development. Additional nitrogen supports early growth before nodulation.",
                "benefits": ["More pods per plant", "Larger seeds", "Faster maturation"]
            },
            {
                "crop_type": "herbs",
                "crop_name": "Culinary Herbs (Basil, Mint, Oregano)",
                "reason": "High nitrogen promotes lush, aromatic foliage production. Essential oils concentration increases with proper nitrogen supply.",
                "benefits": ["More aromatic leaves", "Higher essential oil content", "Continuous harvesting"]
            },
            {
                "crop_type": "grass",
                "crop_name": "Forage Grasses (Napier, Bermuda)",
                "reason": "Excellent for rapid grass growth in pastures. High nitrogen content ensures quick regrowth after grazing or cutting.",
                "benefits": ["Fast regrowth", "High protein content", "Better palatability"]
            }
        ]
    },
    "swine_waste": {
        "name": "Swine Waste (Dumi ng Baboy)",
        "npk_ratio": "2-2.5-2",
        "organic_matter": "High",
        "best_crops": [
            {
                "crop_type": "fruits",
                "crop_name": "Fruiting Vegetables (Tomato, Eggplant, Pepper)",
                "reason": "High phosphorus content promotes flowering and fruit set. Balanced nutrients support continuous fruit production throughout the season.",
                "benefits": ["More flowers", "Larger fruits", "Extended harvest period"]
            },
            {
                "crop_type": "rootCrops",
                "crop_name": "Tubers (Potato, Taro, Cassava)",
                "reason": "Excellent phosphorus content supports tuber development. High organic matter improves soil structure for underground growth.",
                "benefits": ["Larger tubers", "Better starch content", "Improved storage life"]
            },
            {
                "crop_type": "corn",
                "crop_name": "Field Corn",
                "reason": "Balanced nutrients support both vegetative growth and grain production. Particularly good for silage corn where biomass is important.",
                "benefits": ["Higher biomass", "Better grain fill", "Stronger stalks"]
            },
            {
                "crop_type": "vegetables",
                "crop_name": "Brassicas (Cabbage, Broccoli, Cauliflower)",
                "reason": "High phosphorus promotes head formation in cabbage and curd development in cauliflower. Balanced nutrients support tight head formation.",
                "benefits": ["Firm heads", "Better curd quality", "Disease resistance"]
            },
            {
                "crop_type": "sugarcane",
                "crop_name": "Sugarcane",
                "reason": "High potassium content improves sugar accumulation in stalks. Organic matter enhances soil structure for the extensive root system.",
                "benefits": ["Higher sugar content", "Thicker stalks", "Better juice quality"]
            }
        ]
    },
    "goat_manure": {
        "name": "Goat Manure (Dumi ng Kambing)",
        "npk_ratio": "1.5-1-1.5",
        "organic_matter": "Medium",
        "best_crops": [
            {
                "crop_type": "vegetables",
                "crop_name": "All Vegetables",
                "reason": "Mild, balanced formula won't burn plants. Can be applied directly. Perfect for organic vegetable production.",
                "benefits": ["Safe for direct application", "Balanced nutrition", "Improves soil life"]
            },
            {
                "crop_type": "fruits",
                "crop_name": "Berries (Strawberry, Blueberry)",
                "reason": "Gentle nutrition perfect for sensitive berry plants. Improves soil acidity and organic matter content beneficial to berries.",
                "benefits": ["Better fruit set", "Improved flavor", "Disease resistance"]
            },
            {
                "crop_type": "herbs",
                "crop_name": "Medicinal Herbs (Lagundi, Sambong, Tsaang Gubat)",
                "reason": "Mild nutrition preserves medicinal properties. Organic matter enhances soil microbial activity important for herb quality.",
                "benefits": ["Preserves medicinal compounds", "Sustained growth", "Better aroma"]
            },
            {
                "crop_type": "legumes",
                "crop_name": "Mung Beans and Soybeans",
                "reason": "Provides balanced nutrition without excessive nitrogen that would inhibit nodulation. Perfect for legume production.",
                "benefits": ["Better nitrogen fixation", "Higher protein content", "Improved yield"]
            },
            {
                "crop_type": "spices",
                "crop_name": "Spice Crops (Chili, Black Pepper, Turmeric)",
                "reason": "Enhances essential oil and capsaicin content in spices. Balanced nutrients support both vegetative growth and fruit/seed production.",
                "benefits": ["Higher pungency", "Better aroma", "Increased yield"]
            }
        ]
    },
    "sheep_manure": {
        "name": "Sheep Manure (Dumi ng Tupa)",
        "npk_ratio": "1-0.7-1.2",
        "organic_matter": "Medium",
        "best_crops": [
            {
                "crop_type": "fruits",
                "crop_name": "Orchard Fruits (Apple, Pear, Peach)",
                "reason": "High potassium content excellent for fruit sweetness and quality. Improves cold hardiness in temperate fruits.",
                "benefits": ["Sweeter fruits", "Better color", "Improved storage"]
            },
            {
                "crop_type": "vegetables",
                "crop_name": "Fruiting Vegetables (Squash, Pumpkin, Melon)",
                "reason": "High potassium supports large fruit development. Phosphorus aids in flowering and fruit set.",
                "benefits": ["Larger fruits", "Better sweetness", "Longer shelf life"]
            },
            {
                "crop_type": "grapes",
                "crop_name": "Grapes",
                "reason": "Excellent potassium content for sugar accumulation in grapes. Improves wine quality potential.",
                "benefits": ["Higher sugar content", "Better color", "Improved disease resistance"]
            },
            {
                "crop_type": "rootCrops",
                "crop_name": "Garlic and Onions",
                "reason": "High potassium enhances bulb development and storage quality. Balanced nutrients support strong foliage growth.",
                "benefits": ["Larger bulbs", "Better storage", "Stronger flavor"]
            },
            {
                "crop_type": "flowers",
                "crop_name": "Cut Flowers (Rose, Sunflower, Chrysanthemum)",
                "reason": "Promotes vibrant flower colors and longer vase life. Potassium strengthens stems and improves flower quality.",
                "benefits": ["Brighter colors", "Stronger stems", "Longer vase life"]
            }
        ]
    },
    "rabbit_manure": {
        "name": "Rabbit Manure (Dumi ng Kuneho)",
        "npk_ratio": "2.4-1.4-0.6",
        "organic_matter": "High",
        "best_crops": [
            {
                "crop_type": "vegetables",
                "crop_name": "Salad Greens (Lettuce, Arugula, Spinach)",
                "reason": "Cold manure can be applied directly to plants. High nitrogen promotes rapid leaf growth perfect for quick salad crops.",
                "benefits": ["Ready to use", "Fast growth", "Tender leaves"]
            },
            {
                "crop_type": "herbs",
                "crop_name": "Fast-growing Herbs (Cilantro, Parsley, Dill)",
                "reason": "Immediate nutrient availability supports rapid herb growth. Perfect for continuous harvesting systems.",
                "benefits": ["Continuous harvest", "Intense flavor", "Rapid regrowth"]
            },
            {
                "crop_type": "vegetables",
                "crop_name": "Microgreens",
                "reason": "Excellent for microgreen production due to immediate nutrient availability and gentle nature.",
                "benefits": ["Faster germination", "Higher yield", "Better nutrition"]
            },
            {
                "crop_type": "flowers",
                "crop_name": "Annual Flowers (Marigold, Zinnia, Petunia)",
                "reason": "Promotes rapid flowering and vibrant colors. Perfect for bedding plants and container gardens.",
                "benefits": ["Early flowering", "More blooms", "Vibrant colors"]
            },
            {
                "crop_type": "vegetables",
                "crop_name": "Container Vegetables",
                "reason": "Ideal for container gardening where space is limited. Gentle formula prevents root burn in confined spaces.",
                "benefits": ["Container safe", "Compact growth", "High yield in small space"]
            }
        ]
    }
}

# Function to get best crops for a specific waste type
def get_best_crops_for_waste(waste_type, crop_category=None):
    """Get top 5 best crops for a waste type, optionally filtered by crop category"""
    waste_key = waste_type.lower().replace(" ", "_").replace("(", "").replace(")", "")
    
    if waste_key not in CROP_WASTE_KNOWLEDGE:
        return []
    
    best_crops = CROP_WASTE_KNOWLEDGE[waste_key]["best_crops"]
    
    if crop_category:
        best_crops = [c for c in best_crops if c["crop_type"] == crop_category]
    
    return best_crops[:5]

# Function to get waste analysis for a crop category
def get_waste_analysis_for_crop(crop_category):
    """Get analysis of which waste types are best for a specific crop category"""
    results = []
    
    for waste_key, waste_data in CROP_WASTE_KNOWLEDGE.items():
        matching_crops = [c for c in waste_data["best_crops"] if c["crop_type"] == crop_category]
        
        if matching_crops:
            results.append({
                "waste_type": waste_key,
                "waste_name": waste_data["name"],
                "npk_ratio": waste_data["npk_ratio"],
                "organic_matter": waste_data["organic_matter"],
                "crops": matching_crops
            })
    
    # Sort by number of matching crops and NPK balance
    results.sort(key=lambda x: len(x["crops"]), reverse=True)
    
    return results
