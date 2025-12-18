#!/usr/bin/env python3
"""
Test script for crop-waste analysis endpoints
"""

import requests
import json

# Base URL for the backend
BASE_URL = "http://localhost:8000"

def test_crop_waste_analysis():
    """Test the crop-waste analysis endpoint"""
    print("Testing crop-waste analysis endpoint...")
    
    url = f"{BASE_URL}/crop-waste-analysis"
    payload = {
        "crop_type": "vegetables",
        "top_k": 5
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Crop Type: {data['crop_type']}")
            print(f"Number of best wastes: {len(data['best_wastes'])}")
            
            for waste in data['best_wastes']:
                print(f"\n- {waste['waste_name']}")
                print(f"  NPK Ratio: {waste['npk_ratio']}")
                print(f"  Organic Matter: {waste['organic_matter']}")
                print(f"  Score: {waste['score']:.2f}")
                print(f"  Number of crops: {len(waste['crops'])}")
        else:
            print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_listing_crop_analysis():
    """Test the listing crop analysis endpoint"""
    print("\n\nTesting listing crop analysis endpoint...")
    
    # Test with a sample listing ID
    listing_id = "test_listing_123"
    crop_type = "vegetables"
    
    url = f"{BASE_URL}/listing-crop-analysis"
    params = {
        "listing_id": listing_id,
        "crop_type": crop_type
    }
    
    try:
        response = requests.post(url, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Listing ID: {data['listing_id']}")
            print(f"Waste Type: {data['waste_type']}")
            print(f"Waste Name: {data['waste_name']}")
            print(f"NPK Ratio: {data['npk_ratio']}")
            print(f"Number of best crops: {len(data['best_crops'])}")
            
            for crop in data['best_crops']:
                print(f"\n- {crop['crop_name']}")
                print(f"  Reason: {crop['reason'][:100]}...")
        else:
            print(f"❌ Failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_different_crop_types():
    """Test the endpoint with different crop types"""
    print("\n\nTesting different crop types...")
    
    crop_types = ["vegetables", "fruits", "rice", "corn", "rootCrops", "legumes", "herbs"]
    
    for crop_type in crop_types:
        print(f"\nTesting {crop_type}...")
        
        url = f"{BASE_URL}/crop-waste-analysis"
        payload = {
            "crop_type": crop_type,
            "top_k": 3
        }
        
        try:
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                print(f"  ✅ Found {len(data['best_wastes'])} waste types")
            else:
                print(f"  ❌ Failed with status {response.status_code}")
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 50)
    print("Crop-Waste Analysis API Test")
    print("=" * 50)
    
    # Test the main endpoint
    test_crop_waste_analysis()
    
    # Test different crop types
    test_different_crop_types()
    
    # Test listing analysis (might fail if listing doesn't exist)
    test_listing_crop_analysis()
    
    print("\n" + "=" * 50)
    print("Test Complete!")
    print("=" * 50)
