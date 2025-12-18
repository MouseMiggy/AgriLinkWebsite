from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from google.cloud import firestore
from google.oauth2 import service_account
from dotenv import load_dotenv
import asyncio
from crop_waste_knowledge import get_best_crops_for_waste, get_waste_analysis_for_crop, CROP_WASTE_KNOWLEDGE

load_dotenv()

app = FastAPI(title="AgriLink Semantic Search API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific domains
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize MPNet model (multilingual version)
print("Loading multilingual MPNet model...")
model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-mpnet-base-v2')
print("Multilingual model loaded successfully!")

# Initialize Firestore
service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
project_id = os.getenv('FIRESTORE_PROJECT_ID')

if service_account_path and os.path.exists(service_account_path):
    credentials = service_account.Credentials.from_service_account_file(service_account_path)
    db = firestore.Client(credentials=credentials, project=project_id)
else:
    db = firestore.Client(project=project_id)

def create_semantic_text(listing_data):
    """Create semantic search text from listing data"""
    parts = []
    
    # Add name
    if 'name' in listing_data:
        parts.append(listing_data['name'])
    
    # Add description or details (check both for compatibility)
    if 'details' in listing_data:
        parts.append(listing_data['details'])
    elif 'description' in listing_data:
        parts.append(listing_data['description'])
    
    # Add category
    if 'category' in listing_data:
        parts.append(listing_data['category'])
    
    # Add location
    if 'ownerLocation' in listing_data:
        parts.append(listing_data['ownerLocation'])
    elif 'location' in listing_data:
        parts.append(listing_data['location'])
    
    # Add breed if available
    if 'breed' in listing_data:
        parts.append(listing_data['breed'])
    
    # Add age if available
    if 'age' in listing_data:
        parts.append(str(listing_data['age']))
    
    return ' '.join(parts)

class EmbedRequest(BaseModel):
    text: str

class ListingEmbedRequest(BaseModel):
    listingId: str

class SearchRequest(BaseModel):
    text: str
    top_k: int = 10

class EmbedResponse(BaseModel):
    embedding: List[float]

class SearchResult(BaseModel):
    id: str
    score: float
    data: dict

class SearchResponse(BaseModel):
    matches: List[SearchResult]

class CropWasteRequest(BaseModel):
    crop_type: str
    top_k: int = 5

class CropWasteAnalysis(BaseModel):
    waste_type: str
    waste_name: str
    npk_ratio: str
    organic_matter: str
    crops: List[dict]
    score: float

class CropWasteResponse(BaseModel):
    crop_type: str
    best_wastes: List[CropWasteAnalysis]

@app.get("/")
async def root():
    return {"message": "AgriLink Semantic Search API is running"}

@app.post("/embed", response_model=EmbedResponse)
async def get_embedding(request: EmbedRequest):
    """Convert text to MPNet embedding"""
    try:
        embedding = model.encode(request.text, convert_to_numpy=True)
        return EmbedResponse(embedding=embedding.tolist())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed-listing")
async def embed_listing(request: ListingEmbedRequest):
    """Generate and store embedding for a specific listing"""
    try:
        # Get listing from Firestore
        doc_ref = db.collection('livestock_listings').document(request.listingId)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        listing_data = doc.to_dict()
        
        # Create semantic text
        semantic_text = create_semantic_text(listing_data)
        
        if not semantic_text.strip():
            raise HTTPException(status_code=400, detail="No content to embed")
        
        # Generate embedding
        embedding = model.encode(semantic_text, convert_to_numpy=True)
        
        # Update document with embedding
        doc_ref.update({
            'mpnet_embedding': embedding.tolist()
        })
        
        return {"message": "Embedding generated and stored successfully", "listingId": request.listingId}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """Search livestock listings by semantic similarity"""
    try:
        # Get query embedding
        query_embedding = model.encode(request.text, convert_to_numpy=True)
        
        # Get all listings from Firestore
        listings_ref = db.collection('livestock_listings')
        docs = listings_ref.stream()
        
        matches = []
        
        for doc in docs:
            listing_data = doc.to_dict()
            
            # Check if listing has embedding
            if 'mpnet_embedding' not in listing_data:
                continue
                
            stored_embedding = np.array(listing_data['mpnet_embedding'])
            
            # Calculate cosine similarity
            similarity = np.dot(query_embedding, stored_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(stored_embedding)
            )
            
            matches.append({
                'id': doc.id,
                'score': float(similarity),
                'data': listing_data
            })
        
        # Sort by similarity and return top_k
        matches.sort(key=lambda x: x['score'], reverse=True)
        top_matches = matches[:request.top_k]
        
        return SearchResponse(matches=top_matches)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/crop-waste-analysis", response_model=CropWasteResponse)
async def crop_waste_analysis(request: CropWasteRequest):
    """Analyze which waste types are best suited for a specific crop type using MPNet"""
    try:
        # Get waste analysis for the requested crop type
        waste_analyses = get_waste_analysis_for_crop(request.crop_type)
        
        # If no direct matches found, use semantic similarity
        if not waste_analyses:
            # Create crop type description for semantic search
            crop_descriptions = {
                "vegetables": "leafy green crops lettuce spinach cabbage broccoli",
                "fruits": "fruit trees mango banana apple citrus sweet produce",
                "rootCrops": "tuber crops carrot potato cassava sweet potato underground",
                "legumes": "bean crops mung bean soybean peanut nitrogen fixing",
                "herbs": "culinary medicinal herbs basil oregano aromatic plants",
                "spices": "flavor crops chili pepper turmeric garlic onion",
                "rice": "rice paddy flooded grain staple food",
                "corn": "corn maize grain fodder silage",
                "industrial": "industrial crops coffee cacao rubber sugarcane",
                "mushrooms": "fungi mushroom decomposer organic matter"
            }
            
            crop_query = crop_descriptions.get(request.crop_type, request.crop_type)
            
            # Get semantic matches with waste descriptions
            query_embedding = model.encode(crop_query, convert_to_numpy=True)
            
            # Create waste descriptions for semantic matching
            waste_descriptions = []
            for waste_key, waste_data in CROP_WASTE_KNOWLEDGE.items():
                waste_desc = f"{waste_data['name']} NPK {waste_data['npk_ratio']} "
                waste_desc += " ".join([crop['crop_name'] for crop in waste_data['best_crops'][:3]])
                waste_descriptions.append({
                    "type": waste_key,
                    "name": waste_data['name'],
                    "description": waste_desc,
                    "npk": waste_data['npk_ratio'],
                    "organic_matter": waste_data['organic_matter'],
                    "crops": waste_data['best_crops']
                })
            
            # Calculate semantic similarity
            for waste in waste_descriptions:
                waste_embedding = model.encode(waste['description'], convert_to_numpy=True)
                similarity = np.dot(query_embedding, waste_embedding) / (
                    np.linalg.norm(query_embedding) * np.linalg.norm(waste_embedding)
                )
                waste['score'] = float(similarity)
            
            # Sort by semantic similarity
            waste_descriptions.sort(key=lambda x: x['score'], reverse=True)
            
            # Format response
            best_wastes = []
            for waste in waste_descriptions[:request.top_k]:
                best_wastes.append(CropWasteAnalysis(
                    waste_type=waste['type'],
                    waste_name=waste['name'],
                    npk_ratio=waste['npk'],
                    organic_matter=waste['organic_matter'],
                    crops=waste['crops'][:5],
                    score=waste['score']
                ))
            
            return CropWasteResponse(crop_type=request.crop_type, best_wastes=best_wastes)
        
        # Format direct matches
        best_wastes = []
        for analysis in waste_analyses[:request.top_k]:
            # Calculate a simple score based on number of matching crops
            score = len(analysis['crops']) / 5.0  # Normalize to 0-1
            
            best_wastes.append(CropWasteAnalysis(
                waste_type=analysis['waste_type'],
                waste_name=analysis['waste_name'],
                npk_ratio=analysis['npk_ratio'],
                organic_matter=analysis['organic_matter'],
                crops=analysis['crops'],
                score=score
            ))
        
        return CropWasteResponse(crop_type=request.crop_type, best_wastes=best_wastes)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/listing-crop-analysis")
async def listing_crop_analysis(listing_id: str, crop_type: str):
    """Get top 5 best crops for a specific listing's waste type"""
    try:
        # Get listing from Firestore
        doc_ref = db.collection('livestock_listings').document(listing_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        listing_data = doc.to_dict()
        
        # Determine waste type from listing
        waste_type = None
        if 'wasteType' in listing_data:
            waste_type = listing_data['wasteType']
        elif 'category' in listing_data:
            # Map category to waste type
            category_map = {
                'cattle': 'cattle_manure',
                'poultry': 'poultry_waste',
                'swine': 'swine_waste',
                'goats': 'goat_manure',
                'sheep': 'sheep_manure',
                'rabbits': 'rabbit_manure'
            }
            waste_type = category_map.get(listing_data['category'].lower())
        
        if not waste_type:
            # Default to cattle manure if not found
            waste_type = 'cattle_manure'
        
        # Get best crops for this waste type
        best_crops = get_best_crops_for_waste(waste_type, crop_type if crop_type != "all" else None)
        
        return {
            "listing_id": listing_id,
            "waste_type": waste_type,
            "waste_name": CROP_WASTE_KNOWLEDGE.get(waste_type, {}).get('name', 'Unknown'),
            "best_crops": best_crops[:5],
            "npk_ratio": CROP_WASTE_KNOWLEDGE.get(waste_type, {}).get('npk_ratio', 'N/A'),
            "organic_matter": CROP_WASTE_KNOWLEDGE.get(waste_type, {}).get('organic_matter', 'N/A')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
