import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { db, auth } from '../lib/firebase'
import { collection, onSnapshot, query, where, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getRecommendedListings, calculateDistance } from '../utils/recommendationAlgorithm'
import { onAuthStateChanged } from 'firebase/auth'
import { usePopup } from '../contexts/PopupContext'
import ReportModal from '../components/ReportModal'
import { uploadImageToFirebaseStorage } from '../lib/firebaseStorage'
import styles from '../../styles/modules/listings.module.css'

// Import crop data - matching mobile naming convention (snake_case)
const cropTypes = [
  { id: 'rice', name: 'Rice', icon: '/assets/images/wheat.png', description: 'Various rice varieties' },
  { id: 'corn', name: 'Corn', icon: '/assets/images/corn.png', description: 'Corn and maize varieties' },
  { id: 'vegetables', name: 'Vegetables', icon: '/assets/images/vegetables.png', description: 'Fresh vegetables' },
  { id: 'fruits', name: 'Fruits', icon: '/assets/images/fruits.png', description: 'Tropical fruits' },
  { id: 'root_crops', name: 'Root Crops', icon: '/assets/images/root-crops.png', description: 'Root and tuber crops' },
  { id: 'legumes', name: 'Legumes', icon: '/assets/images/legumes.png', description: 'Beans and legumes' },
  { id: 'herbs_spices', name: 'Herbs Spices', icon: '/assets/images/spices.png', description: 'Spices, seasonings, and culinary hbs' },
  { id: 'industrial_crops', name: 'Industrial Crops', icon: '/assets/images/industrial.png', description: 'Industrial and commercial crops' },
  { id: 'mushrooms', name: 'Mushrooms', icon: '/assets/images/mushrooms.png', description: 'Edible fungi and mushrooms' }
]

const specificCrops = {
  rice: [
    { id: 'white-rice', name: 'White rice', tagalog: 'Puting bigas' },
    { id: 'brown-rice', name: 'Brown rice', tagalog: 'Kayumangging bigas' },
    { id: 'red-rice', name: 'Red rice', tagalog: 'Pulang bigas' },
    { id: 'black-rice', name: 'Black rice', tagalog: 'Itim na bigas' },
    { id: 'purple-rice', name: 'Purple rice', tagalog: 'Ube na bigas' },
    { id: 'glutinous-rice', name: 'Glutinous rice', tagalog: 'Malagkit' },
    { id: 'aromatic-rice', name: 'Aromatic rice', tagalog: 'Mabango na bigas' },
    { id: 'lowland-rice', name: 'Lowland rice', tagalog: 'Palay-patag' },
    { id: 'upland-rice', name: 'Upland rice', tagalog: 'Palay-bundok' },
    { id: 'heirloom-rice', name: 'Heirloom rice', tagalog: 'Minanang palay' },
    { id: 'organic-rice', name: 'Organic rice', tagalog: 'Organic na bigas' }
  ],
  corn: [
    { id: 'yellow-corn', name: 'Yellow corn', tagalog: 'Dilaw na mais' },
    { id: 'white-corn', name: 'White corn', tagalog: 'Puting mais' },
    { id: 'sweet-corn', name: 'Sweet corn', tagalog: 'Matamis na mais' },
    { id: 'glutinous-corn', name: 'Glutinous corn', tagalog: 'Malagkit na mais' },
    { id: 'popcorn', name: 'Popcorn', tagalog: 'Mais pang-popcorn' },
    { id: 'feed-corn', name: 'Feed corn', tagalog: 'Mais pang-alisan' },
    { id: 'hybrid-corn', name: 'Hybrid corn', tagalog: 'Hybrid na mais' },
    { id: 'native-corn', name: 'Native corn', tagalog: 'Mais katutubo' },
    { id: 'baby-corn', name: 'Baby corn', tagalog: 'Mais na bata' }
  ],
  vegetables: [
    { id: 'bok-choy', name: 'Bok choy / Pechay', tagalog: 'Pechay' },
    { id: 'mustard-greens', name: 'Mustard greens', tagalog: 'Mustasa' },
    { id: 'lettuce', name: 'Lettuce', tagalog: 'Letsugas' },
    { id: 'spinach', name: 'Spinach', tagalog: 'Espinaka' },
    { id: 'water-spinach', name: 'Water spinach', tagalog: 'Kangkong' },
    { id: 'moringa-leaves', name: 'Moringa leaves', tagalog: 'Malunggay' },
    { id: 'malabar-spinach', name: 'Malabar spinach', tagalog: 'Alugbati' },
    { id: 'jute-leaves', name: 'Jute leaves', tagalog: 'Saluyot' },
    { id: 'cabbage', name: 'Cabbage', tagalog: 'Repolyo' },
    { id: 'chinese-cabbage', name: 'Chinese cabbage', tagalog: 'Pechay Baguio' },
    { id: 'napa-cabbage', name: 'Napa cabbage', tagalog: 'Napa' },
    { id: 'kale', name: 'Kale', tagalog: 'Kale' },
    { id: 'swiss-chard', name: 'Swiss chard', tagalog: 'Swiss chard' },
    { id: 'arugula', name: 'Arugula', tagalog: 'Arugula' },
    { id: 'sorrel', name: 'Sorrel', tagalog: 'Sorrel' },
    { id: 'endive', name: 'Endive', tagalog: 'Endibia' },
    { id: 'tomato', name: 'Tomato', tagalog: 'Kamatis' },
    { id: 'eggplant', name: 'Eggplant', tagalog: 'Talong' },
    { id: 'okra', name: 'Okra', tagalog: 'Okra' },
    { id: 'bitter-gourd', name: 'Bitter gourd', tagalog: 'Ampalaya' },
    { id: 'squash', name: 'Squash', tagalog: 'Kalabasa' },
    { id: 'cucumber', name: 'Cucumber', tagalog: 'Pipino' },
    { id: 'bell-pepper', name: 'Bell pepper', tagalog: 'Siling pang-salad' },
    { id: 'chili-pepper', name: 'Chili pepper', tagalog: 'Siling labuyo' },
    { id: 'chayote', name: 'Chayote', tagalog: 'Sayote' },
    { id: 'bottle-gourd', name: 'Bottle gourd', tagalog: 'Upo' },
    { id: 'sponge-gourd', name: 'Sponge gourd', tagalog: 'Patola' },
    { id: 'ridge-gourd', name: 'Ridge gourd', tagalog: 'Patolang ahas' },
    { id: 'winged-bean', name: 'Winged bean', tagalog: 'Sigarilyas' },
    { id: 'hyacinth-bean', name: 'Hyacinth bean', tagalog: 'Bataw' },
    { id: 'yardlong-bean', name: 'Yardlong bean', tagalog: 'Sitaw' },
    { id: 'snow-peas', name: 'Snow peas', tagalog: 'Sitsaro' },
    { id: 'green-peas', name: 'Green peas', tagalog: 'Gisantes' },
    { id: 'zucchini', name: 'Zucchini', tagalog: 'Zucchini' },
    { id: 'carrot', name: 'Carrot', tagalog: 'Karot' },
    { id: 'radish', name: 'Radish', tagalog: 'Labanos' },
    { id: 'beetroot', name: 'Beetroot', tagalog: 'Beets' },
    { id: 'turnip', name: 'Turnip', tagalog: 'Singkamas-puti' },
    { id: 'parsnip', name: 'Parsnip', tagalog: 'Parsnip' },
    { id: 'potato', name: 'Potato', tagalog: 'Patatas' },
    { id: 'sweet-potato', name: 'Sweet potato', tagalog: 'Kamote' },
    { id: 'cassava', name: 'Cassava', tagalog: 'Kamoteng kahoy' },
    { id: 'taro', name: 'Taro', tagalog: 'Gabi' },
    { id: 'purple-yam', name: 'Purple yam', tagalog: 'Ube' },
    { id: 'arrowroot', name: 'Arrowroot', tagalog: 'Uraro' },
    { id: 'yam-bean', name: 'Yam bean', tagalog: 'Singkamas' },
    { id: 'onion', name: 'Onion', tagalog: 'Sibuyas' },
    { id: 'garlic', name: 'Garlic', tagalog: 'Bawang' },
    { id: 'leek', name: 'Leek', tagalog: 'Porro' },
    { id: 'shallot', name: 'Shallot', tagalog: 'Shallot' },
    { id: 'asparagus', name: 'Asparagus', tagalog: 'Asparagus' },
    { id: 'bamboo-shoots', name: 'Bamboo shoots', tagalog: 'Labong' },
    { id: 'celery', name: 'Celery', tagalog: 'Kintsay' },
    { id: 'kohlrabi', name: 'Kohlrabi', tagalog: 'Kohlrabi' },
    { id: 'cauliflower', name: 'Cauliflower', tagalog: 'Koliplor' },
    { id: 'broccoli', name: 'Broccoli', tagalog: 'Broccoli' },
    { id: 'banana-blossom', name: 'Banana blossom', tagalog: 'Puso ng saging' },
    { id: 'squash-flower', name: 'Squash flower', tagalog: 'Bulaklak ng kalabasa' },
    { id: 'artichoke', name: 'Artichoke', tagalog: 'Artichoke' },
    { id: 'seaweed', name: 'Seaweed / Lato', tagalog: 'Lato' },
    { id: 'sea-grapes', name: 'Sea grapes', tagalog: 'Ar-arosep' },
    { id: 'agar-seaweed', name: 'Agar seaweed', tagalog: 'Gulaman' },
    { id: 'eucheuma', name: 'Eucheuma', tagalog: 'Eucheuma' },
    { id: 'pako', name: 'Pako', tagalog: 'Fiddlehead fern' },
    { id: 'katuray-flower', name: 'Katuray flower', tagalog: 'Katuray' },
    { id: 'talinum', name: 'Talinum', tagalog: 'Talinum' }
  ],
  fruits: [
    { id: 'banana', name: 'Banana', tagalog: 'Saging' },
    { id: 'mango', name: 'Mango', tagalog: 'Mangga' },
    { id: 'pineapple', name: 'Pineapple', tagalog: 'Pinya' },
    { id: 'papaya', name: 'Papaya', tagalog: 'Papaya' },
    { id: 'coconut', name: 'Coconut', tagalog: 'Niyog' },
    { id: 'jackfruit', name: 'Jackfruit', tagalog: 'Langka' },
    { id: 'durian', name: 'Durian', tagalog: 'Durian' },
    { id: 'rambutan', name: 'Rambutan', tagalog: 'Rambutan' },
    { id: 'lanzones', name: 'Lanzones', tagalog: 'Lansones' },
    { id: 'mangosteen', name: 'Mangosteen', tagalog: 'Mangostan' },
    { id: 'guava', name: 'Guava', tagalog: 'Bayabas' },
    { id: 'avocado', name: 'Avocado', tagalog: 'Abukado' },
    { id: 'calamansi', name: 'Calamansi', tagalog: 'Kalamansi' },
    { id: 'pomelo', name: 'Pomelo', tagalog: 'Suha' },
    { id: 'orange', name: 'Orange', tagalog: 'Kahel' },
    { id: 'lemon', name: 'Lemon', tagalog: 'Limon' },
    { id: 'lime', name: 'Lime', tagalog: 'Dayap' },
    { id: 'watermelon', name: 'Watermelon', tagalog: 'Pakwan' },
    { id: 'melon', name: 'Melon', tagalog: 'Melon' },
    { id: 'dragon-fruit', name: 'Dragon fruit', tagalog: 'Pitaya' },
    { id: 'star-apple', name: 'Star apple', tagalog: 'Caimito' },
    { id: 'sugar-apple', name: 'Sugar apple', tagalog: 'Atis' },
    { id: 'soursop', name: 'Soursop', tagalog: 'Guyabano' },
    { id: 'santol', name: 'Santol', tagalog: 'Santol' },
    { id: 'tamarind', name: 'Tamarind', tagalog: 'Sampalok' },
    { id: 'passion-fruit', name: 'Passion fruit', tagalog: 'Maracuya' },
    { id: 'chico', name: 'Chico / Sapodilla', tagalog: 'Chico' },
    { id: 'duhat', name: 'Duhat / Java plum', tagalog: 'Duhat' },
    { id: 'balimbing', name: 'Balimbing / Star fruit', tagalog: 'Balimbing' },
    { id: 'bignay', name: 'Bignay', tagalog: 'Bignay' },
    { id: 'macopa', name: 'Macopa / Wax apple', tagalog: 'Macopa' },
    { id: 'longan', name: 'Longan', tagalog: 'Longan' },
    { id: 'lychee', name: 'Lychee', tagalog: 'Lychee' },
    { id: 'kiat-kiat', name: 'Kiat-kiat / Mandarin', tagalog: 'Kiat-kiat' },
    { id: 'breadfruit', name: 'Breadfruit', tagalog: 'Rimas' },
    { id: 'marang', name: 'Marang', tagalog: 'Marang' },
    { id: 'pili-nut-fruit', name: 'Pili nut fruit', tagalog: 'Pili' },
    { id: 'bael-fruit', name: 'Bael fruit', tagalog: 'Bael' },
    { id: 'kamias', name: 'Kamias / Bilimbi', tagalog: 'Kamias' },
    { id: 'tamarillo', name: 'Tamarillo', tagalog: 'Tamarillo' },
    { id: 'mulberry', name: 'Mulberry', tagalog: 'Mulberry' },
    { id: 'strawberry', name: 'Strawberry', tagalog: 'Strawberry' },
    { id: 'persimmon', name: 'Persimmon', tagalog: 'Persimmon' },
    { id: 'fig', name: 'Fig', tagalog: 'Fig' },
    { id: 'pear', name: 'Pear', tagalog: 'Peras' },
    { id: 'apple', name: 'Apple', tagalog: 'Mansanas' },
    { id: 'plum', name: 'Plum', tagalog: 'Plum' },
    { id: 'peach', name: 'Peach', tagalog: 'Peach' },
    { id: 'cherry', name: 'Cherry', tagalog: 'Cherry' },
    { id: 'blueberry', name: 'Blueberry', tagalog: 'Blueberry' },
    { id: 'grapes', name: 'Grapes', tagalog: 'Ubas' }
  ],
  root_crops: [
    { id: 'sweet-potato-root', name: 'Sweet potato', tagalog: 'Kamote' },
    { id: 'cassava-root', name: 'Cassava', tagalog: 'Kamoteng kahoy' },
    { id: 'taro-root', name: 'Taro', tagalog: 'Gabi' },
    { id: 'purple-yam-root', name: 'Purple yam', tagalog: 'Ube' },
    { id: 'potato-root', name: 'Potato', tagalog: 'Patatas' },
    { id: 'arrowroot-root', name: 'Arrowroot', tagalog: 'Uraro' },
    { id: 'yam-bean-root', name: 'Yam bean', tagalog: 'Singkamas' },
    { id: 'radish-root', name: 'Radish', tagalog: 'Labanos' },
    { id: 'carrot-root', name: 'Carrot', tagalog: 'Karot' },
    { id: 'beetroot-root', name: 'Beetroot', tagalog: 'Beets' },
    { id: 'turnip-root', name: 'Turnip', tagalog: 'Singkamas-puti' },
    { id: 'parsnip-root', name: 'Parsnip', tagalog: 'Parsnip' },
    { id: 'ginger-root', name: 'Ginger', tagalog: 'Luya' },
    { id: 'turmeric-root', name: 'Turmeric', tagalog: 'Luyang dilaw' },
    { id: 'galangal-root', name: 'Galangal', tagalog: 'Langkawas' },
    { id: 'lotus-root', name: 'Lotus root', tagalog: 'Ugat ng lotus' },
    { id: 'greater-yam', name: 'Greater yam', tagalog: 'Ube-ubi' },
    { id: 'lesser-yam', name: 'Lesser yam', tagalog: 'Tugi' },
    { id: 'elephant-foot-yam', name: 'Elephant foot yam', tagalog: 'Gabi-gabi' },
    { id: 'purple-sweet-potato', name: 'Purple sweet potato', tagalog: 'Ube-kamote' },
    { id: 'tapioca-root', name: 'Tapioca root', tagalog: 'Cassava' },
    { id: 'jerusalem-artichoke', name: 'Jerusalem artichoke', tagalog: 'Jerusalem artichoke' },
    { id: 'kudzu-root', name: 'Kudzu root', tagalog: 'Ugat ng kudzu' }
  ],
  legumes: [
    { id: 'mung-bean', name: 'Mung bean', tagalog: 'Monggo' },
    { id: 'soybean', name: 'Soybean', tagalog: 'Soya' },
    { id: 'peanut', name: 'Peanut', tagalog: 'Mani' },
    { id: 'cowpea', name: 'Cowpea', tagalog: 'Paayap' },
    { id: 'string-bean', name: 'String beans / Yardlong bean', tagalog: 'Sitaw' },
    { id: 'winged-bean', name: 'Winged bean', tagalog: 'Sigarilyas' },
    { id: 'hyacinth-bean', name: 'Hyacinth bean', tagalog: 'Bataw' },
    { id: 'lima-bean', name: 'Lima bean', tagalog: 'Patani' },
    { id: 'chickpea', name: 'Chickpea', tagalog: 'Garbanzo' },
    { id: 'pigeon-pea', name: 'Pigeon pea', tagalog: 'Kadyos' },
    { id: 'lentil', name: 'Lentil', tagalog: 'Lentehas' },
    { id: 'black-bean', name: 'Black bean', tagalog: 'Itim na beans' },
    { id: 'red-kidney-bean', name: 'Red kidney bean', tagalog: 'Red kidney bean' },
    { id: 'white-bean', name: 'White bean', tagalog: 'Puting beans' },
    { id: 'green-peas', name: 'Green peas', tagalog: 'Gisantes' },
    { id: 'snow-peas', name: 'Snow peas', tagalog: 'Sitsaro' },
    { id: 'split-peas', name: 'Split peas', tagalog: 'Split peas' },
    { id: 'fava-bean', name: 'Fava bean / Broad bean', tagalog: 'Haba' },
    { id: 'adzuki-bean', name: 'Adzuki bean', tagalog: 'Adzuki' },
    { id: 'navy-bean', name: 'Navy bean', tagalog: 'Navy bean' },
    { id: 'pinto-bean', name: 'Pinto bean', tagalog: 'Pinto bean' },
    { id: 'jack-bean', name: 'Jack bean', tagalog: 'Jack bean' },
    { id: 'sword-bean', name: 'Sword bean', tagalog: 'Sword bean' },
    { id: 'velvet-bean', name: 'Velvet bean', tagalog: 'Velvet bean' },
    { id: 'rice-bean', name: 'Rice bean', tagalog: 'Rice bean' },
    { id: 'bambara-groundnut', name: 'Bambara groundnut', tagalog: 'Bambara' },
    { id: 'horse-gram', name: 'Horse gram', tagalog: 'Horse gram' }
  ],
  herbs_spices: [
    { id: 'garlic-spice', name: 'Garlic', tagalog: 'Bawang' },
    { id: 'onion-spice', name: 'Onion', tagalog: 'Sibuyas' },
    { id: 'shallot-spice', name: 'Shallot', tagalog: 'Lasuna' },
    { id: 'ginger-spice', name: 'Ginger', tagalog: 'Luya' },
    { id: 'turmeric-spice', name: 'Turmeric', tagalog: 'Luyang dilaw' },
    { id: 'galangal-spice', name: 'Galangal', tagalog: 'Langkawas' },
    { id: 'black-pepper', name: 'Black pepper', tagalog: 'Paminta' },
    { id: 'white-pepper', name: 'White pepper', tagalog: 'Puting paminta' },
    { id: 'chili-spice', name: 'Chili / Hot pepper', tagalog: 'Sili' },
    { id: 'birds-eye-chili', name: "Bird's eye chili", tagalog: 'Siling labuyo' },
    { id: 'paprika', name: 'Paprika', tagalog: 'Paprika' },
    { id: 'cinnamon', name: 'Cinnamon', tagalog: 'Kanela' },
    { id: 'cloves', name: 'Cloves', tagalog: 'Clavo' },
    { id: 'star-anise', name: 'Star anise', tagalog: 'Sangke' },
    { id: 'nutmeg', name: 'Nutmeg', tagalog: 'Nuez moscada' },
    { id: 'mace', name: 'Mace', tagalog: 'Mace' },
    { id: 'coriander-seed', name: 'Coriander seed', tagalog: 'Buto ng kulantro' },
    { id: 'cumin', name: 'Cumin', tagalog: 'Comino' },
    { id: 'fennel', name: 'Fennel', tagalog: 'Haras' },
    { id: 'fenugreek', name: 'Fenugreek', tagalog: 'Fenugreek' },
    { id: 'mustard-seed', name: 'Mustard seed', tagalog: 'Buto ng mustasa' },
    { id: 'allspice', name: 'Allspice', tagalog: 'Allspice' },
    { id: 'bay-leaf', name: 'Bay leaf', tagalog: 'Laurel' },
    { id: 'vanilla', name: 'Vanilla', tagalog: 'Banilya' },
    { id: 'tamarind-spice', name: 'Tamarind', tagalog: 'Sampalok' },
    { id: 'annatto', name: 'Annatto / Atsuete', tagalog: 'Atsuete' },
    { id: 'lemongrass-spice', name: 'Lemongrass', tagalog: 'Tanglad' },
    { id: 'pandan-spice', name: 'Pandan', tagalog: 'Pandan' },
    { id: 'kaffir-lime-leaf', name: 'Kaffir lime leaf', tagalog: 'Dahon ng dayap' },
    { id: 'curry-leaf', name: 'Curry leaf', tagalog: 'Dahon ng kari' },
    { id: 'sesame-seed', name: 'Sesame seed', tagalog: 'Linga' },
    { id: 'poppy-seed', name: 'Poppy seed', tagalog: 'Poppy seed' },
    { id: 'cardamom', name: 'Cardamom', tagalog: 'Cardamom' },
    { id: 'anise-seed', name: 'Anise seed', tagalog: 'Anis' },
    { id: 'saffron', name: 'Saffron', tagalog: 'Saffron' },
    { id: 'horseradish', name: 'Horseradish', tagalog: 'Horseradish' },
    { id: 'basil-herb', name: 'Basil', tagalog: 'Balanoy' },
    { id: 'oregano-herb', name: 'Oregano', tagalog: 'Oregano' },
    { id: 'thyme-herb', name: 'Thyme', tagalog: 'Taym' },
    { id: 'rosemary-herb', name: 'Rosemary', tagalog: 'Romero' },
    { id: 'mint-herb', name: 'Mint', tagalog: 'Yerba buena' },
    { id: 'lemongrass-herb', name: 'Lemongrass', tagalog: 'Tanglad' },
    { id: 'sambong', name: 'Sambong', tagalog: 'Sambong' },
    { id: 'lagundi', name: 'Lagundi', tagalog: 'Lagundi' },
    { id: 'tsaang-gubat', name: 'Tsaang gubat', tagalog: 'Tsaang gubat' },
    { id: 'akapulko', name: 'Akapulko', tagalog: 'Akapulko' },
    { id: 'pandan-herb', name: 'Pandan', tagalog: 'Pandan' },
    { id: 'ginger-herb', name: 'Ginger', tagalog: 'Luya' },
    { id: 'turmeric-herb', name: 'Turmeric', tagalog: 'Luyang dilaw' },
    { id: 'garlic-herb', name: 'Garlic', tagalog: 'Bawang' },
    { id: 'onion-herb', name: 'Onion', tagalog: 'Sibuyas' },
    { id: 'holy-basil', name: 'Holy basil', tagalog: 'Sangig' },
    { id: 'peppermint', name: 'Peppermint', tagalog: 'Peppermint' },
    { id: 'stevia', name: 'Stevia', tagalog: 'Stevia' },
    { id: 'catnip', name: 'Catnip', tagalog: 'Catnip' },
    { id: 'feverfew', name: 'Feverfew', tagalog: 'Feverfew' },
    { id: 'gotu-kola', name: 'Gotu kola', tagalog: 'Gotu kola / Pegaga' },
    { id: 'alagaw', name: 'Alagaw', tagalog: 'Alagaw' },
    { id: 'banaba', name: 'Banaba', tagalog: 'Banaba' },
    { id: 'bitter-melon-leaves', name: 'Bitter melon leaves', tagalog: 'Ampalaya leaves' }
  ],
  industrial_crops: [
    { id: 'tobacco', name: 'Tobacco', tagalog: 'Tabako' },
    { id: 'rubber', name: 'Rubber', tagalog: 'Goma' },
    { id: 'abaca', name: 'Abaca', tagalog: 'Abaka' },
    { id: 'cotton', name: 'Cotton', tagalog: 'Bulak' },
    { id: 'coffee', name: 'Coffee', tagalog: 'Kape' },
    { id: 'cacao', name: 'Cacao', tagalog: 'Kakaw' },
    { id: 'tea', name: 'Tea', tagalog: 'Tsaa' },
    { id: 'hemp', name: 'Hemp', tagalog: 'Abaka' },
    { id: 'oil-palm', name: 'Oil palm', tagalog: 'Palmang-langis' },
    { id: 'sugarcane', name: 'Sugarcane', tagalog: 'Tubo' }
  ],
  mushrooms: [
    { id: 'oyster-mushroom', name: 'Oyster mushroom', tagalog: 'Kabuteng talaba' },
    { id: 'button-mushroom', name: 'Button mushroom', tagalog: 'Kabuteng buton' },
    { id: 'shiitake', name: 'Shiitake', tagalog: 'Shiitake' },
    { id: 'straw-mushroom', name: 'Straw mushroom', tagalog: 'Kabuteng dayami' },
    { id: 'enoki', name: 'Enoki', tagalog: 'Enoki' },
    { id: 'wood-ear', name: 'Wood ear mushroom', tagalog: 'Tenga ng daga' },
    { id: 'king-oyster', name: "King oyster mushroom", tagalog: 'Kabuteng talaba hari' },
    { id: 'lions-mane', name: "Lion's mane mushroom", tagalog: "Kabuteng lion's mane" },
    { id: 'reishi', name: 'Reishi mushroom', tagalog: 'Kabuteng reishi' },
    { id: 'maitake', name: 'Maitake', tagalog: 'Kabuteng maitake' },
    { id: 'porcini', name: 'Porcini', tagalog: 'Kabuteng porcini' }
  ]
}

export default function Listings({ initialSelectedListing = null, onClearSelectedListing = null }) {
  const { showInfoPopup, showSuccessPopup, showErrorPopup, showConfirmPopup } = usePopup()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('') // Temporary input value
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredListings, setFilteredListings] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [outsideSearchResults, setOutsideSearchResults] = useState([])
  
  // Toast state for location permission
  const [showLocationToast, setShowLocationToast] = useState(false)
  const [locationToastMessage, setLocationToastMessage] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [showRecentSearches, setShowRecentSearches] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userCropTypes, setUserCropTypes] = useState([])
  const [userLivestockAnimals, setUserLivestockAnimals] = useState([])
  const [userSpecificAnimals, setUserSpecificAnimals] = useState([])
  const [userSpecificCrops, setUserSpecificCrops] = useState([])
  const [compatibilityMap, setCompatibilityMap] = useState(new Map())
  const abortControllerRef = useRef(null) // For canceling previous requests
  const [selectedCropType, setSelectedCropType] = useState('')
  const [bestForCropsListings, setBestForCropsListings] = useState([])
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(!!initialSelectedListing)
  const [requestedListings, setRequestedListings] = useState(new Set())
  const [requestStatuses, setRequestStatuses] = useState({})
  const [userLocation, setUserLocation] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [selectedListing, setSelectedListing] = useState(initialSelectedListing)
  const [modalStep, setModalStep] = useState(1) // 1: Basic Info, 2: Measurements, 3: Pricing, 4: Image
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    measurements: '',
    measurementUnit: 'kg',
    price: '',
    isFree: false,
    negotiable: false,
    description: '',
    image: null,
    imagePreview: null,
    category: '',
    subcategory: '',
    tags: [],
    quantity: ''
  })
  const [selectedWasteType, setSelectedWasteType] = useState('')
  const [otherAnimalType, setOtherAnimalType] = useState('')
  const [isCreatingListing, setIsCreatingListing] = useState(false)
  const [isRequestingListing, setIsRequestingListing] = useState(false)
  const [isDeletingListing, setIsDeletingListing] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportedListing, setReportedListing] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImageAlt, setSelectedImageAlt] = useState('')
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [outsideSearchPage, setOutsideSearchPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(40) // Dynamic: 40 for main, 20 for outside search
  const [isPaginating, setIsPaginating] = useState(false)
  
  // AI Validation states
  const [isImageValidating, setIsImageValidating] = useState(false)
  const [imageValidationResult, setImageValidationResult] = useState(null)
  const [isImageVerified, setIsImageVerified] = useState(false)
  const [validatedImageUrl, setValidatedImageUrl] = useState(null)
  
  // Text validation states
  const [isTextValidating, setIsTextValidating] = useState(false)
  const [textValidationResult, setTextValidationResult] = useState(null)
  const [isTextVerified, setIsTextVerified] = useState(false)
  const [hasAttemptedTextVerification, setHasAttemptedTextVerification] = useState(false)

  const measurementUnits = ['kg', 'ton', 'sack', 'bag', 'liter', 'cubic meter', 'pieces', 'bundle']

  // Helper function to map specific livestock to waste types
  const getLivestockWasteOptions = (specificAnimals = []) => {
    console.log('🔍 Getting waste options for specific animals:', specificAnimals)
    
    // Map each specific animal to its waste type
    const specificWasteMap = {
      // Cattle
      'cow': 'Cow Manure (Dumi ng Baka)',
      'dairy-cow': 'Dairy Cow Manure (Dumi ng Baka pang-gatas)',
      'beef-cow': 'Beef Cow Manure (Dumi ng Baka pang-karne)',
      // Poultry
      'chicken': 'Chicken Manure (Dumi ng Manok)',
      'layer-chicken': 'Layer Chicken Manure (Dumi ng Manok pang-itlog)',
      'broiler-chicken': 'Broiler Chicken Manure (Dumi ng Manok pang-karne)',
      'duck': 'Duck Waste (Dumi ng Pato)',
      'muscovy-duck': 'Muscovy Duck Waste (Dumi ng Pato Muscovy)',
      'turkey': 'Turkey Waste (Dumi ng Pabo)',
      'quail': 'Quail Waste (Dumi ng Pugo)',
      'goose': 'Goose Waste (Dumi ng Gansa)',
      // Swine
      'pig': 'Pig Manure (Dumi ng Baboy)',
      'native-pig': 'Native Pig Manure (Dumi ng Baboy katutubo)',
      'crossbred-pig': 'Crossbred Pig Manure (Dumi ng Baboy halong lahi)',
      // Goats
      'goat': 'Goat Manure (Dumi ng Kambing)',
      'native-goat': 'Native Goat Manure (Dumi ng Kambing katutubo)',
      'boer-goat': 'Boer Goat Manure (Dumi ng Kambing Boer)',
      // Sheep
      'sheep': 'Sheep Manure (Dumi ng Tupa)',
      'native-sheep': 'Native Sheep Manure (Dumi ng Tupa katutubo)',
      // Rabbits
      'rabbit': 'Rabbit Manure (Dumi ng Kuneho)',
      'native-rabbit': 'Native Rabbit Manure (Dumi ng Kuneho katutubo)',
      // Others
      'carabao': 'Carabao Manure (Dumi ng Kalabaw)',
      'horse': 'Horse Manure (Dumi ng Kabayo)',
      'donkey': 'Donkey Manure (Dumi ng Asno)',
      'bee': 'Bee Waste (Dumi ng Bubuyog / Maya)',
      'silkworm': 'Silkworm Waste (Uod ng Seda)',
      'ostrich': 'Ostrich Waste (Dumi ng Ostrich)',
      'camel': 'Camel Waste (Dumi ng Kamelyo)'
    }
    
    // Get unique waste types from specific animals
    let wasteTypes = []
    specificAnimals.forEach(animalId => {
      if (specificWasteMap[animalId]) {
        const wasteType = specificWasteMap[animalId]
        if (!wasteTypes.includes(wasteType)) {
          wasteTypes.push(wasteType)
        }
      }
    })
    
    return wasteTypes
  }

  // Helper function to get waste description
  const getWasteDescription = (wasteType) => {
    const descriptions = {
      'Cattle Manure': 'Rich organic fertilizer with balanced NPK ratio, excellent for improving soil structure and water retention. Ideal for row crops and vegetable gardens.',
      'Poultry Waste': 'High nitrogen content perfect for leafy vegetables and fast-growing crops. Helps accelerate composting and boosts microbial activity in soil.',
      'Swine Manure': 'Nutrient-dense fertilizer with high phosphorus content, excellent for root development and flowering plants. Great for fruit trees and root crops.',
      'Goat Manure': 'Mild odor and less likely to burn plants, suitable for direct application. Good all-purpose fertilizer for gardens and farms.',
      'Sheep Manure': 'High in phosphorus and potassium, promotes flowering and fruit production. Excellent for orchards and berry crops.',
      'Rabbit Manure': 'Cold manure that can be applied directly to plants without composting. Rich in nitrogen and perfect for vegetable gardens.',
      'Other Animal Waste': ''
    }
    return descriptions[wasteType] || ''
  }

  // Handle initial selected listing from props
  useEffect(() => {
    if (initialSelectedListing) {
      setSelectedListing(initialSelectedListing)
      setShowDetailsModal(true)
      document.body.style.overflow = 'hidden'
    }
  }, [initialSelectedListing])

  // Image modal functions
  const openImageModal = (imageUrl, imageAlt) => {
    setSelectedImage(imageUrl)
    setSelectedImageAlt(imageAlt)
    setShowImageModal(true)
    document.body.style.overflow = 'hidden'
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setSelectedImage(null)
    setSelectedImageAlt('')
    document.body.style.overflow = 'auto'
  }

  // Handle ESC key for image modal
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && showImageModal) {
        closeImageModal()
      }
    }

    if (showImageModal) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [showImageModal])

  // Function to get button text and state based on request status
  const getButtonState = (listingId) => {
    const status = requestStatuses[listingId]
    
    if (!status) {
      return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
    }
    
    switch (status) {
      case 'pending':
        return { text: 'Cancel Request', disabled: false, onClick: () => handleCancelRequest }
      case 'approved':
        return { text: 'Approved ✓', disabled: true, onClick: null }
      case 'rejected':
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
      case 'cancelled':
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
      default:
        return { text: 'Request', disabled: false, onClick: () => handleListingRequest }
    }
  }

  // Helper function to get AI image analysis reason
  const getAIImageAnalysis = (reason) => {
    if (!reason) {
      return 'No analysis available'
    }
    return reason.trim()
  }

  // Modal functions
  // AI Validation function
  const validateImageWithAI = async (imageFile, listingName, listingDetails, existingImageUrl = null) => {
    if (!imageFile) return null
    
    setIsImageValidating(true)
    setImageValidationResult(null)
    
    try {
      // Use existing image URL if provided (for re-validation), otherwise upload
      let imageUrl = existingImageUrl
      if (!imageUrl) {
        console.log('📤 Uploading image for AI validation...')
        imageUrl = await uploadImageToFirebaseStorage(imageFile, 'Images/Listing-Validation', user.uid)
      }
      
      // Call AI validation backend
      console.log('🤖 Calling AI validation service...')
      const aiValidationUrl = 'https://ai-backend-6-565d.onrender.com/validate-listing-image'
      console.log('🔗 Full validation URL:', aiValidationUrl)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 90000) // 90 second timeout for Render cold starts
      
      const response = await fetch(aiValidationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          listingName: listingName || '',
          listingDetails: listingDetails || ''
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`AI validation failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ AI validation result:', result)
      
      if (result.status === 'success') {
        setImageValidationResult(result.result)
        const isVerified = result.result.verdict === 'VERIFIED_LEGITIMATE'
        setIsImageVerified(isVerified)
        setValidatedImageUrl(imageUrl)
        
        // Show appropriate popup message only for non-legitimate cases
        if (!isVerified) {
          if (result.result.verdict === 'VERIFIED_NOT_LEGITIMATE') {
            // Removed popup - user doesn't want any AI verification popups
          } else {
            // Removed popup - user doesn't want any AI verification popups
          }
        }
        
        return { ...result.result, validatedImageUrl: imageUrl }
      } else {
        throw new Error(result.error || 'AI validation service error')
      }
    } catch (error) {
      console.error('❌ AI validation error:', error)
      // Silently fail validation - user doesn't want error popups
      return null
    } finally {
      setIsImageValidating(false)
    }
  }

  // Text validation function
  const validateListingText = async (listingName, listingDetails) => {
    if (!listingName || !listingDetails) return null
    
    setIsTextValidating(true)
    setTextValidationResult(null)
    
    try {
      console.log('🤖 Calling AI text validation service...')
      const textValidationUrl = 'https://ai-backend-6-565d.onrender.com/validate-listing-text'
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(textValidationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingName: listingName,
          listingDetails: listingDetails
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`AI text validation failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ AI text validation result:', result)
      
      if (result.status === 'success') {
        setTextValidationResult(result.result)
        const isVerified = result.result.verdict === 'VERIFIED_ALIGNED'
        setIsTextVerified(isVerified)
        
        return result.result
      } else {
        throw new Error(result.error || 'AI text validation service error')
      }
    } catch (error) {
      console.error('❌ AI text validation error:', error)
      // Set error state to show in UI
      setTextValidationResult({
        error: true,
        message: 'AI text validation endpoint is not available. Please ensure the backend endpoint /validate-listing-text is implemented at https://ai-backend-6-565d.onrender.com',
        verdict: 'ERROR'
      })
      setIsTextVerified(false)
      return null
      
    } finally {
      setIsTextValidating(false)
    }
  }

  // Re-validate image function
  const revalidateImage = async () => {
    if (formData.image && formData.name && formData.details) {
      await validateImageWithAI(formData.image, formData.name, formData.details, validatedImageUrl)
    }
  }

  // Check if all steps are completed
  const areAllStepsCompleted = () => {
    const step1Complete = formData.name.trim() && formData.details.trim()
    const step2Complete = formData.measurements && formData.measurementUnit
    const step3Complete = formData.isFree || (formData.price && parseFloat(formData.price) > 0)
    const step4Complete = formData.image !== null
    
    return step1Complete && step2Complete && step3Complete && step4Complete
  }

  // Check if current step is valid for Next button
  const isCurrentStepValid = () => {
    if (modalStep === 1) {
      // For livestock owners, ensure waste type is selected (not empty) and description is filled
      if (userRole === 'livestock_owner') {
        return formData.name.trim() && formData.name !== '' && formData.details.trim()
      }
      return formData.name.trim() && formData.details.trim()
    } else if (modalStep === 2) {
      return formData.measurements && formData.measurementUnit
    } else if (modalStep === 3) {
      return formData.isFree || (formData.price && parseFloat(formData.price) > 0)
    }
    return true // Step 4 doesn't need Next button
  }

  const openAddModal = async () => {
    console.log('📝 Opening add listing modal for user:', { 
      uid: user?.uid, 
      role: userRole, 
      email: user?.email 
    })
    
    // Clear any cached validation data
    setTextValidationResult(null)
    setIsTextVerified(false)
    setHasAttemptedTextVerification(false)
    
    // Refresh user profile data to get latest animal selections
    if (user && userRole === 'livestock_owner') {
      try {
        console.log('🔄 Refreshing user profile data before opening modal...')
        const userDoc = await getDoc(doc(db, 'Users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.livestock?.animals) {
            setUserLivestockAnimals(userData.livestock.animals)
            console.log('✅ Refreshed livestock animals:', userData.livestock.animals)
          }
          if (userData.livestock?.specificAnimals) {
            setUserSpecificAnimals(userData.livestock.specificAnimals)
            console.log('✅ Refreshed specific animals:', userData.livestock.specificAnimals)
          }
        }
      } catch (error) {
        console.error('❌ Error refreshing user profile:', error)
      }
    }
    
    // Reset form data
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null,
      imagePreview: null
    })
    
    // Reset waste type states
    setSelectedWasteType('')
    setOtherAnimalType('')
    
    // Auto-fill for livestock owners with single animal type
    if (userRole === 'livestock_owner' && userSpecificAnimals.length > 0) {
      const wasteOptions = getLivestockWasteOptions(userSpecificAnimals)
      if (wasteOptions.length === 1) {
        // Auto-fill if only one waste type
        setSelectedWasteType(wasteOptions[0])
        setFormData(prev => ({
          ...prev,
          name: wasteOptions[0]
        }))
      }
      // For multiple options, don't auto-select - let user choose
    }
    
    setShowAddModal(true)
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingListing(null)
    setModalStep(1)
    setIsImageValidating(false)
    setImageValidationResult(null)
    setIsImageVerified(false)
    setValidatedImageUrl(null)
    // Reset text validation states
    setIsTextValidating(false)
    setTextValidationResult(null)
    setIsTextVerified(false)
    setHasAttemptedTextVerification(false)
    setSelectedWasteType('')
    setOtherAnimalType('')
    setFormData({
      name: '',
      details: '',
      measurements: '',
      measurementUnit: 'kg',
      price: '',
      isFree: false,
      image: null,
      imagePreview: null
    })
  }

  // Handle verify button click in Step 1
  const handleVerify = async () => {
    if (!formData.name.trim() || !formData.details.trim()) {
      showErrorPopup('Required Fields', 'Please fill in listing title and description')
      return
    }
    
    // Trigger text validation for livestock owners
    if (userRole === 'livestock_owner') {
      await validateListingText(formData.name, formData.details)
      setHasAttemptedTextVerification(true)
    }
  }

  const nextStep = async () => {
    // Validation for each step
    if (modalStep === 1) {
      // For livestock owners, verification must be attempted before proceeding
      if (userRole === 'livestock_owner' && !hasAttemptedTextVerification) {
        showErrorPopup('Verification Required', 'Please verify your listing details before proceeding')
        return
      }
    } else if (modalStep === 2) {
      if (!formData.measurements || !formData.measurementUnit) {
        showErrorPopup('Required Fields', 'Please fill in quantity and unit of measurement')
        return
      }
    } else if (modalStep === 3) {
      if (!formData.isFree && !formData.price) {
        showErrorPopup('Required Fields', 'Please enter a price or mark as free')
        return
      }
    }
    setModalStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setModalStep(prev => Math.max(prev - 1, 1))
  }

  const openEditModal = (listing) => {
    // Get the correct image URL using the same logic as display
    const imageUrl = listing.images?.[0] || listing.imageUrls?.[0] || listing.imageUrl || listing.image || listing.photo || listing.photoUrl || listing.photos?.[0] || null
    
    setFormData({
      name: listing.name || '',
      details: listing.details || '',
      measurements: listing.measurements || '',
      measurementUnit: listing.measurementUnit || 'kg',
      price: listing.isFree ? '' : (listing.price === 'Free' ? '' : listing.price || ''),
      isFree: listing.isFree || listing.price === 'Free',
      image: imageUrl,
      imagePreview: imageUrl
    })
    setEditingListing(listing)
    setShowAddModal(true)
  }

  const deleteListing = async (listing) => {
    const confirmed = await showConfirmPopup(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      null,
      { danger: true, confirmText: 'Delete' }
    )
    
    if (confirmed) {
      setIsDeletingListing(true)
      try {
        // Update listing status to 'deleted' instead of deleting
        await updateDoc(doc(db, 'livestock_listings', listing.id), {
          status: 'deleted',
          dateDeleted: serverTimestamp()
        })
        console.log('✅ Successfully deleted listing ID:', listing.id)
        showSuccessPopup('Success', 'Listing deleted successfully')
      } catch (error) {
        console.error('Error deleting listing:', error)
        showErrorPopup('Error', 'Failed to delete listing')
      } finally {
        setIsDeletingListing(false)
      }
    }
  }

  const markAsSold = async (listing) => {
    const confirmed = await showConfirmPopup(
      'Mark as Sold',
      'Are you sure you want to mark this listing as sold? This will remove it from active listings.'
    )
    
    if (confirmed) {
      try {
        await updateDoc(doc(db, 'livestock_listings', listing.id), {
          status: 'sold',
          dateSold: serverTimestamp()
        })
        showSuccessPopup('Success', 'Listing marked as sold')
      } catch (error) {
        console.error('Error marking listing as sold:', error)
        showErrorPopup('Error', 'Failed to mark listing as sold')
      }
    }
  }

  const openDetailsModal = (listing) => {
    console.log('🔍 OPENING DETAILS MODAL - listing object:', listing)
    console.log('🔍 OPENING DETAILS MODAL - has semanticScore:', 'semanticScore' in listing)
    console.log('🔍 OPENING DETAILS MODAL - semanticScore value:', listing.semanticScore)
    console.log('🔍 OPENING DETAILS MODAL - listing keys:', Object.keys(listing))
    console.log('🔍 OPENING DETAILS MODAL - searchResults length:', searchResults.length)
    console.log('🔍 OPENING DETAILS MODAL - filteredListings length:', filteredListings.length)
    
    setSelectedListing(listing)
    setShowDetailsModal(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedListing(null)
    // Clear the initial selected listing in parent component
    if (onClearSelectedListing) {
      onClearSelectedListing()
    }
    // Restore background scrolling
    document.body.style.overflow = 'unset'
  }

  // Handle report listing
  const handleReportListing = (listing) => {
    if (!user) {
      showErrorPopup('Authentication Required', 'Please sign in to report a listing.')
      return
    }
    // Debug: Log the listing object to see what fields are available
    console.log('🔍 Reporting listing:', {
      id: listing?.id,
      name: listing?.name,
      image: listing?.image,
      images: listing?.images,
      imageUrl: listing?.imageUrl,
      imageUrls: listing?.imageUrls,
      fullListing: listing
    })
    setReportedListing(listing)
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setReportedListing(null)
  }

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('listingRecentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Handle escape key press and click outside
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showDetailsModal) {
          closeDetailsModal()
        }
        if (showAddModal) {
          closeModal()
        }
        if (showRecentSearches) {
          setShowRecentSearches(false)
        }
      }
    }

    const handleClickOutside = (event) => {
      if (showRecentSearches && !event.target.closest(`.${styles.searchContainer}`)) {
        setShowRecentSearches(false)
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDetailsModal, showAddModal, showRecentSearches])

  const saveListing = async () => {
    console.log('🚀 saveListing called with formData:', formData)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email, role: userRole })
    console.log('🔥 Database initialized:', !!db)
    console.log('🐐 User livestock animals:', userLivestockAnimals)
    console.log('🐐 User specific animals:', userSpecificAnimals)
    console.log('📝 Selected waste type:', selectedWasteType)

    // Validate all required fields first
    if (!formData.name.trim()) {
      showErrorPopup('Validation Error', 'Please enter a listing title')
      return
    }

    if (!formData.details.trim()) {
      showErrorPopup('Validation Error', 'Please enter a description')
      return
    }

    if (!formData.measurements || formData.measurements <= 0) {
      showErrorPopup('Validation Error', 'Please enter a valid quantity')
      return
    }

    if (!formData.measurementUnit) {
      showErrorPopup('Validation Error', 'Please select unit of measurement')
      return
    }

    if (!formData.isFree && (!formData.price || formData.price <= 0)) {
      showErrorPopup('Validation Error', 'Please enter a valid price or mark as free')
      return
    }

    if (!formData.image) {
      showErrorPopup('Validation Error', 'Please add an image')
      return
    }

    if (!user) {
      showErrorPopup('Authentication Error', 'User not authenticated. Please sign in again.')
      return
    }

    if (!db) {
      showErrorPopup('Database Error', 'Database not initialized. Please refresh the page.')
      return
    }

    // Show loading state and close modal for new listings
    const isUpdating = !!editingListing
    setIsCreatingListing(true)
    
    if (!isUpdating) {
      // Close modal immediately for new listings
      closeModal()
    }

    try {
      let imageUrl = null
      
      // Use validated image URL if available to avoid re-uploading
      if (validatedImageUrl) {
        console.log('📤 Reusing validated image URL:', validatedImageUrl)
      }
      // Handle image upload or preservation
      if (formData.image && formData.image instanceof File) {
        // New image file uploaded - upload to Firebase
        console.log('📤 Uploading new image to Firebase Storage...')
        try {
          imageUrl = await uploadImageToFirebaseStorage(formData.image, 'Images/Listing', user.uid)
          console.log('✅ New image uploaded successfully:', imageUrl)
        } catch (uploadError) {
          console.error('❌ Image upload failed:', uploadError)
          setIsCreatingListing(false)
          showErrorPopup('Upload Error', `Failed to upload image: ${uploadError.message}`)
          // Reopen modal if it was closed for new listing
          if (!isUpdating) {
            setShowAddModal(true)
          }
          return
        }
      } else if (formData.image && typeof formData.image === 'string') {
        // Existing Firebase URL - preserve it during edit
        console.log('🔄 Preserving existing image URL:', formData.image)
        imageUrl = formData.image
      } else if (formData.image === null) {
        // Image was removed - set imageUrl to null
        console.log('🗑️ Image removed - setting imageUrl to null')
        imageUrl = null
      } else {
        // Handle base64 fallback (should not happen with new implementation)
        console.warn('⚠️ Unexpected image format, checking for base64...')
        if (typeof formData.image === 'string' && formData.image.startsWith('data:')) {
          console.warn('⚠️ Image is base64 string, should be File object or Firebase URL')
          imageUrl = formData.image
        }
      }

      const listingData = {
        name: formData.name.trim(),
        details: formData.details.trim(),
        measurements: formData.measurements.trim(),
        measurementUnit: formData.measurementUnit,
        price: formData.isFree ? 'Free' : formData.price.trim(),
        isFree: formData.isFree,
        imageUrl: imageUrl, // Store as imageUrl for consistency with mobile app
        ownerId: user.uid,
        ownerName: user.displayName || user.email || 'Livestock Owner',
        ownerEmail: user.email || '',
        updatedAt: serverTimestamp(),
        // Save AI verification results for livestock owners
        ...(userRole === 'livestock_owner' && {
          textValidationResult: textValidationResult,
          imageValidationResult: imageValidationResult,
          validatedImageUrl: validatedImageUrl
        }),
        // Add AI verification data
        isAiVerified: isImageVerified || false,
        aiValidationResult: imageValidationResult || null
      }

      console.log('📝 Listing data to save:', listingData)

      if (editingListing) {
        // Update existing listing
        console.log('🔄 Updating existing listing:', editingListing.id)
        await updateDoc(doc(db, 'livestock_listings', editingListing.id), listingData)
        console.log('✅ Listing updated successfully')
        
        // Generate embedding for updated listing (fire-and-forget)
        generateListingEmbedding(editingListing.id)
        
        showSuccessPopup('Success', 'Listing updated successfully')
      } else {
        // Create new listing
        listingData.createdAt = serverTimestamp()
        console.log('🆕 Creating new listing...')
        const docRef = await addDoc(collection(db, 'livestock_listings'), listingData)
        console.log('✅ New listing created with ID:', docRef.id)
        
        // Generate embedding for new listing (fire-and-forget)
        generateListingEmbedding(docRef.id)
        
        showSuccessPopup('Success', 'Listing created successfully')
      }
      
      setIsCreatingListing(false)
      closeModal()
    } catch (error) {
      console.error('❌ Error saving listing:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        userId: user?.uid
      })
      
      let errorMessage = 'Failed to save listing. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      }
      
      setIsCreatingListing(false)
      showErrorPopup('Error', errorMessage)
      // Reopen modal if it was closed for new listing
      if (!isUpdating) {
        setShowAddModal(true)
      }
    }
  }

  // Handle cancel request
  const handleCancelRequest = async (listingId) => {
    console.log('🚀 handleCancelRequest called for listing:', listingId)
    console.log('👤 User data:', { uid: user?.uid, email: user?.email })
    console.log('🔥 Database initialized:', !!db)

    if (!user) {
      console.error('❌ No user found')
      setIsCreatingListing(false)
      showErrorPopup('Error', 'You must be logged in to create a listing')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      setIsCreatingListing(false)
      showErrorPopup('Connection Error', 'Database connection error. Please refresh the page.')
      return
    }

    if (!confirm('Are you sure you want to cancel this request?')) return

    try {
      console.log('🔍 Step 1: Searching for request to cancel...')
      
      // Find the request to cancel
      const requestsQuery = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', user.uid),
        where('listingId', '==', listingId)
      )
      
      console.log('📝 Query parameters:', {
        collection: 'listing_requests',
        requesterId: user.uid,
        listingId: listingId
      })
      
      const requestsSnapshot = await getDocs(requestsQuery)
      console.log('📊 Query results:', {
        empty: requestsSnapshot.empty,
        size: requestsSnapshot.size
      })
      
      if (!requestsSnapshot.empty) {
        console.log('✅ Found request to cancel')
        const requestDoc = requestsSnapshot.docs[0]
        const requestData = requestDoc.data()
        console.log('📋 Request data:', {
          id: requestDoc.id,
          listingName: requestData.listingName,
          listingOwnerId: requestData.listingOwnerId,
          status: requestData.status
        })
        
        console.log('💬 Step 2: Updating chat and sending message...')
        
        // Send cancellation message to the chat between users
        const participants = [user.uid, requestData.listingOwnerId].sort()
        const chatId = `${user.uid}_crop_farmer_to_${requestData.listingOwnerId}_livestock_owner_listing_${requestData.listingId}`
        const chatRef = doc(db, 'chats', chatId)
        
        console.log('📝 Chat details:', {
          participants: participants,
          chatId: chatId
        })
        
        try {
          // Check if chat exists first
          const chatDoc = await getDoc(chatRef)
          
          if (chatDoc.exists()) {
            // Update chat status to cancelled
            await updateDoc(chatRef, {
              requestStatus: 'cancelled',
              cancelledAt: serverTimestamp(),
              lastMessage: `Request cancelled for listing: ${requestData.listingName}`,
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid
            })
            console.log('✅ Chat status updated to cancelled')
          } else {
            console.log('⚠️ Chat document does not exist, trying fallback chat ID format...')
            
            // Try old chat ID format as fallback
            const fallbackChatId = participants.join('_')
            const fallbackChatRef = doc(db, 'chats', fallbackChatId)
            const fallbackChatDoc = await getDoc(fallbackChatRef)
            
            if (fallbackChatDoc.exists()) {
              await updateDoc(fallbackChatRef, {
                requestStatus: 'cancelled',
                cancelledAt: serverTimestamp(),
                lastMessage: `Request cancelled for listing: ${requestData.listingName}`,
                lastMessageTime: serverTimestamp(),
                lastMessageSenderId: user.uid
              })
              console.log('✅ Fallback chat status updated to cancelled')
            } else {
              console.log('⚠️ No chat document found with either format, skipping chat update')
            }
          }
        } catch (chatUpdateError) {
          console.error('❌ Failed to update chat status:', chatUpdateError)
          // Continue with cancellation even if chat update fails
        }
        
        try {
          const messageData = {
            text: `I have cancelled my request for "${requestData.listingName}". Thank you for your time.`,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Crop Farmer',
            createdAt: serverTimestamp(),
            read: false,
            type: 'request_cancellation'
          }

          // Try to add message to the chat (try both chat ID formats)
          try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
            console.log('✅ Cancellation message sent to chat')
          } catch (primaryMessageError) {
            console.log('⚠️ Failed to send message with primary chat ID, trying fallback...')
            const fallbackChatId = participants.join('_')
            await addDoc(collection(db, 'chats', fallbackChatId, 'messages'), messageData)
            console.log('✅ Cancellation message sent to fallback chat')
          }
        } catch (messageError) {
          console.error('❌ Failed to send cancellation message:', messageError)
          // Continue with cancellation even if message fails
        }

        console.log('🔄 Step 3: Updating original request message...')
        
        // Find and update the original request message to mark as cancelled
        try {
          // Try primary chat ID first
          let messagesRef = collection(db, 'chats', chatId, 'messages')
          let requestQuery = query(
            messagesRef,
            where('senderId', '==', user.uid),
            where('listingId', '==', requestData.listingId),
            where('isListingRequest', '==', true)
          )
          
          let requestSnapshot = await getDocs(requestQuery)
          
          // If no messages found, try fallback chat ID
          if (requestSnapshot.empty) {
            console.log('⚠️ No messages found with primary chat ID, trying fallback...')
            const fallbackChatId = participants.join('_')
            messagesRef = collection(db, 'chats', fallbackChatId, 'messages')
            requestQuery = query(
              messagesRef,
              where('senderId', '==', user.uid),
              where('listingId', '==', requestData.listingId),
              where('isListingRequest', '==', true)
            )
            requestSnapshot = await getDocs(requestQuery)
          }
          
          // Update all matching request messages to mark as cancelled
          const updatePromises = requestSnapshot.docs.map(requestDoc => 
            updateDoc(requestDoc.ref, { 
              isCancelled: true,
              cancelledAt: serverTimestamp(),
              requestStatus: 'cancelled'
            })
          )
          
          await Promise.all(updatePromises)
          console.log(`✅ Marked ${updatePromises.length} request messages as cancelled`)
        } catch (updateError) {
          console.error('❌ Error updating original request message:', updateError)
          // Continue with cancellation even if message update fails
        }

        console.log('🔄 Step 4: Updating request status to cancelled...')
        
        // Update request status to cancelled instead of deleting
        await updateDoc(requestDoc.ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        })
        console.log('✅ Request status updated to cancelled successfully')
        
        // Immediately update local state to allow re-requesting
        setRequestStatuses(prev => ({
          ...prev,
          [listingId]: 'cancelled'
        }))
        console.log('✅ Local state updated - button should now show "Request"')
        
        // Remove from requestedListings set
        setRequestedListings(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
        
        showSuccessPopup('Request Cancelled', 'Your request has been cancelled successfully and the owner has been notified. You can request this listing again if needed.')
      } else {
        console.error('❌ No request found to cancel')
        console.log('🔍 Debugging info:', {
          userUid: user.uid,
          listingId: listingId,
          queryCollection: 'listing_requests'
        })
        showInfoPopup('No Active Request', 'No active request found for this listing. It may have already been cancelled or processed.')
      }
    } catch (error) {
      console.error('❌ Error cancelling request:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        listingId: listingId,
        userId: user.uid
      })
      
      let errorMessage = 'Failed to cancel request. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Authentication error. Please sign out and sign in again.'
      }
      
      showErrorPopup('Error', errorMessage)
    }
  }

  // Simplified cancel request function (fallback)
  const handleCancelRequestSimple = async (listingId) => {
    console.log('🔄 Using simplified cancel request for listing:', listingId)
    
    if (!user || !db) {
      showErrorPopup('Authentication Required', 'Please sign in and refresh the page.')
      return
    }

    if (!confirm('Are you sure you want to cancel this request?')) return

    try {
      // Find and delete the request directly
      const requestsQuery = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', user.uid),
        where('listingId', '==', listingId)
      )
      
      const requestsSnapshot = await getDocs(requestsQuery)
      
      if (!requestsSnapshot.empty) {
        const requestDoc = requestsSnapshot.docs[0]
        await updateDoc(requestDoc.ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        })
        
        // Immediately update local state to allow re-requesting
        setRequestStatuses(prev => ({
          ...prev,
          [listingId]: 'cancelled'
        }))
        
        // Remove from requestedListings set
        setRequestedListings(prev => {
          const newSet = new Set(prev)
          newSet.delete(listingId)
          return newSet
        })
        
        console.log('✅ Simplified cancellation successful - button should now show "Request"')
        showSuccessPopup('Request Cancelled', 'Your request has been cancelled successfully! You can request this listing again if needed.')
      } else {
        showInfoPopup('No Active Request', 'No active request found for this listing.')
      }
    } catch (error) {
      console.error('❌ Simplified cancellation failed:', error)
      showErrorPopup('Request Failed', 'Failed to send request. Please try again.')
    } finally {
      // Ensure loading state is hidden
      setIsRequestingListing(false)
    }
  }

  // Handle listing request
  const handleListingRequest = async (listing) => {
    console.log('🚀 handleListingRequest called')
    console.log('📊 Initial validation:', {
      hasUser: !!user,
      hasListing: !!listing,
      hasDb: !!db,
      userRole: userRole,
      userId: user?.uid,
      listingId: listing?.id
    })

    // Basic validation
    if (!user) {
      console.error('❌ No user authenticated')
      showErrorPopup('Authentication Required', 'Please sign in to send requests.')
      return
    }

    if (!listing) {
      console.error('❌ No listing provided')
      showErrorPopup('Invalid Listing', 'Invalid listing data. Please try again.')
      return
    }

    if (!db) {
      console.error('❌ Database not initialized')
      showErrorPopup('Connection Error', 'Database connection error. Please refresh the page and try again.')
      return
    }

    // Validate required listing fields
    if (!listing.id) {
      console.error('❌ Listing missing ID:', listing)
      showErrorPopup('Invalid Data', 'Invalid listing data. Please refresh the page and try again.')
      return
    }

    if (!listing.ownerId) {
      console.error('❌ Listing missing owner ID:', listing)
      showErrorPopup('Owner Not Found', 'Unable to identify listing owner. Please try again.')
      return
    }

    if (listing.ownerId === user.uid) {
      showInfoPopup('Own Listing', 'You cannot request your own listing.')
      return
    }


    console.log('🚀 Starting request for listing:', listing.id, 'by user:', user.uid)
    console.log('📋 Full listing object:', listing)
    console.log('📋 Listing data extracted:', {
      id: listing.id,
      name: listing.name || listing.title,
      ownerId: listing.ownerId,
      ownerName: listing.ownerName,
      ownerEmail: listing.ownerEmail,
      price: listing.price,
      measurements: listing.measurements,
      details: listing.details || listing.description
    })
    console.log('👤 User data:', {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email
    })

    // Show loading state
    setIsRequestingListing(true)

    try {
      // Step 1: Create request record
      console.log('📝 Step 1: Preparing request data...')
      const requestData = {
        listingId: listing.id,
        listingName: listing.name || listing.title,
        listingOwnerName: listing.ownerName,
        listingOwnerId: listing.ownerId,
        requesterId: user.uid,
        requesterName: user.displayName || user.email || 'Crop Farmer',
        requesterEmail: user.email,
        status: 'pending',
        createdAt: serverTimestamp(),
        listing: {
          name: listing.name || listing.title,
          price: listing.price,
          measurements: listing.measurements,
          details: listing.details || listing.description
        }
      }
      console.log('✅ Request data prepared:', requestData)

      // Step 2: Add to listing_requests collection
      console.log('🔥 Step 2: Adding to listing_requests collection...')
      let docRef
      try {
        docRef = await addDoc(collection(db, 'listing_requests'), requestData)
        console.log('✅ Request created with ID:', docRef.id)
      } catch (requestError) {
        console.error('❌ Failed at Step 2 - Creating request:', requestError)
        throw new Error(`Request creation failed: ${requestError.message}`)
      }

      // Step 3: Create chat and send initial message
      console.log('💬 Step 3: Creating chat and sending message...')
      const participants = [user.uid, listing.ownerId].sort()
      const chatId = `${user.uid}_crop_farmer_to_${listing.ownerId}_livestock_owner_listing_${listing.id}`
      const chatRef = doc(db, 'chats', chatId)
      
      try {
        // Check if chat exists
        const chatDoc = await getDoc(chatRef)
        
        if (!chatDoc.exists()) {
          // Create new chat
          const chatData = {
            participants: participants,
            participantRoles: {
              [user.uid]: 'crop_farmer',
              [listing.ownerId]: 'livestock_owner'
            },
            participantNames: {
              [user.uid]: `${user.firstName || 'Crop'} ${user.lastName || 'Farmer'}`,
              [listing.ownerId]: listing.ownerName || 'Livestock Owner'
            },
            participantEmails: {
              [user.uid]: user.email || '',
              [listing.ownerId]: listing.ownerEmail || ''
            },
            listingId: listing.id,
            listingName: listing.name || 'Unnamed Listing',
            chatType: 'crop_farmer_to_livestock_owner',
            initiatorRole: 'crop_farmer',
            receiverRole: 'livestock_owner',
            createdAt: serverTimestamp(),
            lastMessage: '',
            lastMessageTime: serverTimestamp()
          }
          
          console.log('🔍 WEB CHAT: Creating chat with data:', {
            chatId: chatId,
            participants: chatData.participants,
            participantRoles: chatData.participantRoles,
            chatType: chatData.chatType,
            initiatorRole: chatData.initiatorRole,
            receiverRole: chatData.receiverRole
          })
          
          await setDoc(chatRef, chatData)
          console.log('✅ Chat created successfully')
        }

        // Send initial message
        const messageData = {
          text: `I am interested in your listing: ${listing.name || listing.title}. Please review my request.`,
          senderId: user.uid,
          senderName: user.displayName || user.email || 'Crop Farmer',
          createdAt: serverTimestamp(),
          read: false,
          isListingRequest: true,
          listingId: listing.id,
          listingTitle: listing.name || listing.title,
          requestStatus: 'pending',
          requestId: docRef.id
        }

        console.log('📤 WEB CHAT: Sending message with data:', {
          chatId: chatId,
          isListingRequest: messageData.isListingRequest,
          listingId: messageData.listingId,
          listingTitle: messageData.listingTitle,
          requestStatus: messageData.requestStatus
        })

        await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
        
        // Update chat's last message
        await updateDoc(chatRef, {
          lastMessage: messageData.text,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: user.uid
        })
        
        console.log('✅ Message sent to chat')
      } catch (chatError) {
        console.error('❌ Failed at Step 3 - Chat creation:', chatError)
        // Don't throw error here, as the request was already created successfully
        console.log('⚠️ Request created but chat/message failed')
      }

      // Step 4: Create notification for listing owner
      console.log('🔔 Step 4: Creating notification for listing owner...')
      const notificationData = {
        toUserId: listing.ownerId,
        fromUserId: user.uid,
        fromUserName: user.displayName || user.email || 'Crop Farmer',
        type: 'listing_request',
        title: 'New Listing Request',
        message: `${user.displayName || user.email || 'A crop farmer'} is interested in your listing: ${listing.name || listing.title}`,
        listingId: listing.id,
        listingName: listing.name || listing.title,
        requestId: docRef.id,
        chatId: chatId,
        read: false,
        createdAt: serverTimestamp()
      }

      try {
        const notificationRef = await addDoc(collection(db, 'notifications'), notificationData)
        console.log('✅ Notification sent to listing owner with ID:', notificationRef.id)
        console.log('📋 Notification data:', notificationData)
      } catch (notificationError) {
        console.error('❌ Failed at Step 4 - Creating notification:', notificationError)
        // Don't throw error here, as the request was already created successfully
        console.log('⚠️ Request created but notification failed')
      }

      // Step 6: Update local state
      console.log('✅ Step 6: Updating local state...')
      setRequestedListings(prev => {
        const newSet = new Set([...prev, listing.id])
        console.log('📊 Updated requestedListings after request:', Array.from(newSet))
        return newSet
      })
      
      // Immediately update request status to show "Cancel Request" button
      setRequestStatuses(prev => ({
        ...prev,
        [listing.id]: 'pending'
      }))
      
      console.log('🎉 Request process completed successfully for listing:', listing.id)
      
      // Hide loading state
      setIsRequestingListing(false)
      
      showSuccessPopup('Request Sent!', 'Your request has been sent to the listing owner. They will be notified and can approve your request in their chat.')
    } catch (error) {
      // Hide loading state on error
      setIsRequestingListing(false)
      console.error('❌ Error sending request:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
        listingId: listing.id,
        userId: user.uid
      })
      
      // Try simplified request creation as fallback
      console.log('🔄 Attempting simplified request creation...')
      try {
        const simpleRequestData = {
          listingId: listing.id,
          listingName: listing.name || 'Unnamed Listing',
          listingOwnerId: listing.ownerId,
          requesterId: user.uid,
          requesterName: user.displayName || user.email || 'Crop Farmer',
          status: 'pending',
          createdAt: serverTimestamp()
        }
        
        const fallbackDocRef = await addDoc(collection(db, 'listing_requests'), simpleRequestData)
        console.log('✅ Simplified request created with ID:', fallbackDocRef.id)
        
        // Try to create chat and send message in fallback too
        try {
          const participants = [user.uid, listing.ownerId].sort()
          const chatId = `${user.uid}_crop_farmer_to_${listing.ownerId}_livestock_owner_listing_${listing.id}`
          const chatRef = doc(db, 'chats', chatId)
          
          // Check if chat exists
          const chatDoc = await getDoc(chatRef)
          
          if (!chatDoc.exists()) {
            // Create new chat
            const chatData = {
              participants: participants,
              participantRoles: {
                [user.uid]: 'crop_farmer',
                [listing.ownerId]: 'livestock_owner'
              },
              participantNames: {
                [user.uid]: user.displayName || user.email || 'Crop Farmer',
                [listing.ownerId]: listing.ownerName
              },
              participantEmails: {
                [user.uid]: user.email || '',
                [listing.ownerId]: listing.ownerEmail || ''
              },
              listingId: listing.id,
              listingName: listing.name || 'Unnamed Listing',
              chatType: 'crop_farmer_to_livestock_owner',
              initiatorRole: 'crop_farmer',
              receiverRole: 'livestock_owner',
              createdAt: serverTimestamp(),
              lastMessage: `I am interested in your listing: ${listing.name || listing.title}`,
              lastMessageTime: serverTimestamp(),
              lastMessageSenderId: user.uid,
              requestStatus: 'pending',
              requestId: fallbackDocRef.id,
              updatedAt: serverTimestamp()
            }
            
            await setDoc(chatRef, chatData)
          }

          // Send initial message
          const messageData = {
            text: `I am interested in your listing: ${listing.name || listing.title}. Please review my request.`,
            senderId: user.uid,
            senderName: user.displayName || user.email || 'Crop Farmer',
            createdAt: serverTimestamp(),
            read: false,
            isListingRequest: true,
            listingId: listing.id,
            listingTitle: listing.name || listing.title,
            requestStatus: 'pending',
            requestId: fallbackDocRef.id
          }

          await addDoc(collection(db, 'chats', chatId, 'messages'), messageData)
          
          // Update chat's last message
          await updateDoc(chatRef, {
            lastMessage: messageData.text,
            lastMessageTime: serverTimestamp(),
            lastMessageSenderId: user.uid
          })
          
          console.log('✅ Fallback chat and message sent')
        } catch (fallbackChatError) {
          console.error('⚠️ Fallback chat failed:', fallbackChatError)
        }

        // Try to send notification in fallback too
        try {
          const fallbackNotificationData = {
            toUserId: listing.ownerId,
            fromUserId: user.uid,
            fromUserName: user.displayName || user.email || 'Crop Farmer',
            type: 'listing_request',
            title: 'New Listing Request',
            message: `${user.displayName || user.email || 'A crop farmer'} is interested in your listing: ${listing.name || listing.title}`,
            listingId: listing.id,
            listingName: listing.name || listing.title,
            requestId: fallbackDocRef.id,
            read: false,
            createdAt: serverTimestamp()
          }
          await addDoc(collection(db, 'notifications'), fallbackNotificationData)
          console.log('✅ Fallback notification sent')
        } catch (fallbackNotificationError) {
          console.error('⚠️ Fallback notification failed:', fallbackNotificationError)
        }
        
        setRequestedListings(prev => new Set([...prev, listing.id]))
        
        // Immediately update request status for fallback too
        setRequestStatuses(prev => ({
          ...prev,
          [listing.id]: 'pending'
        }))
        
        // Hide loading state before showing success popup
        setIsRequestingListing(false)
        
        showSuccessPopup('Request Sent!', 'Your request has been sent to the listing owner. They will be notified and can respond in their chat.')
        return
      } catch (fallbackError) {
        console.error('❌ Fallback request also failed:', fallbackError)
      }
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to send request. Please try again.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.'
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again in a moment.'
      } else if (error.code === 'deadline-exceeded') {
        errorMessage = 'Request timed out. Please check your internet connection and try again.'
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message?.includes('auth')) {
        errorMessage = 'Authentication error. Please sign out and sign in again.'
      }
      
      showErrorPopup('Request Failed', errorMessage)
    }
  }

  // Auth state listener
  useEffect(() => {
  if (!auth) {
    setAuthLoading(false)
    return
  }
  
  // Normalize crop type IDs to match mobile/API convention (snake_case)
  const normalizeCropTypeId = (cropTypeId) => {
    const mapping = {
      'rootCrops': 'root_crops',
      'spices': 'herbs_spices',
      'industrial': 'industrial_crops'
    }
    return mapping[cropTypeId] || cropTypeId
  }

  // Normalize an array of crop type IDs
  const normalizeCropTypes = (cropTypes) => {
    return cropTypes.map(normalizeCropTypeId)
  }

  // Migrate user's crop data to snake_case format
  const migrateCropDataToSnakeCase = async (userId) => {
    try {
      const userDocRef = doc(db, 'Users', userId)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) return
      
      const userData = userDoc.data()
      let needsUpdate = false
      const updates = {}
      
      // Check and normalize cropFarmer.cropType
      if (userData.cropFarmer?.cropType) {
        const normalizedCropTypes = normalizeCropTypes(userData.cropFarmer.cropType)
        if (JSON.stringify(normalizedCropTypes) !== JSON.stringify(userData.cropFarmer.cropType)) {
          updates['cropFarmer.cropType'] = normalizedCropTypes
          needsUpdate = true
        }
      }
      
      // Check and normalize cropFarmer.cropVarieties keys
      if (userData.cropFarmer?.cropVarieties) {
        const oldVarieties = userData.cropFarmer.cropVarieties
        const newVarieties = {}
        let varietiesChanged = false
        
        Object.keys(oldVarieties).forEach(cropType => {
          const normalizedKey = normalizeCropTypeId(cropType)
          newVarieties[normalizedKey] = oldVarieties[cropType]
          if (normalizedKey !== cropType) {
            varietiesChanged = true
          }
        })
        
        if (varietiesChanged) {
          updates['cropFarmer.cropVarieties'] = newVarieties
          needsUpdate = true
        }
      }
      
      // Check and normalize onboarding.cropTypes
      if (userData.onboarding?.cropTypes) {
        const normalizedCropTypes = normalizeCropTypes(userData.onboarding.cropTypes)
        if (JSON.stringify(normalizedCropTypes) !== JSON.stringify(userData.onboarding.cropTypes)) {
          updates['onboarding.cropTypes'] = normalizedCropTypes
          needsUpdate = true
        }
      }
      
      // Check and normalize onboarding.cropVarieties keys
      if (userData.onboarding?.cropVarieties) {
        const oldVarieties = userData.onboarding.cropVarieties
        const newVarieties = {}
        let varietiesChanged = false
        
        Object.keys(oldVarieties).forEach(cropType => {
          const normalizedKey = normalizeCropTypeId(cropType)
          newVarieties[normalizedKey] = oldVarieties[cropType]
          if (normalizedKey !== cropType) {
            varietiesChanged = true
          }
        })
        
        if (varietiesChanged) {
          updates['onboarding.cropVarieties'] = newVarieties
          needsUpdate = true
        }
      }
      
      // Apply updates if needed
      if (needsUpdate) {
        await updateDoc(userDocRef, updates)
        console.log('✅ Migrated crop data to snake_case format:', updates)
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Error migrating crop data:', error)
      return false
    }
  }

  // Listen for crop updates from profile page
  const handleCropsUpdated = async () => {
    console.log('🔄 ========== CROPS UPDATED EVENT ==========')
    console.log('🔄 Crops updated event received, refreshing user data...')
    if (user) {
      try {
        console.log('📡 Fetching fresh crop data from Firestore after save...')
        const userDoc = await getDoc(doc(db, 'Users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          
          console.log('📋 Full userData from Firestore:', {
            cropFarmer: userData.cropFarmer,
            onboarding: userData.onboarding
          })
          
          // Update crop types and specific crops
          if (userData.role === 'crop_farmer' && userData.cropFarmer?.cropType) {
            // Data should already be in snake_case after migration, but just in case
            const newCropTypes = userData.cropFarmer.cropType
            const oldCropTypes = userCropTypes
            setUserCropTypes(newCropTypes)
            
            console.log('📋 Old crop types:', oldCropTypes)
            console.log('📋 New crop types:', newCropTypes)
            console.log('📋 Crop types REPLACED:', !oldCropTypes.every(ct => newCropTypes.includes(ct)))
            
            // Get crop varieties and convert to IDs (same as mobile)
            const cropVarieties = userData.cropFarmer?.cropVarieties || userData.onboarding?.cropVarieties || {}
            const allCropIds = []
            
            console.log('📋 Crop varieties from Firestore (should be ONLY new selections):', JSON.stringify(cropVarieties, null, 2))
            
            Object.keys(cropVarieties).forEach(cropType => {
              const varieties = cropVarieties[cropType] || []
              console.log(`   ${cropType}: ${varieties.length} varieties`)
              varieties.forEach(variety => {
                const englishName = variety.split('(')[0].trim()
                const cropId = englishName.toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^\w-]/g, '')
                  .trim()
                allCropIds.push(cropId)
              })
            })
            
            console.log('📋 Total crop IDs after conversion:', allCropIds.length)
            console.log('📋 Crop IDs:', allCropIds)
            
            setUserSpecificCrops(allCropIds)
            console.log('✅ User crops refreshed with NEW data only')
            
            // Clear compatibility cache to force fresh API call
            const oldCacheKey = `compatibility_${userSpecificCrops.sort().join('_')}`
            const newCacheKey = `compatibility_${allCropIds.sort().join('_')}`
            sessionStorage.removeItem(oldCacheKey)
            sessionStorage.removeItem(newCacheKey)
            console.log('🗑️ Cleared compatibility cache')
            
            // Clear the compatibility map to force fresh data
            setCompatibilityMap(new Map())
            console.log('🗑️ Cleared compatibility map')
            
            // Check if currently selected crop type is still in user's crops
            const currentSelectedCropType = selectedCropType
            if (currentSelectedCropType && !newCropTypes.includes(currentSelectedCropType)) {
              console.log('⚠️ Selected crop type no longer in user crops, resetting to "All Crop Types"')
              setSelectedCropType('')
              // Will reload with all crops below
            }
            
            // Reload listings with new crop data
            console.log('🔄 Reloading listings with REPLACED crop data...')
            setLoading(true)
            
            // Small delay to ensure state updates are processed
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Explicitly reload based on current dropdown selection
            if (currentSelectedCropType && newCropTypes.includes(currentSelectedCropType)) {
              // If a specific crop type is selected and still valid, reload for that crop type
              console.log('🔄 Reloading for specific crop type:', currentSelectedCropType)
              await applyCropWasteFilter(currentSelectedCropType)
            } else {
              // Otherwise, reload for all crops
              console.log('🔄 Reloading for all crop types')
              await applyAllCropsFilter()
            }
            
            console.log('✅ ========== CROPS UPDATED COMPLETE ==========')
            console.log('✅ Effectiveness percentages now show ONLY varieties from newly saved crops')
          }
        }
      } catch (error) {
        console.error('❌ Error refreshing user crops:', error)
      } finally {
        setLoading(false)
      }
    }
  }
  
  window.addEventListener('cropsUpdated', handleCropsUpdated)
  
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      setUser(currentUser)
      console.log('🔍 User authenticated:', currentUser.uid)
      
      // Get user role from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'Users', currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('👤 User profile loaded:', userData)
          console.log('👤 User role:', userData.role)
          console.log('📍 User location data:', userData.location)
          console.log('🌾 userData.cropFarmer:', userData.cropFarmer)
          console.log('🌾 userData.cropFarmer?.cropType:', userData.cropFarmer?.cropType)
          console.log('🌱 userData.onboarding:', userData.onboarding)
          console.log('🌱 userData.onboarding?.cropTypes:', userData.onboarding?.cropTypes)
          
          setUserRole(userData.role)
          
          // Get crop types for crop farmers
          if (userData.role === 'crop_farmer') {
            // Migrate crop data to snake_case format (one-time operation)
            const wasMigrated = await migrateCropDataToSnakeCase(currentUser.uid)
            
            // If data was migrated, reload it
            if (wasMigrated) {
              const updatedUserDoc = await getDoc(doc(db, 'Users', currentUser.uid))
              if (updatedUserDoc.exists()) {
                const updatedUserData = updatedUserDoc.data()
                
                // Use the migrated data
                const cropTypes = updatedUserData.cropFarmer?.cropType || updatedUserData.onboarding?.cropTypes || []
                console.log('✅ Setting user crop types (after migration):', cropTypes)
                setUserCropTypes(cropTypes)
                
                const cropVarieties = updatedUserData.cropFarmer?.cropVarieties || updatedUserData.onboarding?.cropVarieties || {}
                const allCropIds = []
                
                Object.keys(cropVarieties).forEach(cropType => {
                  const varieties = cropVarieties[cropType] || []
                  varieties.forEach(variety => {
                    const englishName = variety.split('(')[0].trim()
                    const cropId = englishName.toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^\w-]/g, '')
                      .trim()
                    allCropIds.push(cropId)
                  })
                })
                
                console.log('🌾 User crop IDs (after migration):', allCropIds)
                setUserSpecificCrops(allCropIds)
              }
            } else {
              // No migration needed, use existing data
              const cropTypes = userData.cropFarmer?.cropType || userData.onboarding?.cropTypes || []
              console.log('✅ Setting user crop types:', cropTypes)
              setUserCropTypes(cropTypes)
              
              const cropVarieties = userData.cropFarmer?.cropVarieties || userData.onboarding?.cropVarieties || {}
              const allCropIds = []
              
              Object.keys(cropVarieties).forEach(cropType => {
                const varieties = cropVarieties[cropType] || []
                varieties.forEach(variety => {
                  const englishName = variety.split('(')[0].trim()
                  const cropId = englishName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]/g, '')
                    .trim()
                  allCropIds.push(cropId)
                })
              })
              
              console.log('🌾 User crop IDs:', allCropIds)
              setUserSpecificCrops(allCropIds)
              
              console.log('🔍 ========== CROP VARIETIES DEBUG ==========')
              console.log('🔍 cropVarieties object:', cropVarieties)
              console.log('🔍 cropVarieties keys:', Object.keys(cropVarieties))
              console.log('🔍 Final allCropIds:', allCropIds)
              console.log('🔍 allCropIds length:', allCropIds.length)
              console.log('🔍 ==========================================')
            }
          } else {
            console.log('⚠️ Not a crop farmer, clearing crop data')
            setUserCropTypes([])
            setUserSpecificCrops([])
          }
          
          // Get livestock animals for livestock owners
          if (userData.role === 'livestock_owner' && userData.livestock?.animals) {
            setUserLivestockAnimals(userData.livestock.animals)
            console.log(' User livestock animals loaded:', userData.livestock.animals)
            
            // Load specific animals if "others" is selected
            if (userData.livestock.specificAnimals) {
              setUserSpecificAnimals(userData.livestock.specificAnimals)
              console.log(' User specific animals loaded:', userData.livestock.specificAnimals)
            }
          } else {
            setUserLivestockAnimals([])
            setUserSpecificAnimals([])
          }
          
          if (userData.location && typeof userData.location === 'object') {
            console.log(' DEBUG: Raw user location from Firestore:', userData.location)
            console.log(' DEBUG: Location field names:', Object.keys(userData.location))
            setUserLocation(userData.location)
            console.log('✅ User location set:', userData.location)
          } else {
            setUserLocation(null)
            console.log('❌ No valid user location found')
          }
        } else {
          setUserRole('crop_farmer')
          setUserLocation(null)
        }
      } catch (error) {
        console.error('❌ Error loading user profile:', error)
        setUserRole('crop_farmer')
        setUserLocation(null)
      }
    } else {
      setUser(null)
      setUserRole(null)
      setUserLocation(null)
    }
    setAuthLoading(false)
  })

  return () => {
    unsubscribe()
    window.removeEventListener('cropsUpdated', handleCropsUpdated)
  }
}, [auth])

// Load existing requests for crop farmers
useEffect(() => {
  if (!user || !db || userRole !== 'crop_farmer') return

  console.log('🔍 Setting up real-time listener for requests by user:', user.uid)
  
  const q = query(
    collection(db, 'listing_requests'),
    where('requesterId', '==', user.uid),
    where('status', '==', 'pending')
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('📊 Requested listings snapshot update:', {
      size: snapshot.size,
      docChanges: snapshot.docChanges().length
    })
    
    const requestedIds = new Set()
    snapshot.forEach((doc) => {
      const data = doc.data()
      console.log('📋 Found request for listing:', data.listingId)
      requestedIds.add(data.listingId)
    })
    
    console.log('✅ Updated requestedListings state:', Array.from(requestedIds))
    setRequestedListings(requestedIds)
  }, (error) => {
    console.error('Error loading existing requests:', error)
  })

  return () => unsubscribe()
}, [user, userRole])

  // Load all request statuses for crop farmers (to track approved/rejected requests)
  useEffect(() => {
    if (!user || !db || userRole !== 'crop_farmer') return

    console.log('🔍 Setting up listener for all request statuses by user:', user.uid)
    console.log('🔄 LISTINGS COMPONENT MOUNTED - Starting real-time sync')
    
    const q = query(
      collection(db, 'listing_requests'),
      where('requesterId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statuses = {}
      console.log('📊 DEBUG: Raw snapshot docs count:', snapshot.size)
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        console.log('📊 DEBUG: Request document:', {
          id: doc.id,
          listingId: data.listingId,
          status: data.status,
          requesterId: data.requesterId
        })
        statuses[data.listingId] = data.status
      })
      
      console.log('📊 DEBUG: Final request statuses object:', statuses)
      console.log('📊 Updated request statuses:', statuses)
      setRequestStatuses(statuses)
      
      // CRITICAL: Force re-render check
      console.log('🔄 React state updated with request statuses')
    }, (error) => {
      console.error('Error loading request statuses:', error)
    })

    // FORCE REFRESH: Also fetch immediately on mount to ensure latest data
    const forceRefresh = async () => {
      try {
        console.log('🔄 FORCE REFRESH: Fetching latest request statuses...')
        const snapshot = await getDocs(q)
        const statuses = {}
        snapshot.forEach((doc) => {
          const data = doc.data()
          statuses[data.listingId] = data.status
        })
        console.log('🔄 FORCE REFRESH: Updated statuses:', statuses)
        setRequestStatuses(statuses)
      } catch (error) {
        console.error('🔄 FORCE REFRESH: Error fetching statuses:', error)
      }
    }
    
    forceRefresh()

    return () => {
      console.log('🔄 LISTINGS COMPONENT UNMOUNTED - Cleaning up listener')
      unsubscribe()
    }
  }, [user, userRole])


  // Fetch listings for livestock owners (real-time snapshot)
  useEffect(() => {
    if (!db || authLoading || !user || userRole !== 'livestock_owner') return

    setLoading(true)
    setError(null)

    const listingsRef = collection(db, 'livestock_listings')
    const q = query(listingsRef, where('ownerId', '==', user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('📊 Listings snapshot received (livestock_owner):', {
        userId: user.uid,
        snapshotSize: snapshot.size,
        isEmpty: snapshot.empty
      })

      const listingsData = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        listingsData.push({
          id: docSnap.id,
          ...data
        })
      })

      console.log('✅ Total listings loaded (livestock_owner):', listingsData.length)
      setListings(listingsData)
      setFilteredListings(mergeCompatibilityData(listingsData))
      setLoading(false)
    }, (error) => {
      console.error('❌ Error loading listings for livestock owner:', error)
      setError('Failed to load listings')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [db, user, userRole, authLoading])

  // Check if user has location enabled and show toast if not
  useEffect(() => {
    console.log('🔍 ========== LOCATION TOAST CHECK ==========')
    console.log('🔍 authLoading:', authLoading)
    console.log('🔍 hasUser:', !!user)
    console.log('🔍 user.uid:', user?.uid)
    console.log('🔍 userRole:', userRole)
    console.log('🔍 userLocation:', userLocation)
    console.log('🔍 userLocation type:', typeof userLocation)
    console.log('🔍 userLocation keys:', userLocation ? Object.keys(userLocation) : 'null')
    console.log('🔍 shouldShowToast:', !authLoading && user && userRole === 'crop_farmer' && !userLocation)
    console.log('🔍 ==========================================')
    
    if (!authLoading && user && userRole === 'crop_farmer' && !userLocation) {
      console.log('⚠️ ========== SHOWING LOCATION TOAST ==========')
      console.log('⚠️ userLocation is:', userLocation)
      setLocationToastMessage('Please enable your location in account settings to see distance to listings. This helps you find the nearest agricultural products.')
      setShowLocationToast(true)
      console.log('⚠️ Toast state set to true')
      console.log('⚠️ ==========================================')
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        setShowLocationToast(false)
      }, 8000)
    } else if (userLocation) {
      console.log('✅ Location toast hidden because userLocation exists:', userLocation)
    }
  }, [authLoading, user, userRole, userLocation])

  // Handle toast click to navigate to account settings
  const handleLocationToastClick = () => {
    window.location.href = '/dashboard?tab=account'
  }

  // Dismiss toast
  const dismissLocationToast = () => {
    setShowLocationToast(false)
  }

  // Fetch listings for crop farmers using context-based recommendation algorithm
  useEffect(() => {
    if (!db || authLoading || !user || userRole !== 'crop_farmer') return

    const loadRecommendedListings = async () => {
      setLoading(true)
      setError(null)

      try {
        console.log('🔄 Loading recommended listings for crop farmer...', {
          userId: user.uid,
          searchQuery: searchQuery || 'none'
        })

        // Step 1: Load listings from Firestore
        const result = await getRecommendedListings(user.uid, {
          limit: null,
          minScore: 0.0,
          searchQuery: searchQuery.trim() || null
        })
        
        console.log('📊 Recommended listings loaded:', result.length)
        
        // Filter out sold and deleted listings
        const allListings = result.searchResults || []
        const activeListings = allListings.filter(listing => 
          listing.status !== 'sold' && listing.status !== 'deleted'
        )
        
        // STEP 1: Display ALL listings immediately (don't wait for API)
        console.log('📊 STEP 1: Displaying all', activeListings.length, 'listings immediately')
        setListings(activeListings)
        setFilteredListings(activeListings)
        setLoading(false) // Stop loading spinner immediately
        
        // STEP 2: Fetch compatibility data in background (if user has crops)
        if (userSpecificCrops.length > 0) {
          console.log('🔍 STEP 2: Fetching compatibility data in background...');
          console.log('🌾 User crops:', userSpecificCrops);
          
          // Fetch compatibility asynchronously without blocking UI
          ;(async () => {
            try {
              // Check cache first
              const cacheKey = `compatibility_${userSpecificCrops.sort().join('_')}`
              const cachedData = sessionStorage.getItem(cacheKey)
              
              let compatibilityData
              
              if (cachedData) {
                console.log('⚡ Using cached compatibility data')
                compatibilityData = new Map(JSON.parse(cachedData))
              } else {
                console.log('🔄 Calling API for fresh compatibility data...')
                console.log('⏰ Note: Server may be sleeping, this could take 1-2 minutes')
                
                // Wake up server with health check
                try {
                  console.log('🏥 Waking up server...')
                  await Promise.race([
                    fetch('https://context-based-2.onrender.com/health', { method: 'GET' }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 30000))
                  ])
                  console.log('✅ Server is awake')
                } catch (healthError) {
                  console.log('⚠️ Health check failed:', healthError.message)
                }
                
                // Call API with retry logic
                let retries = 3
                let response = null
                
                for (let attempt = 1; attempt <= retries; attempt++) {
                  try {
                    console.log(`📡 API call attempt ${attempt}/${retries}...`)
                    const timeout = 60000 + (attempt * 30000) // 60s, 90s, 120s
                    
                    response = await Promise.race([
                      fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          cropIds: userSpecificCrops,
                          cropCategory: null
                        })
                      }),
                      new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Timeout after ${timeout/1000}s`)), timeout)
                      )
                    ])
                    
                    if (response.ok) {
                      console.log('✅ API call successful')
                      break
                    }
                  } catch (error) {
                    console.log(`⚠️ Attempt ${attempt} failed:`, error.message)
                    if (attempt === retries) throw error
                    await new Promise(resolve => setTimeout(resolve, attempt * 3000))
                  }
                }
                
                if (!response || !response.ok) {
                  throw new Error(`API error: ${response?.status}`)
                }
                
                const data = await response.json()
                console.log('📥 Received compatibility data:', data.compatibleListings?.length || 0, 'listings')
                
                // Build compatibility map
                compatibilityData = new Map()
                data.compatibleListings.forEach(item => {
                  const topCrops = item.cropScores.map(crop => ({
                    id: crop.cropId,
                    name: crop.cropName,
                    reason: crop.reason,
                    score: crop.score,
                    npk: crop.npk,
                    usage: crop.usage
                  }))
                  
                  compatibilityData.set(item.listingId, {
                    topCrops: topCrops,
                    analysis: 'AI-powered analysis'
                  })
                })
                
                // Cache the data
                sessionStorage.setItem(cacheKey, JSON.stringify(Array.from(compatibilityData.entries())))
                console.log('💾 Cached compatibility data')
              }
              
              // Set compatibility map
              setCompatibilityMap(compatibilityData)
              console.log('✅ Compatibility map ready:', compatibilityData.size, 'listings')
              
              // STEP 3: Update listings with compatibility data
              const listingsWithCompatibility = activeListings.map(listing => ({
                ...listing,
                cropCompatibility: compatibilityData.get(listing.id) || null,
                compatibilityScore: compatibilityData.get(listing.id)?.topCrops[0]?.score || 0
              }))
              
              // Sort by compatibility score
              listingsWithCompatibility.sort((a, b) => {
                if (a.compatibilityScore === 0 && b.compatibilityScore === 0) return 0
                if (a.compatibilityScore === 0) return 1
                if (b.compatibilityScore === 0) return -1
                return b.compatibilityScore - a.compatibilityScore
              })
              
              console.log('🔍 STEP 3: Updating listings with effectiveness percentages')
              console.log(`📊 ${compatibilityData.size} listings now have compatibility data`)
              
              // Debug first listing
              if (listingsWithCompatibility.length > 0 && listingsWithCompatibility[0].cropCompatibility) {
                console.log('🔍 First listing with compatibility:', {
                  id: listingsWithCompatibility[0].id,
                  name: listingsWithCompatibility[0].name,
                  topCrops: listingsWithCompatibility[0].cropCompatibility.topCrops.slice(0, 2)
                })
              }
              
              // Update state - this will trigger re-render with percentages
              setListings(listingsWithCompatibility)
              setFilteredListings(listingsWithCompatibility)
              console.log('✅ Listings updated with effectiveness percentages!')
              
            } catch (error) {
              console.error('❌ Error fetching compatibility:', error)
              console.log('⚠️ Listings remain displayed without compatibility data')
            }
          })()
        }
        
        // Set search results
        if (!searchQuery) {
          setSearchResults(result.searchResults || [])
        }
        setOutsideSearchResults(result.outsideSearchResults || [])
        
        // Reset pagination
        setCurrentPage(1)
        setOutsideSearchPage(1)
        
      } catch (err) {
        console.error('❌ Error loading recommended listings for crop farmer:', err)
        setError('Failed to load listings')
        setLoading(false)
      }
    }

    loadRecommendedListings()
  }, [db, user, userRole, authLoading, userSpecificCrops])

  // Client-side compatibility calculation function
  // REMOVED: To match mobile behavior, we only show API-validated listings
  // No client-side fallback calculations
  /*
  const calculateClientSideCompatibility = (listing, userCrops) => {
    if (!listing || !userCrops || userCrops.length === 0) return null
    
    // Get the waste type from the listing
    const wasteType = listing.category || listing.livestockType || listing.name || ''
    
    // Map waste types to compatibility scores for different crops
    const wasteCompatibility = {
      'Cattle Manure': { 'white-rice': 85, 'yellow-corn': 82, 'brown-rice': 83, 'lettuce': 80, 'sugarcane': 78 },
      'Cow Manure': { 'white-rice': 85, 'yellow-corn': 82, 'brown-rice': 83, 'lettuce': 80, 'sugarcane': 78 },
      'Poultry Waste': { 'lettuce': 90, 'yellow-corn': 88, 'broccoli': 85, 'cabbage': 84, 'cauliflower': 82 },
      'Chicken Manure': { 'lettuce': 90, 'yellow-corn': 88, 'spinach': 87, 'squash': 84, 'tomato': 82, 'cabbage': 81 },
      'Swine Manure': { 'carrot': 88, 'banana': 85, 'tomato': 84, 'bell-pepper': 82, 'eggplant': 80 },
      'Pig Manure': { 'carrot': 88, 'banana': 85, 'tomato': 84, 'bell-pepper': 82, 'eggplant': 80 },
      'Goat Manure': { 'tomato': 85, 'basil-herb': 83, 'lettuce': 82, 'green-peas': 80, 'yardlong-bean': 78 },
      'Sheep Manure': { 'strawberry': 87, 'grapes': 85, 'mango': 82, 'cabbage': 80 },
      'Rabbit Manure': { 'lettuce': 88, 'carrot': 86, 'tomato': 84, 'bell-pepper': 82 },
      'Horse Manure': { 'carrot': 86, 'spinach': 84, 'tomato': 82, 'bell-pepper': 80 }
    }
    
    // Find matching waste type
    let matchedWasteType = null
    for (const [type, scores] of Object.entries(wasteCompatibility)) {
      if (wasteType.toLowerCase().includes(type.toLowerCase()) || 
          type.toLowerCase().includes(wasteType.toLowerCase())) {
        matchedWasteType = type
        break
      }
    }
    
    if (!matchedWasteType) {
      // Default compatibility for unknown waste types
      const topCrops = userCrops.slice(0, 5).map(cropId => {
        const cropData = Object.values(specificCrops).flat().find(c => c.id === cropId)
        return {
          id: cropId,
          name: cropData?.name || cropId,
          reason: 'General organic fertilizer benefits',
          score: 70,
          npk: 'Balanced',
          usage: 'Apply as needed'
        }
      })
      return { topCrops, analysis: 'Client-side estimation' }
    }
    
    // Calculate scores for user's crops
    const scores = wasteCompatibility[matchedWasteType]
    const topCrops = userCrops
      .map(cropId => {
        const score = scores[cropId] || 65 // Default score if not in knowledge base
        const cropData = Object.values(specificCrops).flat().find(c => c.id === cropId)
        return {
          id: cropId,
          name: cropData?.name || cropId,
          reason: `Good compatibility with ${matchedWasteType}`,
          score: score,
          npk: 'Balanced',
          usage: 'Apply as recommended'
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Top 10 crops
    
    return {
      topCrops,
      analysis: 'Client-side calculation'
    }
  }
  */

  // Add crop compatibility to all listings for crop farmers
  // NOTE: This is now handled in loadRecommendedListings for better UX
  // Keeping this commented out in case we need to re-enable background enrichment
  /*
  useEffect(() => {
    console.log('🔍 Compatibility enrichment check:', {
      hasUser: !!user,
      userRole,
      userSpecificCropsLength: userSpecificCrops.length,
      listingsLength: listings.length
    })
    
    if (!user || userRole !== 'crop_farmer') {
      console.log('⏭️ Skipping compatibility: not a crop farmer')
      return
    }
    
    if (userSpecificCrops.length === 0) {
      console.log('⚠️ No crops selected. User needs to complete crop onboarding.')
      console.log('   Navigate to /crop-onboarding to select crops')
      console.log('   Or update crops in profile settings')
      return
    }
    
    if (listings.length === 0) {
      console.log('⏭️ No listings loaded yet, waiting...')
      return
    }
    
    const enrichListingsWithCompatibility = async () => {
      try {
        console.log('🌾 Enriching listings with compatibility data...')
        console.log('📤 Sending crops:', userSpecificCrops)
        console.log('📊 Total listings:', listings.length)
        
        // Check if we have cached data for these crops
        const cacheKey = `compatibility_${userSpecificCrops.sort().join('_')}`
        const cachedData = sessionStorage.getItem(cacheKey)
        
        if (cachedData) {
          console.log('⚡ Using cached compatibility data')
          const parsedCache = JSON.parse(cachedData)
          const cachedMap = new Map(parsedCache)
          setCompatibilityMap(cachedMap)
          setFilteredListings(mergeCompatibilityData(listings))
          console.log('✅ Loaded from cache:', cachedMap.size, 'listings')
          return
        }
        
        // Retry logic for API call
        let retries = 3
        let response = null
        
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            console.log(`📡 Calling compatibility API (attempt ${attempt}/${retries})...`)
            response = await Promise.race([
              fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  cropIds: userSpecificCrops,
                  cropCategory: null
                })
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 60000) // 60 second timeout
              )
            ])
            
            if (response.ok) {
              console.log('✅ API call successful')
              break
            }
          } catch (error) {
            console.log(`⚠️ Attempt ${attempt} failed:`, error.message)
            if (attempt === retries) {
              throw error
            }
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 2000))
          }
        }
        
        if (!response || !response.ok) {
          const errorText = await response?.text()
          console.error('❌ API Error:', response?.status, errorText)
          throw new Error(`Failed to analyze compatibility: ${response?.status}`)
        }
        
        const data = await response.json()
        console.log('📥 Received compatibility data:', data)
        console.log('📊 Compatible listings count:', data.compatibleListings?.length || 0)
        
        // Create a map of listingId to compatibility data
        const newCompatibilityMap = new Map()
        
        // First, add API-provided compatibility data
        data.compatibleListings.forEach(item => {
          const topCrops = item.cropScores.map(crop => ({
            id: crop.cropId,
            name: crop.cropName,
            reason: crop.reason,
            score: crop.score,
            npk: crop.npk,
            usage: crop.usage
          }))
          
          console.log(`📋 Listing ${item.listingId}: ${topCrops.length} compatible crops, top score: ${topCrops[0]?.score || 0}`)
          
          newCompatibilityMap.set(item.listingId, {
            topCrops: topCrops,
            analysis: `AI-powered analysis`
          })
        })
        
        // For listings without API data, calculate client-side compatibility
        listings.forEach(listing => {
          if (!newCompatibilityMap.has(listing.id)) {
            // Calculate compatibility using client-side knowledge base
            const compatibility = calculateClientSideCompatibility(listing, userSpecificCrops)
            if (compatibility && compatibility.topCrops.length > 0) {
              newCompatibilityMap.set(listing.id, compatibility)
              console.log(`🔧 Client-side compatibility for ${listing.id}: ${compatibility.topCrops.length} crops`)
            }
          }
        })
        
        // Store the compatibility map
        setCompatibilityMap(newCompatibilityMap)
        console.log('✅ Stored compatibility data for', newCompatibilityMap.size, 'listings')
        console.log('🎯 Sample compatibility data:', Array.from(newCompatibilityMap.entries()).slice(0, 2))
        
        // Cache the data for instant loading next time (reuse cacheKey from above)
        sessionStorage.setItem(cacheKey, JSON.stringify(Array.from(newCompatibilityMap.entries())))
        console.log('💾 Cached compatibility data')
        
        // Trigger re-render by merging compatibility data with current listings
        setFilteredListings(mergeCompatibilityData(listings))
        console.log('🔄 Re-rendered listings with compatibility data')
        
      } catch (error) {
        console.error('❌ Error enriching listings with compatibility:', error)
        console.error('Error details:', error.message)
      }
    }
    
    enrichListingsWithCompatibility()
  }, [user, userRole, userSpecificCrops, listings])
  */
  
  // Refresh user data when component mounts or when livestockUpdated event fires
  useEffect(() => {
    const refreshUserData = async () => {
      if (user && userRole === 'livestock_owner') {
        try {
          console.log('🔄 Refreshing livestock data...')
          const userDoc = await getDoc(doc(db, 'Users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            if (userData.livestock?.specificAnimals) {
              setUserSpecificAnimals(userData.livestock.specificAnimals)
              console.log('✅ Refreshed specific animals:', userData.livestock.specificAnimals)
            }
          }
        } catch (error) {
          console.error('❌ Error refreshing livestock data:', error)
        }
      }
    }
    
    const handleLivestockUpdate = refreshUserData
    window.addEventListener('livestockUpdated', handleLivestockUpdate)
    
    // Initial refresh
    refreshUserData()
    
    return () => window.removeEventListener('livestockUpdated', handleLivestockUpdate)
  }, [user, userRole])

  // Function to merge compatibility data with listings
  const mergeCompatibilityData = (listingsToMerge, filterByCompatibility = false) => {
    if (userRole !== 'crop_farmer') {
      return listingsToMerge
    }
    
    console.log('🔄 Merging compatibility data...')
    console.log('   Listings to merge:', listingsToMerge.length)
    console.log('   Compatibility map size:', compatibilityMap.size)
    
    // If compatibility map is empty, return listings without filtering
    if (compatibilityMap.size === 0) {
      console.log('⚠️ Compatibility map is empty, returning listings with placeholder data')
      return listingsToMerge.map(listing => ({
        ...listing,
        cropCompatibility: {
          topCrops: [],
          analysis: 'Loading compatibility data...'
        },
        compatibilityScore: 0
      }))
    }
    
    const mergedListings = listingsToMerge.map(listing => {
      const compatibility = compatibilityMap.get(listing.id)
      if (compatibility) {
        console.log(`✅ Listing ${listing.id} (${listing.name}): ${compatibility.topCrops.length} crops, top score: ${compatibility.topCrops[0]?.score || 0}`)
      }
      return {
        ...listing,
        cropCompatibility: compatibility || {
          topCrops: [],
          analysis: 'No specific compatibility found'
        },
        compatibilityScore: compatibility?.topCrops[0]?.score || 0
      }
    })
    
    console.log('✅ Merged', mergedListings.filter(l => l.cropCompatibility.topCrops.length > 0).length, 'listings with compatibility data')
    
    // If filterByCompatibility is true, only return listings with real compatibility data
    if (filterByCompatibility) {
      return mergedListings.filter(listing => 
        listing.cropCompatibility.topCrops && listing.cropCompatibility.topCrops.length > 0
      )
    }
    
    return mergedListings
  }

  // Calculate best listings for user's crops when search results change
  useEffect(() => {
    if (userRole === 'crop_farmer' && userCropTypes.length > 0 && searchQuery && searchResults.length > 0) {
      console.log('🌾 Calculating best listings for crops:', userCropTypes);
      const bestListings = getBestListingsForCrops(searchResults, userCropTypes);
      setBestForCropsListings(bestListings);
      console.log('✅ Best for crops listings updated:', bestListings.length);
    } else {
      setBestForCropsListings([]);
    }
  }, [searchResults, userCropTypes, userRole, searchQuery]);

  // Crop-waste compatibility knowledge base (client-side for performance)
  const cropWasteKnowledge = {
    "Cattle Manure": {
      "best_crops": [
        { id: 'white-rice', name: 'White rice', reason: 'Provides balanced NPK nutrients essential for rice growth, improves soil structure for better water retention in paddies' },
        { id: 'yellow-corn', name: 'Yellow corn', reason: 'High potassium content supports strong stalk development and kernel production in corn' },
        { id: 'brown-rice', name: 'Brown rice', reason: 'Excellent source of organic matter that enhances rice root development and grain quality' },
        { id: 'lettuce', name: 'Lettuce', reason: 'Rich in micronutrients that promote vigorous leaf growth in leafy vegetables like lettuce' },
        { id: 'sugarcane', name: 'Sugarcane', reason: 'Provides steady release of nutrients throughout the long growing season, boosting sugar content' }
      ]
    },
    "Poultry Waste": {
      "best_crops": [
        { id: 'lettuce', name: 'Lettuce', reason: 'Very high nitrogen content promotes rapid leaf growth in lettuce and other leafy greens' },
        { id: 'yellow-corn', name: 'Yellow corn', reason: 'Quick-release nitrogen fuels early vegetative growth, leading to taller corn plants' },
        { id: 'broccoli', name: 'Broccoli', reason: 'High nitrogen supports development of large heads and abundant foliage in broccoli' },
        { id: 'cabbage', name: 'Cabbage', reason: 'Promotes tight head formation and large outer leaves in cabbage plants' },
        { id: 'cauliflower', name: 'Cauliflower', reason: 'Essential for curd development and overall plant vigor in cauliflower' }
      ]
    },
    "Swine Waste": {
      "best_crops": [
        { id: 'carrot', name: 'Carrot', reason: 'High phosphorus content promotes excellent root development in carrots and other root vegetables' },
        { id: 'banana', name: 'Banana', reason: 'Balanced nutrients support flowering, fruit set, and sweet fruit development in banana trees' },
        { id: 'tomato', name: 'Tomato', reason: 'Phosphorus-rich composition enhances flowering and fruit production in tomatoes' },
        { id: 'bell-pepper', name: 'Bell pepper', reason: 'Supports abundant flowering and larger fruit development in pepper plants' },
        { id: 'eggplant', name: 'Eggplant', reason: 'Essential nutrients for fruit set and plant vigor in eggplants' }
      ]
    },
    "Goat Manure": {
      "best_crops": [
        { id: 'tomato', name: 'Tomato', reason: 'Mild composition won\'t burn plants, perfect for direct application in vegetable gardens' },
        { id: 'basil', name: 'Basil', reason: 'Gentle nutrient release ideal for sensitive herbs like basil and oregano' },
        { id: 'lettuce', name: 'Lettuce', reason: 'Provides steady nutrients without overwhelming delicate salad greens' },
        { id: 'green-peas', name: 'Green peas', reason: 'Moderate nitrogen levels support growth without inhibiting nitrogen-fixing bacteria' },
        { id: 'sitaw', name: 'Yardlong bean', reason: 'Balanced nutrients support pod development and overall plant health' }
      ]
    },
    "Sheep Manure": {
      "best_crops": [
        { id: 'strawberry', name: 'Strawberry', reason: 'High phosphorus and potassium promote flowering and sweet fruit development in berries' },
        { id: 'grapes', name: 'Grapes', reason: 'Potassium-rich composition enhances grape sweetness and vine health' },
        { id: 'rose', name: 'Rose', reason: 'Promotes abundant blooms and strong stem development in flowering plants' },
        { id: 'mango', name: 'Mango', reason: 'Balanced nutrients support fruit tree health and fruit production' },
        { id: 'cabbage', name: 'Cabbage', reason: 'Provides essential nutrients for leafy vegetable growth' }
      ]
    },
    "Chicken Manure": {
      "best_crops": [
        { id: 'spinach', name: 'Spinach', reason: 'High nitrogen content promotes rapid leaf growth in spinach and other leafy greens' },
        { id: 'yellow-corn', name: 'Yellow corn', reason: 'Quick-release nutrients support fast-growing corn plants' },
        { id: 'squash', name: 'Squash', reason: 'Provides balanced nutrients for vigorous vine growth and fruit development' },
        { id: 'tomato', name: 'Tomato', reason: 'High nitrogen supports lush foliage and fruit production' },
        { id: 'cabbage', name: 'Cabbage', reason: 'Promotes rapid head formation in cabbage' }
      ]
    },
    "Horse Manure": {
      "best_crops": [
        { id: 'carrot', name: 'Carrot', reason: 'Excellent for root vegetables, provides loose structure and steady nutrients' },
        { id: 'spinach', name: 'Spinach', reason: 'Mild composition perfect for delicate leafy greens' },
        { id: 'rose', name: 'Rose', reason: 'Ideal for flowering plants, promotes abundant blooms' },
        { id: 'tomato', name: 'Tomato', reason: 'Provides consistent nutrients for fruit production' },
        { id: 'bell-pepper', name: 'Bell pepper', reason: 'Supports healthy fruit development in peppers' }
      ]
    },
    "Pig Manure": {
      "best_crops": [
        { id: 'sweet-potato', name: 'Sweet potato', reason: 'High phosphorus promotes excellent tuber development in sweet potatoes' },
        { id: 'banana', name: 'Banana', reason: 'Rich in potassium, essential for fruit development and sweetness' },
        { id: 'tomato', name: 'Tomato', reason: 'Balanced NPK ratio ideal for fruit production' },
        { id: 'eggplant', name: 'Eggplant', reason: 'Supports healthy fruit set and plant vigor' },
        { id: 'watermelon', name: 'Watermelon', reason: 'Provides steady nutrients for large fruit development' }
      ]
    }
  }

  // Function to check crop-waste compatibility (client-side)
  const checkCropCompatibility = (wasteType, cropCategory, selectedSpecificCrop = null) => {
    // Find matching waste type
    let matchedWaste = null
    for (const [wasteKey, data] of Object.entries(cropWasteKnowledge)) {
      if (wasteType.toLowerCase().includes(wasteKey.toLowerCase().split(' ')[0]) ||
          wasteKey.toLowerCase().includes(wasteType.toLowerCase())) {
        matchedWaste = data
        break
      }
    }
    
    if (!matchedWaste) return null
    
    // Get the best crops list
    let bestCrops = [...matchedWaste.best_crops]
    
    // If a specific crop is selected, move it to the first position
    if (selectedSpecificCrop) {
      const selectedIndex = bestCrops.findIndex(crop => 
        crop.id === selectedSpecificCrop
      )
      if (selectedIndex > -1) {
        const selectedCropData = bestCrops.splice(selectedIndex, 1)[0]
        bestCrops.unshift(selectedCropData)
      }
    }
    
    // Check if crop category is compatible
    const isCompatible = bestCrops.some(crop => 
      crop?.name && cropCategory && (
        crop.name.toLowerCase().includes(cropCategory.toLowerCase()) ||
        cropCategory.toLowerCase().includes(crop.name.toLowerCase())
      )
    )
    
    return {
      isCompatible,
      compatibleCrops: bestCrops,
      score: isCompatible ? 5 : 0
    }
  }

  // Function to get compatibility for ALL user's crops (when "All crop types" is selected)
  const applyAllCropsFilter = async () => {
    setLoading(true)
    
    try {
      // Get user's crop varieties from Firestore
      const userDoc = await getDoc(doc(db, 'Users', user.uid))
      const userData = userDoc.data()
      const cropVarieties = userData.cropFarmer?.cropVarieties || userData.onboarding?.cropVarieties || {}
      
      console.log('📋 All crop varieties:', cropVarieties)
      
      // Get ALL crop IDs from all categories
      const allCropIds = []
      Object.keys(cropVarieties).forEach(category => {
        const varietiesForCategory = cropVarieties[category] || []
        const cropIds = varietiesForCategory.map(variety => {
          // Extract only the English name before parentheses (e.g., "White rice (Puting bigas)" -> "white-rice")
          const englishName = variety.split('(')[0].trim()
          return englishName.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '')
            .trim()
        })
        allCropIds.push(...cropIds)
      })
      
      if (allCropIds.length === 0) {
        console.warn('⚠️ No crop varieties found for user')
        setFilteredListings([])
        setLoading(false)
        return
      }
      
      console.log(`🌾 Fetching compatibility for ALL ${allCropIds.length} user crops:`, allCropIds)
      
      // Call AI compatibility endpoint with all crops
      const response = await fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cropIds: allCropIds,
          cropCategory: 'all' // Special flag for all crops
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze compatibility')
      }
      
      const data = await response.json()
      console.log('✅ Received', data.totalFound, 'compatible listings for all crops from MPNet API')
      
      const userLocation = userData.location
      
      // Transform the data for display with distance calculation
      const compatibleListings = await Promise.all(data.compatibleListings.map(async (item) => {
        let distance = null
        let listingLocation = item.listingData.location
        
        // Fallback: If listing doesn't have location, try to get owner's location
        if (!listingLocation?.latitude || !listingLocation?.longitude) {
          if (item.listingData.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, 'Users', item.listingData.ownerId))
              if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data()
                if (ownerData.location?.latitude && ownerData.location?.longitude) {
                  listingLocation = ownerData.location
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not fetch owner location for listing ${item.listingId}`)
            }
          }
        }
        
        // Calculate distance
        if (userLocation?.latitude && userLocation?.longitude && 
            listingLocation?.latitude && listingLocation?.longitude) {
          const R = 6371
          const dLat = (listingLocation.latitude - userLocation.latitude) * Math.PI / 180
          const dLon = (listingLocation.longitude - userLocation.longitude) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(listingLocation.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          distance = R * c
        }
        
        // Show ALL crop scores - but filter to only show crops the user currently has
        const allCropScores = item.cropScores
          .filter(crop => {
            // Only include crops that are in the user's current selection (all categories)
            return allCropIds.includes(crop.cropId)
          })
          .map(crop => ({
            id: crop.cropId,
            name: crop.cropName,
            reason: crop.reason || `AI analysis shows ${crop.score.toFixed(1)}% compatibility`,
            score: crop.score
          }))
        
        return {
          ...item.listingData,
          id: item.listingId,
          location: listingLocation,
          distance: distance,
          cropCompatibility: {
            topCrops: allCropScores, // Show only user's current crops
            analysis: `Compatible with ${allCropScores.length} of your crops`
          },
          compatibilityScore: allCropScores[0]?.score || 0
        }
      }))
      
      // Filter out user's own listings
      const filteredCompatibleListings = compatibleListings.filter(listing => 
        listing.ownerId !== user.uid
      )
      
      // Sort by compatibility score (highest first)
      filteredCompatibleListings.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      
      console.log(`✅ Showing ${filteredCompatibleListings.length} listings compatible with all your crops`)
      setFilteredListings(filteredCompatibleListings)
      setLoading(false)
      
    } catch (error) {
      console.error('❌ Error fetching compatibility for all crops:', error)
      setError('Failed to load compatible listings')
      setLoading(false)
    }
  }

  // Function to apply crop-waste compatibility filter (AI-based) - matches mobile implementation
  const applyCropWasteFilter = async (cropCategory) => {
    console.log('🌾 ========== APPLYING CROP FILTER ==========')
    console.log('🌾 Applying crop-waste filter for category:', cropCategory)
    console.log('🔍 Active search query:', searchQuery)
    console.log('🔍 Search results count:', searchResults.length)
    console.log('🔍 Current userSpecificCrops:', userSpecificCrops)
    console.log('👤 User ID:', user?.uid)
    
    setLoading(true)
    
    try {
      // Get user's crop varieties from Firestore (always fetch fresh data)
      console.log('📡 Fetching fresh crop data from Firestore...')
      console.log('📡 Firestore path: Users/' + user.uid)
      const userDoc = await getDoc(doc(db, 'Users', user.uid))
      
      if (!userDoc.exists()) {
        console.error('❌ User document does not exist!')
        setFilteredListings([])
        setLoading(false)
        return
      }
      
      const userData = userDoc.data()
      console.log('✅ User document fetched successfully')
      console.log('📋 userData.cropFarmer:', userData.cropFarmer)
      console.log('📋 userData.onboarding:', userData.onboarding)
      
      const cropVarieties = userData.cropFarmer?.cropVarieties || userData.onboarding?.cropVarieties || {}
      
      console.log('📋 All crop varieties from Firestore:', JSON.stringify(cropVarieties, null, 2))
      console.log('📋 Filtering for category:', cropCategory)
      console.log('📋 Available categories in cropVarieties:', Object.keys(cropVarieties))
      
      // Get varieties for the selected category only
      const varietiesForCategory = cropVarieties[cropCategory] || []
      
      console.log(`📋 Found ${varietiesForCategory.length} varieties for ${cropCategory}:`, varietiesForCategory)
      
      if (varietiesForCategory.length === 0) {
        console.error('❌ ========== NO VARIETIES FOUND ==========')
        console.error('❌ No varieties found for category:', cropCategory)
        console.error('❌ Available categories:', Object.keys(cropVarieties))
        console.error('❌ This means either:')
        console.error('   1. Crop varieties were not saved to Firestore correctly')
        console.error('   2. The category name does not match (check snake_case vs camelCase)')
        console.error('   3. The user has not selected any varieties for this crop type')
        console.error('❌ ==========================================')
        setFilteredListings([])
        setLoading(false)
        return
      }
      
      // Convert variety strings to crop IDs (same as mobile)
      console.log('🔄 Converting varieties to crop IDs...')
      const cropIdsForCategory = varietiesForCategory.map((variety, index) => {
        // Extract only the English name before parentheses (e.g., "White rice (Puting bigas)" -> "white-rice")
        const englishName = variety.split('(')[0].trim()
        const cropId = englishName.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, '')
          .trim()
        console.log(`   ${index + 1}. "${variety}" -> "${englishName}" -> "${cropId}"`)
        return cropId
      })
      
      console.log(`🌾 Converted to ${cropIdsForCategory.length} crop IDs for ${cropCategory}:`, cropIdsForCategory)
      console.log('📡 ========== CALLING API ==========')
      console.log('📡 API URL: https://context-based-2.onrender.com/crop-compatibility-analysis')
      console.log('📡 Request body:', JSON.stringify({
        cropIds: cropIdsForCategory,
        cropCategory: cropCategory
      }, null, 2))
      console.log('📡 Calling API... (this may take 1-2 minutes if Render is cold starting)')
      
      const startTime = Date.now()
      
      // Call AI compatibility endpoint
      const response = await fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cropIds: cropIdsForCategory,
          cropCategory: cropCategory
        }),
      })
      
      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)
      
      console.log(`📡 API responded in ${duration} seconds`)
      console.log('📡 Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        console.error('❌ API request failed!')
        console.error('❌ Status:', response.status)
        console.error('❌ Status text:', response.statusText)
        try {
          const errorText = await response.text()
          console.error('❌ Error response:', errorText)
        } catch (e) {
          console.error('❌ Could not read error response')
        }
        throw new Error('Failed to analyze compatibility')
      }
      
      const data = await response.json()
      console.log('✅ ========== API SUCCESS ==========')
      console.log('✅ Received', data.totalFound, 'compatible listings from API')
      console.log('✅ Sample listing:', data.compatibleListings[0])
      console.log('✅ =====================================')
      
      // Use userData from earlier (already fetched)
      const userLocation = userData.location
      
      // Transform the data for display with distance calculation
      const compatibleListings = await Promise.all(data.compatibleListings.map(async (item) => {
        let distance = null
        let listingLocation = item.listingData.location
        
        // Fallback: If listing doesn't have location, try to get owner's location
        if (!listingLocation?.latitude || !listingLocation?.longitude) {
          if (item.listingData.ownerId) {
            try {
              const ownerDoc = await getDoc(doc(db, 'Users', item.listingData.ownerId))
              if (ownerDoc.exists()) {
                const ownerData = ownerDoc.data()
                if (ownerData.location?.latitude && ownerData.location?.longitude) {
                  listingLocation = ownerData.location
                  console.log(`📍 Using owner location for listing: ${item.listingData.name}`)
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not fetch owner location for listing ${item.listingId}`)
            }
          }
        }
        
        // Calculate distance if both user and listing have location
        if (userLocation?.latitude && userLocation?.longitude && 
            listingLocation?.latitude && listingLocation?.longitude) {
          const R = 6371 // Earth's radius in km
          const dLat = (listingLocation.latitude - userLocation.latitude) * Math.PI / 180
          const dLon = (listingLocation.longitude - userLocation.longitude) * Math.PI / 180
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(userLocation.latitude * Math.PI / 180) * Math.cos(listingLocation.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          distance = R * c
        }
        
        // Show ALL crop scores (not just top 3) - matches mobile implementation
        // BUT filter to only show crops that the user currently has selected
        const allCropScores = item.cropScores
          .filter(crop => {
            // Only include crops that are in the user's current selection for this category
            return cropIdsForCategory.includes(crop.cropId)
          })
          .map(crop => ({
            id: crop.cropId,
            name: crop.cropName,
            reason: crop.reason || `AI analysis shows ${crop.score.toFixed(1)}% compatibility based on waste composition and crop requirements`,
            score: crop.score
          }))
        
        console.log(`🔍 Filtered crop scores for listing "${item.listingData.name}": ${item.cropScores.length} total → ${allCropScores.length} matching user's current crops`)
        
        return {
          ...item.listingData,
          id: item.listingId,
          location: listingLocation, // Use fallback location if available
          distance: distance, // Add calculated distance
          cropCompatibility: {
            topCrops: allCropScores, // Show only user's current crops
            analysis: `AI-powered analysis`
          },
          compatibilityScore: allCropScores[0]?.score || 0
        }
      }))
      
      // Filter out user's own listings (if they have both roles)
      let filteredCompatibleListings = compatibleListings.filter(listing => 
        listing.ownerId !== user.uid
      )
      
      // If there's an active search query, filter the results by the search query
      if (searchQuery && searchQuery.trim()) {
        console.log('🔍 Filtering crop-compatible listings by search query:', searchQuery)
        const query = searchQuery.toLowerCase().trim()
        
        filteredCompatibleListings = filteredCompatibleListings.filter(listing => {
          // Search in listing name
          if (listing.name?.toLowerCase().includes(query)) return true
          
          // Search in description
          if (listing.description?.toLowerCase().includes(query)) return true
          
          // Search in category with aliases
          if (listing.category) {
            const category = listing.category.toLowerCase()
            for (const [type, aliases] of Object.entries(livestockAliases)) {
              if (aliases.some(alias => 
                alias.includes(query) || query.includes(alias) || category.includes(alias)
              )) {
                return true
              }
            }
          }
          
          // Search in livestock type with aliases
          if (listing.livestockType) {
            const livestockType = listing.livestockType.toLowerCase()
            for (const [type, aliases] of Object.entries(livestockAliases)) {
              if (aliases.some(alias => 
                alias.includes(query) || query.includes(alias) || livestockType.includes(alias)
              )) {
                return true
              }
            }
          }
          
          return false
        })
        
        console.log(`✅ Filtered to ${filteredCompatibleListings.length} listings matching "${searchQuery}"`)
      }
      
      // Update the compatibility map with the new data
      const newCompatibilityMap = new Map(compatibilityMap)
      filteredCompatibleListings.forEach(listing => {
        newCompatibilityMap.set(listing.id, listing.cropCompatibility)
      })
      setCompatibilityMap(newCompatibilityMap)
      
      console.log('📊 ========== UPDATING UI ==========')
      console.log('📊 Setting filteredListings with', filteredCompatibleListings.length, 'listings')
      console.log('📊 Compatibility map now has', newCompatibilityMap.size, 'entries')
      console.log('📊 Top 3 listings to display:')
      filteredCompatibleListings.slice(0, 3).forEach((listing, index) => {
        console.log(`   ${index + 1}. ${listing.name} - ${listing.compatibilityScore.toFixed(1)}% compatibility`)
        console.log(`      Top crops:`, listing.cropCompatibility.topCrops.slice(0, 3).map(c => `${c.name} (${c.score.toFixed(1)}%)`))
      })
      console.log('📊 ====================================')
      
      setFilteredListings(filteredCompatibleListings)
      console.log('✅ Applied AI crop-waste filter:', filteredCompatibleListings.length, 'listings')
      console.log('🏆 Top 3:', filteredCompatibleListings.slice(0, 3).map(l => ({
        name: l.name,
        score: l.compatibilityScore.toFixed(1)
      })))
      
    } catch (error) {
      console.error('❌ Error applying crop-waste filter:', error)
      // Fallback to client-side logic if API fails
      const activeListings = listings.filter(listing => 
        listing.status !== 'sold' && listing.status !== 'deleted' && listing.ownerId !== user.uid
      )
      
      const listingsWithCompatibility = activeListings.map(listing => {
        const wasteType = listing.name || listing.category || 'Animal Waste'
        const compatibility = checkCropCompatibility(wasteType, cropCategory)
        
        return {
          ...listing,
          cropCompatibility: {
            topCrops: compatibility?.compatibleCrops || [],
            analysis: compatibility ? `This waste is compatible with: ${compatibility.compatibleCrops.map(c => c.name).join(', ')}` : 'No specific compatibility found'
          },
          compatibilityScore: compatibility?.score || 0
        }
      })
      
      // Update the compatibility map with fallback data
      const newCompatibilityMap = new Map(compatibilityMap)
      listingsWithCompatibility.forEach(listing => {
        if (!newCompatibilityMap.has(listing.id)) {
          newCompatibilityMap.set(listing.id, listing.cropCompatibility)
        }
      })
      setCompatibilityMap(newCompatibilityMap)
      
      listingsWithCompatibility.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      setFilteredListings(listingsWithCompatibility)
    }
    
    setLoading(false)
  }

  // Function to analyze crop-waste compatibility
  const analyzeCropWasteCompatibility = async (wasteType, cropCategory) => {
    try {
      const response = await fetch('https://context-based-2.onrender.com/crop-waste-compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wasteType: wasteType,
          wasteDescription: wasteType,
          cropCategory: cropCategory
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Crop-waste compatibility analysis:', result)
        return result
      }
    } catch (error) {
      console.error('❌ Error analyzing crop-waste compatibility:', error)
    }
    return null
  }

  // Search handling functions
  const generateListingEmbedding = async (listingId) => {
    try {
      const semanticSearchUrl = 'https://context-based-2.onrender.com';
      const response = await fetch(`${semanticSearchUrl}/embed-listing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listingId }),
      });
      
      if (response.ok) {
        console.log(`✅ Embedding generated for listing ${listingId}`);
      } else {
        console.warn(`⚠️ Failed to generate embedding for listing ${listingId}:`, response.status);
      }
    } catch (error) {
      console.warn(`⚠️ Error generating embedding for listing ${listingId}:`, error);
      // Don't throw error - embedding generation is non-critical
    }
  };


  // Simple keyword search function (matching mobile implementation)
  const simpleKeywordSearch = (searchText) => {
    const query = searchText.toLowerCase().trim()
    
    if (!query) {
      setSearchResults([])
      // When clearing search, check if there's an active crop filter
      if (selectedCropType) {
        // Don't reset to all listings - keep the crop filter active
        // The handleClearSearch function will handle re-applying the filter
        return
      }
      setFilteredListings(mergeCompatibilityData(listings.filter(listing => 
        listing.status !== 'sold' && listing.status !== 'deleted'
      )))
      return
    }
    
    console.log('🔍 Searching for:', query)
    console.log('🔍 Current selectedCropType:', selectedCropType)
    console.log('🔍 Current filteredListings count:', filteredListings.length)
    
    // Livestock aliases - search for one term finds related terms (matching mobile)
    const livestockAliases = {
      'pig': ['pig', 'swine', 'hog', 'baboy'],
      'swine': ['pig', 'swine', 'hog', 'baboy'],
      'baboy': ['pig', 'swine', 'hog', 'baboy'],
      'hog': ['pig', 'swine', 'hog', 'baboy'],
      'cattle': ['cattle', 'cow', 'bull', 'carabao', 'kalabaw'],
      'cow': ['cattle', 'cow', 'bull', 'carabao', 'kalabaw'],
      'carabao': ['cattle', 'cow', 'bull', 'carabao', 'kalabaw'],
      'kalabaw': ['cattle', 'cow', 'bull', 'carabao', 'kalabaw'],
      'bull': ['cattle', 'cow', 'bull', 'carabao', 'kalabaw'],
      'chicken': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'poultry': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'manok': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'duck': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'itik': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'pato': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'quail': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'pugo': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'turkey': ['chicken', 'poultry', 'manok', 'duck', 'itik', 'pato', 'quail', 'pugo', 'turkey'],
      'goat': ['goat', 'kambing', 'kanding'],
      'kambing': ['goat', 'kambing', 'kanding'],
      'kanding': ['goat', 'kambing', 'kanding'],
      'sheep': ['sheep', 'tupa'],
      'tupa': ['sheep', 'tupa'],
      'horse': ['horse', 'kabayo'],
      'kabayo': ['horse', 'kabayo'],
      'rabbit': ['rabbit', 'kuneho'],
      'kuneho': ['rabbit', 'kuneho']
    }
    
    // Get all related terms for the search query
    const searchTerms = livestockAliases[query] || [query]
    
    // If a crop type is selected, search within filteredListings (crop-filtered results)
    // Otherwise, search all listings
    const listingsToSearch = selectedCropType ? filteredListings : listings
    console.log(`🔍 Searching within ${listingsToSearch.length} listings (crop filter ${selectedCropType ? 'ACTIVE for ' + selectedCropType : 'INACTIVE'})`)
    console.log(`🔍 Search terms: ${searchTerms.join(', ')}`)
    
    // Filter listings that contain any of the search terms
    const results = listingsToSearch.filter(listing => {
      if (listing.status === 'sold' || listing.status === 'deleted') return false
      
      const name = (listing.name || '').toLowerCase()
      // Handle both livestockType (singular) and livestockTypes (plural array) for backward compatibility
      const livestockType = listing.livestockType 
        ? (listing.livestockType || '').toLowerCase()
        : (listing.livestockTypes || []).join(' ').toLowerCase()
      const category = (listing.category || '').toLowerCase()
      const ownerName = (listing.ownerName || '').toLowerCase()
      
      // STRICT MATCHING: Only match if the search term appears as a complete word or part of the livestock type
      // This prevents "baboy" from matching listings that don't actually contain pig/swine/hog/baboy
      const isMatch = searchTerms.some(term => {
        // Use word boundary matching for more precise results
        // Match if term appears as a standalone word in name, type, category, or owner
        const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i')
        
        const nameMatch = wordBoundaryRegex.test(name)
        const typeMatch = wordBoundaryRegex.test(livestockType)
        const categoryMatch = wordBoundaryRegex.test(category)
        const ownerMatch = wordBoundaryRegex.test(ownerName)
        
        if (nameMatch || typeMatch || categoryMatch || ownerMatch) {
          console.log(`✅ Match found in "${listing.name}":`, {
            searchTerm: term,
            nameMatch: nameMatch ? `name contains "${term}"` : false,
            typeMatch: typeMatch ? `type contains "${term}"` : false,
            categoryMatch: categoryMatch ? `category contains "${term}"` : false,
            ownerMatch: ownerMatch ? `owner contains "${term}"` : false,
            fullName: listing.name,
            fullCategory: listing.category,
            fullType: listing.livestockType || listing.livestockTypes,
            fullOwner: listing.ownerName
          })
          return true
        }
        return false
      })
      
      return isMatch
    })
    
    console.log(`🔍 Found ${results.length} results for "${query}" (including aliases: ${searchTerms.join(', ')})`)
    
    // If no results found, show empty list (don't fall back to showing all)
    if (results.length === 0) {
      console.log('⚠️ No search results found - showing empty list')
    }
    
    // Store the search results (they already have compatibility data if from filteredListings)
    setSearchResults(results)
    setFilteredListings(results)
  }

  const handleSearchInputChange = (e) => {
    setSearchInput(e.target.value)
  }

  // Clear search function
  const handleClearSearch = async () => {
    console.log('🧹 Clear search clicked')
    console.log('🧹 Resetting search and dropdown to "All Crop Types"')
    
    // Clear search-related states AND reset crop type dropdown
    setSearchInput('')
    setSearchQuery('')
    setSearchResults([])
    setShowRecentSearches(false)
    setSelectedCropType('') // Reset dropdown to "All Crop Types"
    
    // Small delay to ensure React has processed the state updates
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // Show all listings with compatibility for all user's crops
    if (userRole === 'crop_farmer' && userCropTypes.length > 0) {
      console.log('🧹 Applying all crops filter')
      setLoading(true)
      try {
        await applyAllCropsFilter()
      } catch (error) {
        console.error('Error applying all crops filter:', error)
      }
      setLoading(false)
    } else {
      // Show all listings
      console.log('🧹 Showing all listings')
      setFilteredListings(mergeCompatibilityData(listings.filter(listing => 
        listing.status !== 'sold' && listing.status !== 'deleted'
      )))
    }
    
    console.log('🧹 Clear search complete - dropdown reset to "All Crop Types"')
  }

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      console.log('🔍 Search initiated:', searchInput.trim())
      console.log('🔍 Current selectedCropType:', selectedCropType)
      
      // Use simple keyword search
      simpleKeywordSearch(searchInput.trim())
      setSearchQuery(searchInput.trim())
      setShowRecentSearches(false)
      
      // Save to recent searches
      const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]')
      const updatedSearches = [searchInput.trim(), ...recentSearches.filter(s => s !== searchInput.trim())].slice(0, 5)
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches))
    }
  }

  // Helper function to categorize search queries
  const categorizeSearch = (searchText) => {
    const lowerText = searchText.toLowerCase();
    
    // Poultry categories
    if (lowerText.includes('manok') || lowerText.includes('chicken') || 
        lowerText.includes('poultry') || lowerText.includes('itlog') || 
        lowerText.includes('egg') || lowerText.includes('pugo') || 
        lowerText.includes('pato') || lowerText.includes('itik')) {
      return 'poultry';
    }
    
    // Livestock categories
    if (lowerText.includes('baka') || lowerText.includes('cow') || 
        lowerText.includes('cattle') || lowerText.includes('kalabaw') || 
        lowerText.includes('carabao') || lowerText.includes('kanding') || 
        lowerText.includes('goat') || lowerText.includes('kuneho') || 
        lowerText.includes('rabbit') || lowerText.includes('baboy') || 
        lowerText.includes('pig') || lowerText.includes('swine')) {
      return 'livestock';
    }
    
    // Crop categories
    if (lowerText.includes('palay') || lowerText.includes('rice') || 
        lowerText.includes('mais') || lowerText.includes('corn') || 
        lowerText.includes('kamote') || lowerText.includes('sweet potato') || 
        lowerText.includes('talong') || lowerText.includes('eggplant') || 
        lowerText.includes('sili') || lowerText.includes('chili')) {
      return 'crops';
    }
    
    // Fertilizer/Manure categories
    if (lowerText.includes('fertilizer') || lowerText.includes('tahi') || 
        lowerText.includes('dumi') || lowerText.includes('manure') || 
        lowerText.includes('organic')) {
      return 'fertilizer';
    }
    
    return 'general';
  };

  // Analyze search history to detect user interests
  const analyzeUserInterests = async () => {
    if (!user || !userRole) return null;
    
    try {
      const userRef = doc(db, 'Users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return null;
      
      const userData = userDoc.data();
      const searchHistory = userData.searchHistory || [];
      
      if (searchHistory.length < 5) return null; // Need at least 5 searches to detect interests
      
      // Count category frequency
      const categoryCounts = {};
      searchHistory.forEach(search => {
        const category = search.category || 'general';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Calculate interest scores (0-1 scale)
      const totalSearches = searchHistory.length;
      const interestScores = {};
      const detectedInterests = [];
      
      Object.entries(categoryCounts).forEach(([category, count]) => {
        const score = count / totalSearches;
        interestScores[category] = score;
        
        // Detect interest if category appears 25%+ of searches (at least 5 times)
        if (count >= 5 && score >= 0.25) {
          detectedInterests.push(category);
        }
      });
      
      // Store detected interests in Firestore
      if (detectedInterests.length > 0) {
        await updateDoc(userRef, {
          detectedInterests: detectedInterests,
          interestScores: interestScores,
          lastInterestAnalysis: new Date().toISOString()
        });
        
        console.log('🎯 User interests detected:', {
          interests: detectedInterests,
          scores: interestScores
        });
        
        return { detectedInterests, interestScores };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error analyzing user interests:', error);
      return null;
    }
  };

  // Store search history in Firestore
  const storeSearchHistory = async (searchText, category) => {
    if (!user || !userRole) return;
    
    try {
      const userRef = doc(db, 'Users', user.uid);
      const searchEntry = {
        query: searchText,
        category: category,
        timestamp: new Date().toISOString()
      };
      
      await updateDoc(userRef, {
        searchHistory: arrayUnion(searchEntry)
      });
      
      // Keep only last 30 searches
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const searchHistory = userData.searchHistory || [];
        
        if (searchHistory.length > 30) {
          // Keep only the most recent 30 searches
          const recentHistory = searchHistory.slice(-30);
          await updateDoc(userRef, { searchHistory: recentHistory });
        }
      }
      
      console.log('📝 Search history stored:', { query: searchText, category });
      
      // Analyze interests after storing search history
      await analyzeUserInterests();
    } catch (error) {
      console.error('❌ Error storing search history:', error);
    }
  };

  // Boost listings based on user interests
  const boostListingsByInterests = (listings, userInterests) => {
    if (!userInterests || !userInterests.detectedInterests || userInterests.detectedInterests.length === 0) {
      return listings;
    }
    
    return listings.map(listing => {
      let boostedScore = listing.semanticScore || 0;
      const listingName = (listing.name || '').toLowerCase();
      const listingDetails = (listing.details || '').toLowerCase();
      
      // Boost score based on detected interests
      userInterests.detectedInterests.forEach(interest => {
        const interestScore = userInterests.interestScores[interest] || 0;
        
        switch (interest) {
          case 'poultry':
            if (listingName.includes('manok') || listingName.includes('chicken') || 
                listingName.includes('poultry') || listingName.includes('itlog') || 
                listingName.includes('egg') || listingDetails.includes('poultry')) {
              boostedScore += (interestScore * 0.3); // Boost by 30% of interest score
            }
            break;
            
          case 'livestock':
            if (listingName.includes('baka') || listingName.includes('cow') || 
                listingName.includes('kalabaw') || listingName.includes('goat') || 
                listingName.includes('baboy') || listingDetails.includes('livestock')) {
              boostedScore += (interestScore * 0.3);
            }
            break;
            
          case 'crops':
            if (listingName.includes('palay') || listingName.includes('rice') || 
                listingName.includes('mais') || listingName.includes('corn') || 
                listingDetails.includes('crop') || listingDetails.includes('vegetable')) {
              boostedScore += (interestScore * 0.3);
            }
            break;
            
          case 'fertilizer':
            if (listingName.includes('fertilizer') || listingName.includes('manure') || 
                listingName.includes('tahi') || listingDetails.includes('organic')) {
              boostedScore += (interestScore * 0.3);
            }
            break;
        }
      });
      
      return { ...listing, boostedSemanticScore: boostedScore };
    }).sort((a, b) => (b.boostedSemanticScore || 0) - (a.boostedSemanticScore || 0));
  };

  // Match listings to user's crop types - returns best waste/manure for their crops
  const getBestListingsForCrops = (listings, cropTypes) => {
    if (!cropTypes || cropTypes.length === 0 || !listings || listings.length === 0) {
      return [];
    }

    // Crop-to-manure matching database
    const cropToManureMap = {
      'rice': ['chicken_manure', 'cow_manure', 'carabao_manure', 'organic_fertilizer', 'compost'],
      'corn': ['chicken_manure', 'pig_manure', 'cow_manure', 'organic_fertilizer'],
      'vegetables': ['chicken_manure', 'goat_manure', 'vermicompost', 'organic_fertilizer', 'compost'],
      'fruits': ['cow_manure', 'goat_manure', 'chicken_manure', 'organic_fertilizer'],
      'root_crops': ['pig_manure', 'chicken_manure', 'cow_manure', 'compost'],
      'leafy_vegetables': ['chicken_manure', 'vermicompost', 'goat_manure', 'organic_fertilizer'],
      'legumes': ['cow_manure', 'chicken_manure', 'compost', 'organic_fertilizer']
    };

    // Keywords to identify manure types in listings
    const manureKeywords = {
      'chicken_manure': ['chicken', 'manok', 'poultry', 'itlog'],
      'cow_manure': ['cow', 'baka', 'cattle', 'beef'],
      'pig_manure': ['pig', 'baboy', 'swine', 'pork'],
      'goat_manure': ['goat', 'kanding', 'kambing'],
      'carabao_manure': ['carabao', 'kalabaw', 'buffalo'],
      'vermicompost': ['vermi', 'worm', 'earthworm'],
      'organic_fertilizer': ['organic', 'fertilizer', 'compost', 'tahi', 'dumi'],
      'compost': ['compost', 'organic']
    };

    console.log('🌾 Finding best listings for crops:', cropTypes);

    // Score each listing based on crop compatibility
    const scoredListings = listings.map(listing => {
      const listingName = (listing.name || '').toLowerCase();
      const listingDetails = (listing.details || '').toLowerCase();
      const combinedText = `${listingName} ${listingDetails}`;
      
      let matchScore = 0;
      let matchedCrops = [];
      let manureType = null;

      // Identify what type of manure this listing is
      for (const [type, keywords] of Object.entries(manureKeywords)) {
        if (keywords.some(keyword => combinedText.includes(keyword))) {
          manureType = type;
          break;
        }
      }

      if (!manureType) {
        return { ...listing, cropMatchScore: 0, matchedCrops: [] };
      }

      // Check if this manure type matches any of the user's crops
      cropTypes.forEach(cropType => {
        const recommendedManures = cropToManureMap[cropType] || [];
        if (recommendedManures.includes(manureType)) {
          // Higher score for better matches (earlier in the recommended list)
          const position = recommendedManures.indexOf(manureType);
          const score = (recommendedManures.length - position) / recommendedManures.length;
          matchScore += score;
          matchedCrops.push(cropType);
        }
      });

      return {
        ...listing,
        cropMatchScore: matchScore,
        matchedCrops: matchedCrops,
        manureType: manureType
      };
    });

    // Filter and sort by match score
    const matchedListings = scoredListings
      .filter(listing => listing.cropMatchScore > 0)
      .sort((a, b) => {
        // Primary sort: match score
        if (b.cropMatchScore !== a.cropMatchScore) {
          return b.cropMatchScore - a.cropMatchScore;
        }
        // Secondary sort: semantic score if available
        return (b.semanticScore || 0) - (a.semanticScore || 0);
      });

    console.log('✅ Found', matchedListings.length, 'listings matching user crops');
    console.log('🎯 Top matches:', matchedListings.slice(0, 3).map(l => ({
      name: l.name,
      score: l.cropMatchScore,
      crops: l.matchedCrops,
      type: l.manureType
    })));

    // Return top 4-8 best matches
    return matchedListings.slice(0, 8);
  };

  const performSearch = async (searchText) => {
    console.log('🚀 PERFORM SEARCH CALLED with query:', searchText)
    console.log('🚀 User role:', userRole)
    console.log('🚀 Search results length before:', searchResults.length)
    
    // Don't reset crop type dropdown when searching - allow both filters to work together
    // setSelectedCropType('') // REMOVED - allow crop type filter to persist
    
    // Categorize and store search
    const searchCategory = categorizeSearch(searchText);
    await storeSearchHistory(searchText, searchCategory);
    
    // Helper function to normalize coordinate format
    const normalizeCoordinates = (location) => {
      if (!location || typeof location !== 'object') return null;
      
      // Handle latitude/longitude format (preferred)
      if (location.latitude != null && location.longitude != null) {
        return {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude)
        };
      }
      
      // Handle lat/lng format (fallback)
      if (location.lat != null && location.lng != null) {
        return {
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lng)
        };
      }
      
      return null;
    };
    
    // Clear previous results first
    setSearchResults([]);
    setOutsideSearchResults([]);
    setCurrentPage(1);
    setOutsideSearchPage(1);
    setIsPaginating(true);
    setShowRecentSearches(false);
    setSearchQuery(searchText); // Keep the input value
  
  // Save to recent searches
  const updated = [searchText, ...recentSearches.filter(s => s !== searchText)].slice(0, 10)
  setRecentSearches(updated)
  localStorage.setItem('listingRecentSearches', JSON.stringify(updated))

  // Enhance search query with English translations for better multilingual matching
  let enhancedSearchText = searchText.toLowerCase();
  const tagalogToEnglish = {
    'manok': ' chicken poultry',
    'baka': ' cattle cow beef',
    'kalabaw': ' water buffalo carabao',
    'kabaw': ' water buffalo carabao',
    'kanding': ' goat',
    'kambing': ' goat',
    'itlog': ' egg poultry duck itik pugo pato',
    'pugo': ' quail duck',
    'pato': ' duck',
    'kuneho': ' rabbit',
    'baboy': ' pig swine boar'
  };
  
  // Check if search contains Tagalog terms and append English translations
  for (const [tagalog, english] of Object.entries(tagalogToEnglish)) {
    if (enhancedSearchText.includes(tagalog)) {
      enhancedSearchText += english;
      console.log(`🌐 Enhanced query: "${searchText}" -> "${enhancedSearchText}"`);
      break;
    }
  }

  try {
    // Use context-based search API
    const semanticSearchUrl = 'https://context-based-2.onrender.com';
    console.log('📡 Calling context-based API at:', semanticSearchUrl)
    console.log('🔍 Search query:', enhancedSearchText)
    
    // Quick connection test
    try {
      const healthResponse = await fetch(`${semanticSearchUrl}/`, { method: 'GET' });
      console.log('🏥 Backend health check:', healthResponse.status)
    } catch (healthErr) {
      console.log('❌ Backend health check failed:', healthErr)
    }
    
    const res = await fetch(`${semanticSearchUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text: enhancedSearchText, // Use enhanced query with translations
        top_k: 200, // Increased to get all results above 60% threshold
      })
    });

    console.log('📥 Backend response status:', res.status)
    console.log('📥 Backend response ok:', res.ok)

    if (res.ok) {
    console.log('✅ SEMANTIC SEARCH PATH ACTIVATED - Debug logs should appear below')
    console.log('✅ Semantic search successful - processing results...')
    const payload = await res.json();
    console.log('📊 Backend returned matches:', payload.matches.length)
    console.log('🎯 Top 3 matches:', payload.matches.slice(0, 3).map(m => ({ id: m.id, score: m.score })))
    
    // Extract listing IDs from backend response
    const listingIds = payload.matches.map(m => m.id)
    console.log('🔍 Listing IDs from backend:', listingIds.slice(0, 10))

    console.log('🔥 Fetching matched listings with optimized batch query...')
    console.log('🔍 DEBUG: User location at search start:', userLocation)

    // Fetch matched listings directly from Firestore
    const matchedListings = []
    const batchSize = 10

    for (let i = 0; i < listingIds.length; i += batchSize) {
      const batch = listingIds.slice(i, i + batchSize)
      console.log(`📦 Fetching batch ${Math.floor(i/batchSize) + 1}:`, batch)

      for (const listingId of batch) {
        try {
          const listingRef = doc(db, 'livestock_listings', listingId)
          const listingDoc = await getDoc(listingRef)

          if (listingDoc.exists()) {
            const listingData = { id: listingDoc.id, ...listingDoc.data() }
            
            // Fetch owner location data
            let ownerLocation = null
            if (listingData.ownerId) {
              try {
                const ownerRef = doc(db, 'Users', listingData.ownerId)
                const ownerDoc = await getDoc(ownerRef)
                if (ownerDoc.exists()) {
                  const ownerData = ownerDoc.data()
                  ownerLocation = ownerData.location || null
                  console.log(`📍 Fetched owner location for "${listingData.name}":`, ownerLocation)
                }
              } catch (ownerErr) {
                console.error(`❌ Error fetching owner data for listing ${listingId}:`, ownerErr)
              }
            }
            
            const enrichedListing = {
              ...listingData,
              ownerLocation: ownerLocation,
              location: ownerLocation // Also add as location for compatibility
            }
            
            console.log(`🔍 DEBUG: Enriched listing data for "${enrichedListing.name}":`, {
              id: enrichedListing.id,
              name: enrichedListing.name,
              ownerLocation: enrichedListing.ownerLocation,
              location: enrichedListing.location,
              ownerLocationType: typeof enrichedListing.ownerLocation,
              ownerLocationKeys: enrichedListing.ownerLocation ? Object.keys(enrichedListing.ownerLocation) : 'null'
            })
            matchedListings.push(enrichedListing)
          } else {
            console.log(`❌ Listing not found: ${listingId}`)
          }
        } catch (err) {
          console.error(`❌ Error fetching listing ${listingId}:`, err)
        }
      }
    }
    
    // Filter out deleted and sold listings
    const activeListings = matchedListings.filter(listing => {
      const isDeleted = listing.status === 'deleted';
      const isSold = listing.status === 'sold';
      
      if (isDeleted || isSold) {
        console.log(`🚫 Filtering out listing "${listing.name}" - Status: ${listing.status}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📊 Filtered ${matchedListings.length - activeListings.length} deleted/sold listings`);
    console.log(`✅ ${activeListings.length} active listings remaining for search`);

    // Get user location once (same as getRecommendedListings method)
    let userProfileLocation = null;
    try {
      const userDoc = await getDoc(doc(db, 'Users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userProfileLocation = userData.location;
        console.log('🔍 DEBUG: User profile location cached for search:', userProfileLocation);
      }
    } catch (error) {
      console.error('❌ Error fetching user profile for search distance:', error);
    }

    // Map scores to listings and calculate distances
    const idToScore = {};
    payload.matches.forEach(m => idToScore[m.id] = m.score);
    console.log('🗺️ Score mapping created for', Object.keys(idToScore).length, 'listings')

    const ordered = activeListings
      .map(l => {
        const listingWithScore = { ...l, semanticScore: idToScore[l.id] };
        
        // Calculate distance using user profile location (same as regular listings)
        if (userProfileLocation && l.ownerLocation) {
          try {
            console.log('🔍 DEBUG: Search distance calculation:', {
              listingName: l.name,
              hasUserProfileLocation: !!userProfileLocation,
              hasOwnerLocation: !!l.ownerLocation,
              userProfileLocation,
              ownerLocation: l.ownerLocation
            });
            
            if (userProfileLocation.latitude && userProfileLocation.longitude && 
                l.ownerLocation.latitude && l.ownerLocation.longitude) {
              const distance = calculateDistance(
                userProfileLocation.latitude,
                userProfileLocation.longitude,
                l.ownerLocation.latitude,
                l.ownerLocation.longitude
              );
              listingWithScore.distanceKm = distance;
              console.log(`📍 Search distance calculated for "${l.name}": ${distance.toFixed(1)} km`);
            } else {
              listingWithScore.distanceKm = null;
              console.log(`📍 Invalid coordinates for search distance: "${l.name}"`);
            }
          } catch (error) {
            listingWithScore.distanceKm = null;
            console.error(`❌ Error calculating search distance for "${l.name}":`, error);
          }
        } else {
          listingWithScore.distanceKm = null;
          if (!userProfileLocation) {
            console.log(`📍 No user profile location for search distance: "${l.name}"`);
          } else if (!l.ownerLocation) {
            console.log(`📍 No owner location for search distance: "${l.name}"`);
          }
        }
        
        return listingWithScore;
      })
      .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0));

    console.log('✨ Final search results:', ordered.length, 'listings')
    console.log('🔍 Sample result with semanticScore:', ordered[0])
        
        // Log similarity scores to check threshold
        console.log('📊 Similarity scores:', ordered.slice(0, 10).map(l => ({
          name: l.name,
          score: l.semanticScore
        })))
        
        // Filter out sold and deleted listings from semantic search results
        const activeSearchResults = ordered.filter(listing => 
          !listing.isSold && !listing.deletedAt
        );
        console.log('🎯 Filtered out sold/deleted listings:', ordered.length - activeSearchResults.length, 'removed')
        console.log('🔍 DEBUG: userLocation state:', userLocation)
        console.log('🔍 DEBUG: Sample listing with distance:', activeSearchResults[0]?.distanceKm)
        
        // Apply similarity threshold - raised to 60% for better quality multilingual matching
        console.log('🔍 DEBUG: All similarity scores before filtering:')
        ordered.slice(0, 20).forEach((listing, index) => {
          console.log(`${index + 1}. "${listing.name}" - Score: ${(listing.semanticScore || 0).toFixed(3)} - Distance: ${listing.distanceKm}`)
        })
        
        const highQualityResults = activeSearchResults.filter(listing =>
          (listing.semanticScore || 0) >= 0.60
        );
        console.log('🎯 Filtered out low similarity matches (<60%):', activeSearchResults.length - highQualityResults.length, 'removed')
        console.log('📊 Final high-quality results count (60%+):', highQualityResults.length)
        console.log('📄 Total pages at 40 items per page:', Math.ceil(highQualityResults.length / 40))
        
        // Show what passed the threshold
        console.log('🔍 DEBUG: All results that passed 60% threshold:')
        highQualityResults.forEach((listing, index) => {
          console.log(`${index + 1}. "${listing.name}" - Score: ${(listing.semanticScore || 0).toFixed(3)} (${(listing.semanticScore * 100).toFixed(1)}%)`)
        })
        
        // If no results pass 60% threshold, lower it to 50%, then 40% for debugging
        let finalResults = highQualityResults;
        if (highQualityResults.length === 0 && activeSearchResults.length > 0) {
          console.log('⚠️ No results passed 60% threshold, lowering to 50%...')
          finalResults = activeSearchResults.filter(listing =>
            (listing.semanticScore || 0) >= 0.50
          )
          console.log('📊 Results with 50% threshold:', finalResults.length)
          
          // If still no results, try 40%
          if (finalResults.length === 0) {
            console.log('⚠️ No results passed 50% threshold, lowering to 40%...')
            finalResults = activeSearchResults.filter(listing =>
              (listing.semanticScore || 0) >= 0.40
            )
            console.log('📊 Results with 40% threshold:', finalResults.length)
            console.log('📊 Top 10 results at 40% threshold:', finalResults.slice(0, 10).map(l => ({
              name: l.name,
              score: l.semanticScore
            })))
          }
        }
        
        // Get user interests and boost relevant listings
        try {
          const userRef = doc(db, 'Users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userInterests = userData.detectedInterests ? {
              detectedInterests: userData.detectedInterests,
              interestScores: userData.interestScores || {}
            } : null;
            
            // Apply interest-based boosting if user has detected interests
            const boostedResults = userInterests ? 
              boostListingsByInterests(finalResults, userInterests) : finalResults;
            
            // Add crop compatibility data for crop farmers
            if (userRole === 'crop_farmer' && userSpecificCrops.length > 0) {
              console.log('🌾 Adding crop compatibility to search results...');
              
              // Call AI compatibility endpoint for search results
              try {
                const compatibilityResponse = await fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    cropIds: userSpecificCrops,
                    cropCategory: null
                  }),
                });
                
                if (compatibilityResponse.ok) {
                  const compatibilityData = await compatibilityResponse.json();
                  
                  // Create compatibility map
                  const compatibilityMap = new Map();
                  compatibilityData.compatibleListings.forEach(item => {
                    const topCrops = item.cropScores.map(crop => ({
                      id: crop.cropId,
                      name: crop.cropName,
                      reason: crop.reason,
                      score: crop.score,
                      npk: crop.npk,
                      usage: crop.usage
                    }));
                    
                    compatibilityMap.set(item.listingId, {
                      topCrops: topCrops,
                      analysis: `AI-powered analysis`
                    });
                  });
                  
                  // Add compatibility data to boosted results
                  const resultsWithCompatibility = boostedResults.map(listing => ({
                    ...listing,
                    cropCompatibility: compatibilityMap.get(listing.id) || {
                      topCrops: [],
                      analysis: 'No compatibility data'
                    },
                    compatibilityScore: compatibilityMap.get(listing.id)?.topCrops[0]?.score || 0
                  }));
                  
                  console.log('✅ Added compatibility data to', resultsWithCompatibility.length, 'search results');
                  setSearchResults(resultsWithCompatibility);
                } else {
                  // If compatibility API fails, still show boosted results
                  setSearchResults(boostedResults);
                }
              } catch (compatibilityError) {
                console.log('⚠️ Compatibility API failed for search results:', compatibilityError);
                setSearchResults(boostedResults);
              }
            } else {
              setSearchResults(boostedResults);
            }
            
            console.log('🎯 Interest-based boosting applied:', {
              hasInterests: !!userInterests,
              interests: userInterests?.detectedInterests || [],
              originalCount: finalResults.length,
              boostedCount: boostedResults.length
            });
          } else {
            // Add compatibility data for crop farmers even without interests
            if (userRole === 'crop_farmer' && userSpecificCrops.length > 0) {
              console.log('🌾 Adding crop compatibility to search results...');
              
              try {
                const compatibilityResponse = await fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    cropIds: userSpecificCrops,
                    cropCategory: null
                  }),
                });
                
                if (compatibilityResponse.ok) {
                  const compatibilityData = await compatibilityResponse.json();
                  
                  const compatibilityMap = new Map();
                  compatibilityData.compatibleListings.forEach(item => {
                    const topCrops = item.cropScores.map(crop => ({
                      id: crop.cropId,
                      name: crop.cropName,
                      reason: crop.reason,
                      score: crop.score,
                      npk: crop.npk,
                      usage: crop.usage
                    }));
                    
                    compatibilityMap.set(item.listingId, {
                      topCrops: topCrops,
                      analysis: `AI-powered analysis`
                    });
                  });
                  
                  const resultsWithCompatibility = finalResults.map(listing => ({
                    ...listing,
                    cropCompatibility: compatibilityMap.get(listing.id) || {
                      topCrops: [],
                      analysis: 'No compatibility data'
                    },
                    compatibilityScore: compatibilityMap.get(listing.id)?.topCrops[0]?.score || 0
                  }));
                  
                  console.log('✅ Added compatibility data to', resultsWithCompatibility.length, 'search results');
                  setSearchResults(resultsWithCompatibility);
                } else {
                  setSearchResults(finalResults);
                }
              } catch (compatibilityError) {
                console.log('⚠️ Compatibility API failed for search results:', compatibilityError);
                setSearchResults(finalResults);
              }
            } else {
              setSearchResults(finalResults);
            }
          }
        } catch (error) {
          console.error('❌ Error applying interest-based boosting:', error);
          setSearchResults(finalResults);
          console.log(`Semantic search returned ${finalResults.length} high-quality results`);
        }
        
        setIsPaginating(false); // Fix loading state
      } else {
        console.log('❌ Backend search failed - status:', res.status)
        throw new Error("Semantic search service unavailable");
      }
    } catch (err) {
      console.error("❌ Semantic search failed, falling back to keyword search:", err);
      
      // Fallback to original keyword search
      setSearchQuery(searchText);
      setSearchInput(searchText); // Keep the input value
      
      // Save to recent searches (already done above)
      
      // Filter listings using original keyword logic
      if (userRole === 'crop_farmer') {
        const searchLower = searchText.toLowerCase()
        
        // Get user location for distance calculation
        let userProfileLocation = null;
        try {
          const userDoc = await getDoc(doc(db, 'Users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userProfileLocation = userData.location;
          }
        } catch (error) {
          console.error('❌ Error fetching user profile for fallback search distance:', error);
        }
        
        const matchingListings = listings
          .filter(listing =>
            listing.name?.toLowerCase().includes(searchLower) ||
            listing.details?.toLowerCase().includes(searchLower) ||
            listing.ownerName?.toLowerCase().includes(searchLower)
          )
          .map(listing => {
            const listingWithDistance = { ...listing };
            
            if (userProfileLocation && listing.ownerLocation) {
              try {
                if (userProfileLocation.latitude && userProfileLocation.longitude && 
                    listing.ownerLocation.latitude && listing.ownerLocation.longitude) {
                  const distance = calculateDistance(
                    userProfileLocation.latitude,
                    userProfileLocation.longitude,
                    listing.ownerLocation.latitude,
                    listing.ownerLocation.longitude
                  );
                  listingWithDistance.distanceKm = distance;
                } else {
                  listingWithDistance.distanceKm = null;
                }
              } catch (error) {
                listingWithDistance.distanceKm = null;
              }
            } else {
              listingWithDistance.distanceKm = null;
            }
            
            return listingWithDistance;
          });
        
        const nonMatchingListings = listings
          .filter(listing =>
            !(listing.name?.toLowerCase().includes(searchLower) ||
              listing.details?.toLowerCase().includes(searchLower) ||
              listing.ownerName?.toLowerCase().includes(searchLower))
          )
          .map(listing => {
            const listingWithDistance = { ...listing };
            
            if (userProfileLocation && listing.ownerLocation) {
              try {
                if (userProfileLocation.latitude && userProfileLocation.longitude && 
                    listing.ownerLocation.latitude && listing.ownerLocation.longitude) {
                  const distance = calculateDistance(
                    userProfileLocation.latitude,
                    userProfileLocation.longitude,
                    listing.ownerLocation.latitude,
                    listing.ownerLocation.longitude
                  );
                  listingWithDistance.distanceKm = distance;
                } else {
                  listingWithDistance.distanceKm = null;
                }
              } catch (error) {
                listingWithDistance.distanceKm = null;
              }
            } else {
              listingWithDistance.distanceKm = null;
            }
            
            return listingWithDistance;
          });
        
        // Add compatibility data to matching listings
        if (userSpecificCrops.length > 0) {
          console.log('🌾 Adding compatibility data to fallback search results...');
          
          try {
            const compatibilityResponse = await fetch('https://context-based-2.onrender.com/crop-compatibility-analysis', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                cropIds: userSpecificCrops,
                cropCategory: null
              }),
            });
            
            if (compatibilityResponse.ok) {
              const compatibilityData = await compatibilityResponse.json();
              
              const compatibilityMap = new Map();
              compatibilityData.compatibleListings.forEach(item => {
                const topCrops = item.cropScores.map(crop => ({
                  id: crop.cropId,
                  name: crop.cropName,
                  reason: crop.reason,
                  score: crop.score,
                  npk: crop.npk,
                  usage: crop.usage
                }));
                
                compatibilityMap.set(item.listingId, {
                  topCrops: topCrops,
                  analysis: `AI-powered analysis`
                });
              });
              
              const matchingWithCompatibility = matchingListings.map(listing => ({
                ...listing,
                cropCompatibility: compatibilityMap.get(listing.id) || {
                  topCrops: [],
                  analysis: 'No compatibility data'
                },
                compatibilityScore: compatibilityMap.get(listing.id)?.topCrops[0]?.score || 0
              }));
              
              setSearchResults(matchingWithCompatibility);
            } else {
              setSearchResults(matchingListings);
            }
          } catch (error) {
            console.log('⚠️ Compatibility API failed for fallback search:', error);
            setSearchResults(matchingListings);
          }
        } else {
          setSearchResults(matchingListings);
        }
        
        setOutsideSearchResults(nonMatchingListings)
      }
      
      setIsPaginating(false);
    }
  }

  const handleRecentSearchClick = (search) => {
    setSearchInput(search)
    performSearch(search)
    setShowRecentSearches(false)
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('listingRecentSearches')
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchInput('')
    setSelectedCropType('')
    
    const activeListings = listings.filter(listing => 
      listing.status !== 'sold' && listing.status !== 'deleted'
    )
    
    if (userRole === 'crop_farmer') {
      // For crop farmers, show all listings (compatibility data may still be loading)
      setFilteredListings(mergeCompatibilityData(activeListings))
      return
    }

    setFilteredListings(activeListings)
  }

  // Filter listings based on search query
  useEffect(() => {
    if (!listings.length) return
    
    const activeListings = listings.filter(listing => 
      listing.status !== 'sold' && listing.status !== 'deleted'
    )
    
    // Don't overwrite filteredListings if dropdown filter is active
    if (userRole === 'crop_farmer' && selectedCropType) {
      console.log('🔍 Dropdown filter active, skipping search effect')
      return
    }
    
    if (userRole === 'crop_farmer') {
      // For crop farmers, show all listings (compatibility data may still be loading)
      setFilteredListings(mergeCompatibilityData(activeListings))
      return
    }

    if (!searchQuery.trim()) {
      if (searchResults.length > 0) {
        console.log('🎯 Using searchResults with semanticScore:', searchResults.length, 'listings')
        setFilteredListings(searchResults)
      } else {
        // Fallback keyword filtering (no semanticScore available)
        const filtered = activeListings.filter((listing) =>
          listing.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        console.log('🔍 Using keyword filtered results:', filtered.length, 'listings')
        setFilteredListings(filtered)
      }
    }
  }, [searchQuery, listings, userRole, selectedCropType]) // Add filter state to dependencies

  // Calculate pagination values for main listings
  // Use searchResults during search, otherwise use filteredListings (recommendations)
  const mainListingsSource = searchQuery ? searchResults : filteredListings
  console.log('🔍 DEBUG: mainListingsSource =', searchQuery ? 'searchResults' : 'filteredListings')
  console.log('🔍 DEBUG: searchQuery =', searchQuery)
  console.log('🔍 DEBUG: searchResults.length =', searchResults.length)
  console.log('🔍 DEBUG: filteredListings.length =', filteredListings.length)
  console.log('🔍 DEBUG: mainListingsSource.length =', mainListingsSource.length)
  
  const totalMainPages = Math.ceil(mainListingsSource.length / itemsPerPage)
  const mainStartIndex = (currentPage - 1) * itemsPerPage
  const mainEndIndex = mainStartIndex + itemsPerPage
  const currentMainListings = mainListingsSource.slice(mainStartIndex, mainEndIndex)

  // Calculate pagination values for outside search results (20 per page)
  const outsideItemsPerPage = 20
  const totalOutsidePages = Math.ceil(outsideSearchResults.length / outsideItemsPerPage)
  const outsideStartIndex = (outsideSearchPage - 1) * outsideItemsPerPage
  const outsideEndIndex = outsideStartIndex + outsideItemsPerPage
  const currentOutsideListings = outsideSearchResults.slice(outsideStartIndex, outsideEndIndex)

  // Dynamic items per page based on search state
  useEffect(() => {
    const newItemsPerPage = searchQuery.trim() ? 40 : 40 // Always 40 for main listings now
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when items per page changes
    setOutsideSearchPage(1) // Reset outside search page too
  }, [searchQuery])

  // Calculate page numbers to show
  const getVisiblePageNumbers = (totalPages, currentPage) => {
    const pages = []
    const maxVisible = 4

    if (totalPages <= maxVisible) {
      // Show all pages if less than or equal to maxVisible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show smart page range based on current page
      if (currentPage <= 2) {
        // Show first 3 pages, ellipsis, and last page
        for (let i = 1; i <= 3; i++) {
          pages.push(i)
        }
        if (totalPages > 3) {
          pages.push('...')
          pages.push(totalPages)
        }
      } else if (currentPage >= totalPages - 1) {
        // Show first page, ellipsis, and last 3 pages
        pages.push(1)
        if (totalPages > 4) {
          pages.push('...')
        }
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, and last page
        pages.push(1)
        if (currentPage - 1 > 2) {
          pages.push('...')
        }
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        if (currentPage + 1 < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  // Pagination functions for main listings
  const handleMainPageChange = (page) => {
    setIsPaginating(true)
    setCurrentPage(page)
    // Scroll to top of listings
    window.scrollTo({ top: 0, behavior: 'smooth' })
    // Remove loading state after a short delay for smooth transition
    setTimeout(() => setIsPaginating(false), 300)
  }

  const handleMainNextPage = () => {
    if (currentPage < totalMainPages) {
      handleMainPageChange(currentPage + 1)
    }
  }

  const handleMainPrevPage = () => {
    if (currentPage > 1) {
      handleMainPageChange(currentPage - 1)
    }
  }

  // Pagination functions for outside search results
  const handleOutsideSearchPageChange = (page) => {
    setIsPaginating(true)
    setOutsideSearchPage(page)
    // Scroll to top of outside search section
    const outsideSection = document.getElementById('outside-search-section')
    if (outsideSection) {
      outsideSection.scrollIntoView({ behavior: 'smooth' })
    }
    setTimeout(() => setIsPaginating(false), 300)
  }

  const handleOutsideSearchNextPage = () => {
    if (outsideSearchPage < totalOutsidePages) {
      handleOutsideSearchPageChange(outsideSearchPage + 1)
    }
  }

  const handleOutsideSearchPrevPage = () => {
    if (outsideSearchPage > 1) {
      handleOutsideSearchPageChange(outsideSearchPage - 1)
    }
  }

  const formatPrice = (price, isFree) => {
    if (isFree || price === 'Free') return 'Free'
    if (!price) return 'Price not specified'
    const numPrice = parseFloat(price)
    if (isNaN(numPrice)) return 'Free'
    return `₱${numPrice.toLocaleString()}`
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatLocationValue = (location, address, city) => {
    // If location is already a simple string, use it directly
    if (typeof location === 'string' && location.trim()) {
      return location.trim()
    }

    // If location is an object (e.g., { accuracy, latitude, longitude, timestamp })
    if (location && typeof location === 'object') {
      const { latitude, longitude } = location

      if (typeof latitude === 'number' && typeof longitude === 'number') {
        // Format to a short coordinate string
        return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`
      }
    }

    // Fallbacks
    if (address && typeof address === 'string') return address
    if (city && typeof city === 'string') return city

    return ''
  }

  const calculateDistanceKm = (fromLocation, toLocation) => {
    if (!fromLocation || !toLocation) return null

    const fromLat = typeof fromLocation.latitude === 'number' ? fromLocation.latitude : null
    const fromLng = typeof fromLocation.longitude === 'number' ? fromLocation.longitude : null
    const toLat = typeof toLocation.latitude === 'number' ? toLocation.latitude : null
    const toLng = typeof toLocation.longitude === 'number' ? toLocation.longitude : null

    if (fromLat == null || fromLng == null || toLat == null || toLng == null) return null

    const toRad = (value) => (value * Math.PI) / 180

    const R = 6371
    const dLat = toRad(toLat - fromLat)
    const dLon = toRad(toLng - fromLng)
    const lat1 = toRad(fromLat)
    const lat2 = toRad(toLat)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return distance
  }

  const formatDistanceKm = (distanceKm) => {
    if (distanceKm == null) return ''
    if (distanceKm === 0 || distanceKm < 0.1) {
      return 'Nearby'
    }
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m away`
    }
    return `${distanceKm.toFixed(1)} km away`
  }

  const limitWords = (text, wordLimit) => {
    if (!text) return ''
    const words = text.trim().split(/\s+/)
    if (words.length <= wordLimit) return text
    return words.slice(0, wordLimit).join(' ') + '...'
  }

  const getRoleDisplayTitle = () => {
    if (userRole === 'livestock_owner') {
      return 'My Listings'
    } else if (userRole === 'crop_farmer') {
      return 'Available Listings'
    }
    return 'Listings'
  }

  // Render listing card content
  const renderListingCard = (listing) => {
    console.log('🎴 Rendering card for:', listing.name, '| Distance:', listing.distanceKm, '| Has distance:', listing.distanceKm != null);
    console.log('🎴 Full listing object:', {
      id: listing.id,
      name: listing.name,
      distanceKm: listing.distanceKm,
      ownerLocation: listing.ownerLocation,
      allKeys: Object.keys(listing)
    });
    
    return (
    <>
      {/* Image Container */}
      <div className={styles.imageContainer}>
        {(() => {
          const imageUrl = listing.images?.[0] || listing.imageUrls?.[0] || listing.imageUrl || listing.image || listing.photo || listing.photoUrl || listing.photos?.[0]
          return imageUrl ? (
            <>
              <img 
                src={imageUrl} 
                alt={listing.name || listing.title || 'Listing'}
                className={styles.listingImage}
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div className={styles.imagePlaceholder} style={{ display: 'none' }}>
                <p>Failed to load image</p>
              </div>
              
              {/* AI Verification Badge */}
              {listing.isAiVerified && (
                <div className={styles.verifiedBadge}>
                  <span className={styles.verifiedText}>Verified by AI</span>
                </div>
              )}
              
              {/* Hidden Status Badge - only show to listing owner */}
              {listing.status === 'hidden' && userRole === 'livestock_owner' && listing.ownerId === user?.uid && (
                <div className={styles.hiddenBadge}>
                  <span className={styles.hiddenText}>Hidden</span>
                </div>
              )}
            </>
          ) : (
            <div className={styles.imagePlaceholder}>
              <p>No image available</p>
            </div>
          )
        })()}
      </div>

      {/* Crop Compatibility - Show for crop farmers when compatibility data is available */}
      {userRole === 'crop_farmer' && listing.cropCompatibility && listing.cropCompatibility.topCrops && listing.cropCompatibility.topCrops.length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f0f8f0',
          borderRadius: '0 0 6px 6px',
          border: '1px solid #4caf50',
          borderTop: 'none'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#2d5a27' }}>
            Best for your crops:
          </div>
          
          {/* Always show top 3 crops in card preview, with "See all varieties" button if more exist */}
          {(() => {
            const maxCropsInCard = 3;
            const displayedCrops = listing.cropCompatibility.topCrops.slice(0, maxCropsInCard);
            const hasMoreCrops = listing.cropCompatibility.topCrops.length > maxCropsInCard;
            
            return (
              <>
                {displayedCrops.map((crop, index) => {
                  const percentage = Math.round(crop.score);
                  // Color based on score: green (80-100), yellow-green (60-80), yellow (40-60), orange (20-40), red (0-20)
                  const getColor = (score) => {
                    if (score >= 80) return '#4caf50';
                    if (score >= 60) return '#8bc34a';
                    if (score >= 40) return '#ffc107';
                    if (score >= 20) return '#ff9800';
                    return '#f44336';
                  };
                  const color = getColor(percentage);
                  
                  return (
                    <div key={`${crop.id}-${index}`} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                          <span style={{ fontSize: '10px' }}>🌱</span>
                          <span style={{ fontSize: '11px', color: '#333', fontWeight: '500' }}>{crop.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '600', color: color }}>{percentage}%</span>
                      </div>
                      <div style={{ 
                        width: '100%', 
                        height: '6px', 
                        backgroundColor: '#e0e0e0', 
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          width: `${percentage}%`, 
                          height: '100%', 
                          backgroundColor: color,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
                
                {/* See all varieties button if there are more crops */}
                {hasMoreCrops && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetailsModal(listing);
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#fa9100',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    See {listing.cropCompatibility.topCrops.length - maxCropsInCard} more varieties →
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Card Content */}
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.listingName}>
            {listing.name || listing.title || listing.productName || 'Unnamed Listing'}
          </h3>
          <div className={styles.price}>
            {formatPrice(listing.price || listing.cost || listing.amount, listing.isFree)}
          </div>
        </div>
        
        <p className={styles.ownerName}>
          by {listing.ownerName || listing.userName || listing.author || listing.seller || 'Unknown Owner'}
          <span className={styles.ownerRating}>
            ⭐ {typeof listing.ownerRating === 'number' ? listing.ownerRating.toFixed(1) : '0.0'}
          </span>
        </p>
        
        {/* Distance Display */}
        {listing.distanceKm != null && (
          <p className={styles.locationText}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill={listing.distanceKm < 5 ? "#2d5a27" : "#666"} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span style={{ color: listing.distanceKm < 5 ? '#2d5a27' : '#666', fontWeight: listing.distanceKm < 5 ? '600' : '500' }}>
              {listing.distanceKm === 0 || listing.distanceKm < 0.1 ? 'Nearby' : `${listing.distanceKm.toFixed(1)} km away`}
            </span>
          </p>
        )}
        
        {(listing.description || listing.details || listing.info) && (
          <p className={styles.details}>
            {listing.description || listing.details || listing.info}
          </p>
        )}
        
        {(listing.category || listing.type || listing.breed) && (
          <div className={styles.measurements}>
            {listing.category || listing.type || listing.breed}
          </div>
        )}
        
        <div className={styles.listingMeta}>
          <span className={styles.listingDate}>
            Posted {formatDate(listing.createdAt || listing.timestamp || listing.dateCreated)}
          </span>
        </div>
        
        <div className={styles.cardActions}>
          {userRole === 'crop_farmer' ? (
            (() => {
              // COMPREHENSIVE LOGGING: Verify button state for every listing
              console.log('🔍 DEBUG: Rendering button for ALL LISTINGS:', {
                listingId: listing.id,
                listingName: listing.name || listing.title,
                currentStatus: requestStatuses[listing.id],
                allStatuses: Object.keys(requestStatuses),
                buttonShouldBeApproved: requestStatuses[listing.id] === 'approved',
                buttonShouldBePending: requestStatuses[listing.id] === 'pending'
              })
              
              const buttonState = getButtonState(listing.id)
              console.log('🔍 DEBUG: Button state calculated for listing:', {
                listingId: listing.id,
                buttonState: buttonState,
                finalButtonText: buttonState.text,
                isDisabled: buttonState.disabled
              })
              
              return (
                <button 
                  className={`${styles.requestButton} ${
                    requestStatuses[listing.id] === 'pending' ? styles.cancelRequestButton : 
                    requestStatuses[listing.id] === 'approved' ? styles.approvedButton : ''
                  }`}
                  disabled={buttonState.disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (requestStatuses[listing.id] === 'pending') {
                      handleCancelRequest(listing.id).catch((error) => {
                        console.error('Main cancel failed, trying simplified version:', error)
                        handleCancelRequestSimple(listing.id)
                      })
                    } else if (!requestStatuses[listing.id] || requestStatuses[listing.id] === 'rejected' || requestStatuses[listing.id] === 'cancelled') {
                      handleListingRequest(listing)
                    }
                  }}
                >
                  {buttonState.text}
                </button>
              )
            })()
          ) : userRole === 'livestock_owner' ? (
            <>
              <button 
                className={styles.editButton}
                onClick={(e) => {
                  e.stopPropagation()
                  openEditModal(listing)
                }}
              >
                Edit
              </button>
              <button 
                className={styles.markSoldButton}
                onClick={(e) => {
                  e.stopPropagation()
                  markAsSold(listing)
                }}
              >
                Sold
              </button>
              <button 
                className={styles.deleteButton}
                onClick={(e) => {
                  e.stopPropagation()
                  deleteListing(listing)
                }}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </>
    )
  } // Added missing closing brace here

  if (authLoading || !user) {
    return null
  }


  if (loading) {
    return (
      <div className={styles.container}>
        {/* Header Container */}
        <div className={styles.headerContainer}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{getRoleDisplayTitle()}</h1>
            
            {/* Crop Type and Specific Crop Filter Dropdowns - Only for Crop Farmers */}
            {userRole === 'crop_farmer' && userCropTypes.length > 0 && (
              <div className={styles.headerDropdowns}>
                <div className={styles.filterGroup}>
                  <label className={styles.filterLabel}>Crop Type</label>
                  <select 
                    className={styles.filterSelect}
                    value={selectedCropType}
                    onChange={async (e) => {
                      const cropType = e.target.value
                      setSelectedCropType(cropType)
                      
                      setLoading(true)
                      if (cropType) {
                        // Apply crop-waste compatibility search for specific crop type
                        await applyCropWasteFilter(cropType)
                      } else {
                        // "All Crop Types" selected - show compatibility for ALL user's crops
                        await applyAllCropsFilter()
                      }
                      setLoading(false)
                    }}
                  >
                    <option value="">All Crop Types</option>
                    {userCropTypes.map(cropType => (
                      <option key={cropType} value={cropType}>
                        {cropType.charAt(0).toUpperCase() + cropType.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                

              </div>
            )}
          </div>
          
          <div className={styles.headerRight}>
            {/* Search Bar for Crop Farmers - Always Visible */}
            {userRole === 'crop_farmer' && (
              <div className={styles.searchContainer}>
                <div className={styles.searchInputWrapper}>
                  <img src="/assets/icons/search.png" alt="Search" className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search marketplace... (Press Enter)"
                    value={searchInput}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchKeyPress}
                    className={styles.searchInput}
                  />
                  {searchInput && (
                    <button 
                      className={styles.clearSearchButton}
                      onClick={handleClearSearch}
                      title="Clear search"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Buttons for Livestock Owners */}
            {userRole === 'livestock_owner' && (
              <div className={styles.ownerButtons}>
                <button 
                  className={styles.addListingButton}
                  disabled
                >
                  + Add Listings
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Crop Type Filter Dropdown - Only for Crop Farmers */}
        {userRole === 'crop_farmer' && userCropTypes.length > 0 && (
          <div className={styles.filterDropdownContainer}>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Crop Type</label>
                <select 
                  className={styles.filterSelect}
                  value={selectedCropType}
                  onChange={async (e) => {
                    const cropType = e.target.value
                    setSelectedCropType(cropType)
                    
                    setLoading(true)
                    if (cropType) {
                      // Apply crop-waste compatibility search for specific crop type
                      await applyCropWasteFilter(cropType)
                    } else {
                      // "All Crop Types" selected - show compatibility for ALL user's crops
                      await applyAllCropsFilter()
                    }
                    // Clear search query when using dropdown filter
                    setSearchQuery('')
                    setSearchInput('')
                    setLoading(false)
                  }}
                >
                  <option value="">All Crop Types</option>
                  {userCropTypes.map(cropType => (
                    <option key={cropType} value={cropType}>
                      {cropType.charAt(0).toUpperCase() + cropType.slice(1).replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              

            </div>
          </div>
        )}
        
        {/* Loading Content */}
        <div className={styles.listingsLoadingContainer}>
          <div className={styles.listingsLoadingSpinner}></div>
          <p className={styles.listingsLoadingText}>Loading listings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerContainer}>
          <h1 className={styles.title}>Listings</h1>
        </div>
        <div className={styles.loading}>
          <p style={{color: 'red'}}>Error: {error}</p>
          <button onClick={() => window.location.reload()} style={{marginTop: '10px', padding: '8px 16px', cursor: 'pointer'}}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Loading Overlay for Creating Listing - REMOVED DUPLICATE */}
      
      {/* Header Container */}
      <div className={styles.headerContainer}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{getRoleDisplayTitle()}</h1>
        </div>
        
        {/* Crop Type and Specific Crop Filter Dropdowns - Only for Crop Farmers */}
        {userRole === 'crop_farmer' && userCropTypes.length > 0 && (
          <div className={styles.headerDropdowns}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Crop Type</label>
              <select 
                className={styles.filterSelect}
                value={selectedCropType}
                onChange={async (e) => {
                  const cropType = e.target.value
                  setSelectedCropType(cropType)
                  
                  setLoading(true)
                  if (cropType) {
                    // Get specific crops for this crop type from user's selections
                    const filteredSpecificCrops = userSpecificCrops.filter(cropId => {
                      // Check if this specific crop belongs to the selected crop type
                      return specificCrops[cropType]?.some(crop => crop.id === cropId)
                    })
                    
                    // Apply crop-waste compatibility search for specific crop type
                    await applyCropWasteFilter(cropType)
                  } else {
                    // "All Crop Types" selected - show compatibility for ALL user's crops
                    await applyAllCropsFilter()
                  }
                  // Clear search query when using dropdown filter
                  setSearchQuery('')
                  setSearchInput('')
                  setLoading(false)
                }}
              >
                <option value="">All Crop Types</option>
                {userCropTypes.map(cropTypeId => {
                  const cropType = cropTypes.find(c => c.id === cropTypeId)
                  return (
                    <option key={cropTypeId} value={cropTypeId}>
                      {cropType?.name || cropTypeId}
                    </option>
                  )
                })}
              </select>
            </div>
            

          </div>
        )}
        
        <div className={styles.headerRight}>
          {/* Search Bar for Crop Farmers */}
          {userRole === 'crop_farmer' && (
            <div className={styles.searchContainer}>
              <div className={styles.searchInputWrapper}>
                <img src="/assets/icons/search.png" alt="Search" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search marketplace... (Press Enter)"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  onFocus={() => setShowRecentSearches(true)}
                  className={styles.searchInput}
                />
                {searchInput && (
                  <button 
                    onClick={handleClearSearch}
                    className={styles.clearSearchButton}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Recent Searches Dropdown */}
              {showRecentSearches && recentSearches.length > 0 && (
                <div className={styles.recentSearchesDropdown}>
                  <div className={styles.recentSearchesHeader}>
                    <span>Recent Searches</span>
                    <button onClick={clearRecentSearches} className={styles.clearAllButton}>
                      Clear All
                    </button>
                  </div>
                  <div className={styles.recentSearchesList}>
                    {recentSearches.map((search, index) => (
                      <div
                        key={index}
                        className={styles.recentSearchItem}
                        onClick={() => handleRecentSearchClick(search)}
                      >
                        <img src="/assets/icons/search.png" alt="Search" className={styles.recentSearchIcon} />
                        <span>{search}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Buttons for Livestock Owners */}
          {userRole === 'livestock_owner' && (
            <div className={styles.ownerButtons}>
              <button 
                className={styles.addListingButton}
                onClick={openAddModal}
              >
                + Add Listings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Listings Content */}
      <div className={styles.listingsContent}>
        {/* Location Disabled Notification for Crop Farmers */}
        {userRole === 'crop_farmer' && !userLocation && (
          <div className={styles.locationNotification}>
            <img src="/assets/icons/location.png" alt="Location" className={styles.notificationIcon} />
            <div className={styles.notificationContent}>
              <strong>Your location is disabled.</strong>
              <span>Enable your location to see nearby listings and get personalized recommendations.</span>
            </div>
            <button 
              onClick={() => window.location.href = '/account-settings'}
              className={styles.enableLocationButton}
            >
              Enable Location
            </button>
          </div>
        )}

        {/* Search Results Loading State */}
        {searchQuery && userRole === 'crop_farmer' && isPaginating && (
          <div className={styles.searchSection}>
            <div className={styles.listingsGrid}>
              <div className={styles.listingsLoadingContainer}>
                <div className={styles.listingsLoadingSpinner}></div>
                <p className={styles.listingsLoadingText}>Loading listings...</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Section - Dual Pagination */}
        {searchQuery && userRole === 'crop_farmer' && !isPaginating ? (
          <>
            {/* Search Results Header */}
            <div className={styles.searchSection}>
              <h3 className={styles.sectionTitle}>
                Search Results
              </h3>
              <div className={styles.listingsGrid}>
                {currentMainListings
                  .filter(listing => {
                    // Hide listings with valid report verdict from public
                    if (listing.reportVerdict === 'VALID' && listing.ownerId !== user?.uid) {
                      return false
                    }
                    return true
                  })
                  .map((listing) => {
                    // Check if listing is hidden due to valid report
                    const isHiddenListing = listing.reportVerdict === 'VALID' && listing.ownerId === user?.uid
                    return (
                    <div 
                      key={listing.id} 
                      className={styles.listingCard}
                      onClick={() => openDetailsModal(listing)}
                      style={{ cursor: 'pointer', opacity: isHiddenListing ? 0.5 : 1 }}
                    >
                      {renderListingCard(listing)}
                    </div>
                    )
                  })}
              </div>
            </div>

            {/* End of Results - Only show when not loading and no more pages */}
            {!isPaginating && totalMainPages <= 1 && currentMainListings.length > 0 && (
              <div className={styles.endOfResults}>
                <p>End of results</p>
              </div>
            )}

            {/* Pagination for Search Results - At the end */}
            {!isPaginating && totalMainPages > 1 && (
              <div className={styles.paginationContainer}>
                <div className={styles.paginationControls}>
                  {/* Previous Button */}
                  <button
                    className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                    onClick={handleMainPrevPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className={styles.pageNumbers}>
                    {getVisiblePageNumbers(totalMainPages, currentPage).map((pageNum, index) => {
                      if (pageNum === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                            ...
                          </span>
                        )
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                          onClick={() => handleMainPageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    className={`${styles.paginationButton} ${currentPage === totalMainPages ? styles.disabled : ''}`}
                    onClick={handleMainNextPage}
                    disabled={currentPage === totalMainPages}
                  >
                    Next &gt;
                  </button>
                </div>
              </div>
            )}

            {/* No Search Results Message */}
            {searchQuery.trim() && searchResults.length === 0 && (
              <div className={styles.noSearchResults}>
                <p>{userRole === 'livestock_owner' ? 'no listing found' : 'no listings found'}</p>
              </div>
            )}
          </>
        ) : (
          /* Regular Listings Display - Non-search mode */
          filteredListings.length === 0 ? (
            <div className={styles.simpleEmptyState}>
              <div className={styles.emptyIcon}>
                <img src="/assets/icons/time-past.png" alt="No listings" />
              </div>
              <h3>No listings yet</h3>
              <p className={styles.emptyStateDescription}>
                {userRole === 'livestock_owner' ? (
                  <>
                    Start sharing your livestock <br />
                    waste with the AgriLink community
                  </>
                ) : (
                  <>
                    No crop waste listings yet <br />
                    Check back later for available waste products
                  </>
                )}
              </p>
              {userRole === 'livestock_owner' && (
                <button 
                  className={styles.addListingButton}
                  onClick={openAddModal}
                >
                  + Add Listings
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.listingsGrid}>
                {isPaginating ? (
                  <div className={styles.listingsLoadingContainer}>
                    <div className={styles.listingsLoadingSpinner}></div>
                    <p className={styles.listingsLoadingText}>Loading listings...</p>
                  </div>
                ) : (
                  currentMainListings
                    .filter(listing => {
                      // Hide listings with valid report verdict from public
                      if (listing.reportVerdict === 'VALID' && listing.ownerId !== user?.uid) {
                        return false
                      }
                      return true
                    })
                    .map((listing) => {
                      // Check if listing is hidden due to valid report
                      const isHiddenListing = listing.reportVerdict === 'VALID' && listing.ownerId === user?.uid
                      return (
                      <div 
                        key={listing.id} 
                        className={styles.listingCard}
                        onClick={() => openDetailsModal(listing)}
                        style={{ cursor: 'pointer', opacity: isHiddenListing ? 0.5 : 1 }}
                      >
                        {renderListingCard(listing)}
                      </div>
                      )
                    })
                )}
              </div>

              {/* Pagination Controls - Regular Listings (40 per page) - At the end */}
              {!isPaginating && !searchQuery && userRole === 'crop_farmer' && totalMainPages > 1 && (
                <div className={styles.paginationContainer}>
                  <div className={styles.paginationControls}>
                    {/* Previous Button */}
                    <button
                      className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                      onClick={handleMainPrevPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className={styles.pageNumbers}>
                      {getVisiblePageNumbers(totalMainPages, currentPage).map((pageNum, index) => {
                        if (pageNum === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                              ...
                            </span>
                          )
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                            onClick={() => handleMainPageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      className={`${styles.paginationButton} ${currentPage === totalMainPages ? styles.disabled : ''}`}
                      onClick={handleMainNextPage}
                      disabled={currentPage === totalMainPages}
                    >
                      Next &gt;
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>

      {/* Add Listing Modal - Multi-Step - Using Portal to render at document body level */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{editingListing ? 'Edit Listing' : 'New Listing'}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalLayout}>
                {/* Left Side - Vertical Step Indicator */}
                <div className={styles.stepSidebar}>
                  <div className={styles.verticalSteps}>
                    <div className={`${styles.verticalStep} ${modalStep >= 1 ? styles.active : ''} ${modalStep > 1 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>1</div>
                      <div className={styles.stepLabel}>Basic Info</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 2 ? styles.active : ''} ${modalStep > 2 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>2</div>
                      <div className={styles.stepLabel}>Measurements</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 3 ? styles.active : ''} ${modalStep > 3 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>3</div>
                      <div className={styles.stepLabel}>Pricing</div>
                    </div>
                    <div className={styles.stepLine}></div>
                    <div className={`${styles.verticalStep} ${modalStep >= 4 ? styles.active : ''} ${modalStep > 4 ? styles.completed : ''}`}>
                      <div className={styles.stepCircle}>4</div>
                      <div className={styles.stepLabel}>Image</div>
                    </div>
                  </div>
                </div>

                {/* Right Side - Step Content */}
                <div className={styles.contentArea}>
              {/* Step 1: Basic Information */}
              {modalStep === 1 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Basic Information</h3>
                  
                  {/* AI Verification Info Box for Text */}
                  {userRole === 'livestock_owner' && (
                    <div className={styles.verificationInfoBox} style={{ marginBottom: '20px' }}>
                      <div className={styles.infoText}>
                        <strong>AI Text Verification (Required)</strong>
                        <p>Your listing title and description will be analyzed by AI to ensure they are aligned. Make sure your description accurately matches the waste type in your title.</p>
                      </div>
                    </div>
                  )}
                  
                  {userRole === 'livestock_owner' && userSpecificAnimals.length > 0 ? (
                    // Show dropdown for livestock owners
                    <>
                      {console.log('🔍 Rendering livestock dropdown:')}
                      {console.log('- userSpecificAnimals:', userSpecificAnimals)}
                      {console.log('- waste options:', getLivestockWasteOptions(userSpecificAnimals))}
                      <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
                        <label style={{ margin: 0, minWidth: '120px' }}>Listing Title</label>
                        {getLivestockWasteOptions(userSpecificAnimals).length > 1 ? (
                          <select
                            className={styles.input}
                            value={selectedWasteType}
                            onChange={async (e) => {
                              const wasteType = e.target.value
                              setSelectedWasteType(wasteType)
                              setFormData({
                                ...formData,
                                name: wasteType
                              })
                              // Reset text validation when title changes
                              setTextValidationResult(null)
                              setIsTextVerified(false)
                              setHasAttemptedTextVerification(false)
                            }}
                            style={{ flex: 1 }}
                          >
                            <option value="">Select waste type</option>
                            {getLivestockWasteOptions(userSpecificAnimals).map((wasteType, index) => {
                              console.log(`📋 Rendering waste option ${index}:`, wasteType)
                              return (
                                <option key={index} value={wasteType}>
                                  {wasteType}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          // Single waste type - show as readonly input
                          <input
                            type="text"
                            className={styles.input}
                            value={formData.name}
                            readOnly
                            style={{ flex: 1 }}
                          />
                        )}
                      </div>
                      <div className={styles.formGroup}>
                        <label>Listing Description</label>
                        <textarea
                          className={styles.textarea}
                          placeholder="Describe your product: nutrient content, condition, storage method, etc."
                          value={formData.details}
                          onChange={async (e) => {
                              setFormData({...formData, details: e.target.value})
                              // Reset text validation when description changes
                              setTextValidationResult(null)
                              setIsTextVerified(false)
                              setHasAttemptedTextVerification(false)
                            }}
                          rows={5}
                        />
                      </div>
                      
                      {/* Text Validation Status - Always visible for livestock owners */}
                      {userRole === 'livestock_owner' && (
                        <div className={styles.validationStatus} style={{ marginTop: '20px' }}>
                          {isTextValidating ? (
                            <div className={styles.validating} style={{ marginBottom: '50px' }}>
                              <div className={styles.validationSpinner}></div>
                              <span>AI is analyzing your listing title and description...</span>
                            </div>
                          ) : textValidationResult ? (
                            <>
                              {/* Text Analysis Section */}
                              <div className={styles.analysisContainer}>
                                <h4 className={styles.analysisHeader}>AI Verification</h4>
                                <div className={styles.analysisContent}>
                                  {textValidationResult.error ? (
                                    <span style={{ color: '#dc3545' }}>{textValidationResult.message}</span>
                                  ) : (
                                    <>
                                      <div style={{ marginBottom: '10px' }}>
                                        <strong>Verdict:</strong> {textValidationResult.verdict === 'VERIFIED_ALIGNED' ? 
                                          <span style={{ color: '#28a745' }}> ALIGNED - Title and description match</span> : 
                                          <span style={{ color: '#dc3545' }}> NOT ALIGNED - Title and description don't match</span>
                                        }
                                      </div>
                                      {textValidationResult.verdict !== 'VERIFIED_ALIGNED' && (
                                        <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px' }}>
                                          Please update your title or description to match before proceeding.
                                        </p>
                                      )}
                                      <div>
                                        <strong>Reason:</strong> {textValidationResult.reason || 'No specific reason provided'}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <button 
                                className={styles.revalidateButton}
                                onClick={() => validateListingText(formData.name, formData.details)}
                                disabled={isTextValidating}
                                style={{ marginBottom: '30px' }}
                              >
                                Re-analyze Text
                              </button>
                            </>
                          ) : (
                            <p style={{ color: '#666', fontSize: '14px', marginBottom: '50px' }}>Please fill in both title and description to enable AI verification. Make sure that the listing title and listing details should match.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    // Regular input for crop farmers or users without livestock
                    <>
                      <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <label style={{ margin: 0, minWidth: '120px' }}>Listing Title</label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="e.g., Cattle Manure, Compost, Chicken Manure"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Listing Description</label>
                        <textarea
                          className={styles.textarea}
                          placeholder="Describe your product: nutrient content, condition, storage method, etc."
                          value={formData.details}
                          onChange={async (e) => {
                              setFormData({...formData, details: e.target.value})
                              // Reset text validation when description changes
                              setTextValidationResult(null)
                              setIsTextVerified(false)
                              setHasAttemptedTextVerification(false)
                            }}
                          rows={5}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Measurements & Quantity */}
              {modalStep === 2 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Measurements & Quantity</h3>
                  <div className={styles.stepDescription}>
                    <p>Enter the amount of livestock waste you have available and select the appropriate unit of measurement. This helps buyers understand exactly what quantity they're purchasing.</p>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Quantity *</label>
                    <div className={styles.quantityInputGroup}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.quantityInput}
                        placeholder="e.g., 50, 100, 500"
                        value={formData.measurements}
                        onChange={async (e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          setFormData({...formData, measurements: value})
                        }}
                      />
                      <select
                        className={styles.unitSelect}
                        value={formData.measurementUnit}
                        onChange={(e) => setFormData({...formData, measurementUnit: e.target.value})}
                      >
                        {measurementUnits.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Pricing */}
              {modalStep === 3 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Pricing</h3>
                  <div className={styles.stepDescription}>
                    <p>Set a competitive price for your livestock waste or offer it for free. Consider factors like quantity, quality, and local market rates when pricing your listing.</p>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Price</label>
                    <div className={styles.pricingInputGroup}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className={styles.priceInput}
                        placeholder="0.00"
                        value={formData.isFree ? '' : formData.price}
                        onChange={async (e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setFormData({...formData, price: value, isFree: false})
                        }}
                        disabled={formData.isFree}
                      />
                      <button
                        type="button"
                        className={`${styles.freeToggle} ${formData.isFree ? styles.active : ''}`}
                        onClick={() => setFormData({...formData, isFree: !formData.isFree, price: ''})}
                      >
                        Free
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Image */}
              {modalStep === 4 && (
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>Add Image</h3>
                  
                  {/* AI Verification Info Box */}
                  {userRole === 'livestock_owner' && (
                    <div className={styles.verificationInfoBox}>
                      <div className={styles.infoText}>
                        <strong>AI Image Verification (Optional)</strong>
                        <p>Your image will be verified by AI to confirm it contains legitimate livestock waste or processed fertilizer. You can still create your listing even if verification fails or if the image isn't recognized as livestock waste.</p>
                      </div>
                      
                      <div className={styles.noteContainer}>
                        <p><strong>Note: </strong>If the listing is not verified by AI, the listing might be reported for non-agricultural content or not a livestock waste.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label>Product Image *</label>
                    {formData.imagePreview ? (
                      <>
                        <div className={styles.imagePreview}>
                          <img src={formData.imagePreview} alt="Preview" />
                          
                          <button 
                            className={styles.removeImageButton}
                            onClick={() => {
                              // Revoke the blob URL to prevent memory leaks
                              if (formData.imagePreview && formData.imagePreview.startsWith('blob:')) {
                                URL.revokeObjectURL(formData.imagePreview)
                              }
                              setFormData({...formData, image: null, imagePreview: null})
                              setIsImageValidating(false)
                              setImageValidationResult(null)
                              setIsImageVerified(false)
                              setValidatedImageUrl(null)
                            }}
                          >
                            ×
                          </button>
                        </div>
                        
                        {/* AI Validation Status - Moved outside image preview */}
                        {userRole === 'livestock_owner' && (
                          <div className={styles.validationStatus}>
                            {isImageValidating ? (
                              <div className={styles.validating}>
                                <div className={styles.validationSpinner}></div>
                                <span>AI is verifying your image...</span>
                              </div>
                            ) : imageValidationResult ? (
                              <>
                                {/* AI Image Analysis Section */}
                                <div className={styles.analysisContainer}>
                                  <h4 className={styles.analysisHeader}>AI Verification</h4>
                                  <div className={styles.analysisContent}>
                                    {imageValidationResult ? getAIImageAnalysis(imageValidationResult.reason) : 'No analysis available'}
                                  </div>
                                </div>
                                
                                <button 
                                  className={styles.revalidateButton}
                                  onClick={revalidateImage}
                                  disabled={isImageValidating}
                                >
                                  Re-analyze Image
                                </button>
                              </>
                            ) : (
                              <button 
                                className={styles.validateButton}
                                onClick={() => validateImageWithAI(modalImage)}
                                disabled={isImageValidating}
                              >
                                {isImageValidating ? 'Analyzing...' : 'Verify with AI'}
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.imageUploadContainer}>
                        <input
                          type="file"
                          accept="image/*"
                          className={styles.fileInput}
                          id="imageUpload"
                          onChange={async (e) => {
                            const file = e.target.files[0]
                            if (file) {
                              // Create blob URL for preview
                              const imagePreview = URL.createObjectURL(file)
                              setFormData({...formData, image: file, imagePreview})
                              
                              // Trigger AI validation if user is livestock owner
                              if (userRole === 'livestock_owner' && formData.name && formData.details) {
                                await validateImageWithAI(file, formData.name, formData.details)
                              }
                            }
                          }}
                        />
                        <label htmlFor="imageUpload" className={styles.uploadLabel}>
                          <div className={styles.uploadText}>
                            <span className={styles.uploadTitle}>Click to upload image</span>
                            <span className={styles.uploadSubtitle}>PNG, JPG up to 10MB</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.cancelButton} 
                onClick={modalStep === 1 ? closeModal : prevStep}
              >
                {modalStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {modalStep < 4 ? (
                <button 
                  className={styles.nextButton} 
                  onClick={modalStep === 1 && userRole === 'livestock_owner' && (!hasAttemptedTextVerification || textValidationResult?.verdict !== 'VERIFIED_ALIGNED') ? handleVerify : nextStep} 
                  disabled={!isCurrentStepValid() || (modalStep === 1 && userRole === 'livestock_owner' && (!hasAttemptedTextVerification || textValidationResult?.verdict !== 'VERIFIED_ALIGNED') && isTextValidating)}
                >
                  {modalStep === 1 && userRole === 'livestock_owner' && (!hasAttemptedTextVerification || textValidationResult?.verdict !== 'VERIFIED_ALIGNED') ? 
                    (isTextValidating ? 'Verifying by AI...' : 'Verify') : 
                    'Next'
                  }
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.nextButton} ${styles.createButton}`}
                  onClick={saveListing}
                  disabled={isCreatingListing || isImageValidating || isTextValidating || !areAllStepsCompleted()}
                >
                  {isCreatingListing ? 'Creating...' : isImageValidating || isTextValidating ? 'Validating...' : 'Create Listing'}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Creating Listing */}
      {isCreatingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Processing...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Requesting Listing */}
      {isRequestingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Requesting...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Loading Modal for Deleting Listing */}
      {isDeletingListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingModal}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Deleting listing...</p>
          </div>
        </div>,
        document.body
      )}

      {/* Listing Details Modal - Using Portal to render at document body level */}
      {showDetailsModal && selectedListing && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlay} onClick={closeDetailsModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <div className={styles.headerTitleRow}>
                  <div>
                    <h2>{selectedListing.name || 'Unnamed Listing'}</h2>
                  </div>
                  <span className={styles.headerPrice}>
                    {formatPrice(selectedListing.price, selectedListing.isFree)}
                  </span>
                </div>
                <span className={styles.headerDate}>
                  {formatDate(selectedListing.createdAt || selectedListing.timestamp)}
                </span>
              </div>
              <button className={styles.closeButton} onClick={closeDetailsModal}>
                ×
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.detailsLayout}>
                {/* Left Column - Image */}
                <div className={styles.detailsLeft}>
                  {(() => {
                    const imageUrl = selectedListing.images?.[0] || selectedListing.imageUrls?.[0] || selectedListing.imageUrl || selectedListing.image || selectedListing.photo || selectedListing.photoUrl || selectedListing.photos?.[0]
                    return imageUrl ? (
                      <div className={styles.detailsImageContainer} style={{ position: 'relative' }}>
                        <img 
                          src={imageUrl} 
                          alt={selectedListing.name}
                          className={styles.detailsImage}
                          onClick={() => openImageModal(imageUrl, selectedListing.name)}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                        {/* AI Verification Badge - Top Right of Image */}
                        {selectedListing.isAiVerified && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                            zIndex: 10
                          }}>
                            <span>✓</span>
                            Verified by AI
                          </div>
                        )}
                        <div className={styles.detailsPlaceholder} style={{ display: 'none' }}>
                          <p>Failed to load image</p>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.detailsPlaceholder}>
                        <p>No image available</p>
                      </div>
                    )
                  })()}
                  
                  {/* AI Verification Results - Only for livestock owners viewing their own listings */}
                  {userRole === 'livestock_owner' && selectedListing.ownerId === user?.uid && (
                    <>
                      {/* Text Verification */}
                      {selectedListing.textValidationResult ? (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h5 style={{ marginBottom: '10px', color: '#333', fontSize: '16px' }}> AI Listing Name and Description</h5>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Verdict:</strong> 
                            <span style={{ 
                              backgroundColor: selectedListing.textValidationResult.verdict === 'VERIFIED_ALIGNED' ? '#28a745' : '#dc3545',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              marginLeft: '8px',
                              fontSize: '14px'
                            }}>
                              {selectedListing.textValidationResult.verdict === 'VERIFIED_ALIGNED' ? 
                                'ALIGNED' : 
                                'NOT ALIGNED'
                              }
                            </span>
                          </div>
                          <div>
                            <strong>Reason:</strong> 
                            <p style={{ marginTop: '5px', fontSize: '14px', lineHeight: '1.4' }}>
                              {selectedListing.textValidationResult.reason || 'No reason provided'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h5 style={{ marginBottom: '10px', color: '#666', fontSize: '16px' }}> AI Listing Name and Description</h5>
                          <p style={{ color: '#666', fontSize: '14px' }}>Not verified</p>
                        </div>
                      )}
                      
                      {/* Image Verification */}
                      {selectedListing.imageValidationResult ? (
                        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h5 style={{ marginBottom: '10px', color: '#333', fontSize: '16px' }}> AI Image Verification</h5>
                          <div style={{ marginBottom: '8px' }}>
                            <strong>Verdict:</strong> 
                            <span style={{ 
                              backgroundColor: selectedListing.imageValidationResult.verdict === 'VERIFIED_LEGITIMATE' ? '#28a745' : '#dc3545',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              marginLeft: '8px',
                              fontSize: '14px'
                            }}>
                              {selectedListing.imageValidationResult.verdict === 'VERIFIED_LEGITIMATE' ? 
                                'LEGITIMATE' : 
                                selectedListing.imageValidationResult.verdict === 'VERIFIED_NOT_LEGITIMATE' ?
                                'NOT LEGITIMATE' :
                                'UNABLE TO VERIFY'
                              }
                            </span>
                          </div>
                          <div>
                            <strong>Analysis:</strong> 
                            <p style={{ marginTop: '5px', fontSize: '14px', lineHeight: '1.4' }}>
                              {selectedListing.imageValidationResult.reason || 'No analysis provided'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h5 style={{ marginBottom: '10px', color: '#666', fontSize: '16px' }}> AI Image Verification</h5>
                          <p style={{ color: '#666', fontSize: '14px' }}>Not verified</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Crop Compatibility - Only for Crop Farmers */}
                  {userRole === 'crop_farmer' && selectedListing.cropCompatibility && (
                    <div className={styles.detailsSection} style={{ marginTop: '20px', backgroundColor: '#f0f8f0', padding: '15px', borderRadius: '8px', border: '1px solid #4caf50' }}>
                      <h4 style={{ color: '#2d5a27', marginBottom: '12px' }}>
                        Best Suited for This Waste
                      </h4>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                        {selectedListing.cropCompatibility.analysis}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {selectedListing.cropCompatibility.topCrops.map((cropInfo, index) => (
                          <div key={index} style={{ 
                            backgroundColor: 'white', 
                            padding: '10px', 
                            borderRadius: '6px', 
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ 
                                backgroundColor: '#4caf50', 
                                color: 'white', 
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                {index + 1}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                  <h5 style={{ margin: '0', color: '#2d5a27', fontSize: '16px' }}>
                                    {cropInfo.name}
                                  </h5>
                                  {cropInfo.score && (
                                    <span style={{ 
                                      fontSize: '14px', 
                                      fontWeight: '600',
                                      color: cropInfo.score >= 80 ? '#4caf50' : cropInfo.score >= 60 ? '#ff9800' : '#f44336'
                                    }}>
                                      {cropInfo.score.toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                                {cropInfo.score && (
                                  <div style={{ 
                                    width: '100%', 
                                    height: '8px', 
                                    backgroundColor: '#e0e0e0', 
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${cropInfo.score}%`,
                                      height: '100%',
                                      backgroundColor: cropInfo.score >= 80 ? '#4caf50' : cropInfo.score >= 60 ? '#ff9800' : '#f44336',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                )}
                                <p style={{ margin: '0', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                                  {cropInfo.reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column - Details */}
                <div className={styles.detailsRight}>
                  {/* Owner Info */}
                  <div className={styles.detailsSection}>
                    <h4>Listing owner:</h4>
                    <p className={styles.detailsOwner}>
                      {selectedListing.ownerName || 'Unknown Owner'}
                      <span className={styles.detailsRating}>
                        ⭐ {typeof selectedListing.ownerRating === 'number' ? selectedListing.ownerRating.toFixed(1) : '0.0'}
                      </span>
                    </p>
                  </div>
                  
                  {/* Quantity and Distance/Location */}
                  <div className={styles.detailsRow}>
                    {selectedListing.measurements && (
                      <div className={styles.detailsSection}>
                        <h4>Quantity:</h4>
                        <p>{selectedListing.measurements} {selectedListing.measurementUnit || 'units'}</p>
                      </div>
                    )}
                    
                    {userRole === 'crop_farmer' && selectedListing.distanceKm != null && (
                      <div className={styles.detailsSection}>
                        <h4>Distance:</h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill={selectedListing.distanceKm < 5 ? "#2d5a27" : "#fa9100"} xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span style={{ color: selectedListing.distanceKm < 5 ? '#2d5a27' : '#fa9100', fontWeight: '600' }}>
                            {selectedListing.distanceKm < 5 ? 'Nearby' : `${selectedListing.distanceKm.toFixed(1)} km away`}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {selectedListing.details && (
                    <div className={styles.detailsSection} style={{ marginTop: '0' }}>
                      <h4>Description:</h4>
                      <p className={styles.detailsDescription}>{selectedListing.details}</p>
                    </div>
                  )}
                  
                </div>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              {userRole === 'crop_farmer' ? (
                (() => {
                  const buttonState = getButtonState(selectedListing?.id)
                  return (
                    <div className={styles.cropFarmerActions}>
                      <button 
                        className={styles.reportListingButton}
                        onClick={() => {
                          closeDetailsModal()
                          handleReportListing(selectedListing)
                        }}
                        title="Report this listing"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 9v4M12 17h.01M5.07 19H19a2 2 0 001.75-2.96l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005.07 19z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Report
                      </button>
                      <button 
                        className={`${styles.reportListingButton} ${
                          requestStatuses[selectedListing?.id] === 'pending' ? styles.cancelButton : 
                          requestStatuses[selectedListing?.id] === 'approved' ? styles.approvedButton : ''
                        }`}
                        style={{
                          backgroundColor: requestStatuses[selectedListing?.id] === 'pending' ? '#fff' : '#fa9100',
                          color: 'white',
                          outline: 'none',
                          border: 'none',
                          boxShadow: 'none'
                        }}
                        disabled={buttonState.disabled}
                        onClick={() => {
                          if (requestStatuses[selectedListing?.id] === 'pending') {
                            // Try main cancel function first, with fallback to simplified version
                            handleCancelRequest(selectedListing?.id).catch((error) => {
                              console.error('Main cancel failed, trying simplified version:', error)
                              handleCancelRequestSimple(selectedListing?.id)
                            }).finally(() => {
                              closeDetailsModal()
                            })
                          } else if (!requestStatuses[selectedListing?.id] || requestStatuses[selectedListing?.id] === 'rejected' || requestStatuses[selectedListing?.id] === 'cancelled') {
                            handleListingRequest(selectedListing)
                            closeDetailsModal()
                          } else {
                            closeDetailsModal()
                          }
                        }}
                      >
                        {buttonState.text}
                      </button>
                    </div>
                  )
                })()
              ) : userRole === 'livestock_owner' ? (
                <div className={styles.ownerActions}>
                  <button 
                    className={styles.editButton}
                    onClick={() => {
                      closeDetailsModal()
                      openEditModal(selectedListing)
                    }}
                  >
                    Edit
                  </button>
                  {selectedListing.status !== 'sold' && (
                    <button 
                      className={styles.markSoldButton}
                      onClick={() => {
                        closeDetailsModal()
                        markAsSold(selectedListing)
                      }}
                    >
                      Sold
                    </button>
                  )}
                  <button 
                    className={styles.deleteButton}
                    onClick={() => {
                      closeDetailsModal()
                      deleteListing(selectedListing)
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={closeReportModal}
        targetUser={{
          id: reportedListing?.ownerId,
          displayName: reportedListing?.ownerName,
          firstName: reportedListing?.ownerName?.split(' ')[0],
          lastName: reportedListing?.ownerName?.split(' ').slice(1).join(' ')
        }}
        content={{
          id: reportedListing?.id,
          name: reportedListing?.name,
          caption: reportedListing?.name,
          details: reportedListing?.details || reportedListing?.description,
          description: reportedListing?.details || reportedListing?.description,
          text: reportedListing?.details || reportedListing?.description,
          content: `${reportedListing?.name || ''} - ${reportedListing?.details || reportedListing?.description || ''}`,
          // Primary field is 'image' (singular) based on how listings are saved
          imageUrl: reportedListing?.image || reportedListing?.images?.[0] || reportedListing?.imageUrls?.[0] || reportedListing?.imageUrl || '',
          imageUrls: reportedListing?.image ? [reportedListing.image] : (reportedListing?.images || reportedListing?.imageUrls || []),
          mediaUrl: reportedListing?.image || reportedListing?.images?.[0] || reportedListing?.imageUrls?.[0] || reportedListing?.imageUrl || ''
        }}
        contentType="listing"
        reporterId={user?.uid}
      />

      {/* Image Modal */}
      {showImageModal && createPortal(
        <div className={styles.imageModalOverlay} onClick={closeImageModal}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.imageModalClose} onClick={closeImageModal}>
              ×
            </button>
            <img 
              src={selectedImage} 
              alt={selectedImageAlt}
              className={styles.imageModalImage}
            />
          </div>
        </div>,
        document.body
      )}
      
      {/* Location Permission Toast - Sliding from top-right */}
      {showLocationToast && (
        <div 
          className={`${styles.toast} ${styles.show}`}
          onClick={handleLocationToastClick}
          style={{ cursor: 'pointer' }}
        >
          <i className={`fas fa-map-marker-alt ${styles.toastIcon}`}></i>
          <span className={styles.toastMessage}>{locationToastMessage}</span>
          <button className={styles.toastClose} onClick={(e) => {
            e.stopPropagation()
            dismissLocationToast()
          }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
}
