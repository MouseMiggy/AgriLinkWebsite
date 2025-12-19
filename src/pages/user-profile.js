import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import styles from '../../styles/user-profile.module.css'
import dashboardStyles from '../../styles/modules/dashboard.module.css'
import cropOnboardingStyles from '../../styles/modules/crop-onboarding.module.css'

// Define specific animals data
const specificAnimals = {
  cattle: [
    { id: 'cow', name: 'Cow', tagalog: 'Baka' },
    { id: 'dairy-cow', name: 'Dairy cow', tagalog: 'Baka pang-gatas' },
    { id: 'beef-cow', name: 'Beef cow', tagalog: 'Baka pang-karne' }
  ],
  poultry: [
    { id: 'chicken', name: 'Chicken', tagalog: 'Manok' },
    { id: 'layer-chicken', name: 'Layer chicken', tagalog: 'Manok pang-itlog' },
    { id: 'broiler-chicken', name: 'Broiler chicken', tagalog: 'Manok pang-karne' },
    { id: 'duck', name: 'Duck', tagalog: 'Pato' },
    { id: 'muscovy-duck', name: 'Muscovy duck', tagalog: 'Pato Muscovy' },
    { id: 'turkey', name: 'Turkey', tagalog: 'Pabo' },
    { id: 'quail', name: 'Quail', tagalog: 'Pugo' },
    { id: 'goose', name: 'Goose', tagalog: 'Gansa' }
  ],
  swine: [
    { id: 'pig', name: 'Pig', tagalog: 'Baboy' },
    { id: 'native-pig', name: 'Native pig', tagalog: 'Baboy katutubo' },
    { id: 'crossbred-pig', name: 'Crossbred pig', tagalog: 'Baboy halong lahi' }
  ],
  goat: [
    { id: 'goat', name: 'Goat', tagalog: 'Kambing' },
    { id: 'native-goat', name: 'Native goat', tagalog: 'Kambing katutubo' },
    { id: 'boer-goat', name: 'Boer goat', tagalog: 'Kambing Boer' }
  ],
  sheep: [
    { id: 'sheep', name: 'Sheep', tagalog: 'Tupa' },
    { id: 'native-sheep', name: 'Native sheep', tagalog: 'Tupa katutubo' }
  ],
  rabbit: [
    { id: 'rabbit', name: 'Rabbit', tagalog: 'Kuneho' },
    { id: 'native-rabbit', name: 'Native rabbit', tagalog: 'Kuneho katutubo' }
  ],
  others: [
    { id: 'carabao', name: 'Carabao', tagalog: 'Kalabaw' },
    { id: 'horse', name: 'Horse', tagalog: 'Kabayo' },
    { id: 'donkey', name: 'Donkey', tagalog: 'Asno' },
    { id: 'bee', name: 'Bee', tagalog: 'Bubuyog / Maya' },
    { id: 'silkworm', name: 'Silkworm', tagalog: 'Uod ng Seda' },
    { id: 'ostrich', name: 'Ostrich', tagalog: 'Ostris' },
    { id: 'camel', name: 'Camel', tagalog: 'Kamelyo' }
  ]
}

import { auth, db } from '../lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { uploadImageToFirebaseStorage } from '../lib/firebaseStorage'
import { usePopup } from '../contexts/PopupContext'

// Import crop data from crop-onboarding
const cropTypes = [
  { id: 'rice', name: 'Rice', icon: '/assets/images/wheat.png', description: 'Various rice varieties' },
  { id: 'corn', name: 'Corn', icon: '/assets/images/corn.png', description: 'Corn and maize varieties' },
  { id: 'vegetables', name: 'Vegetables', icon: '/assets/images/lettuce.png', description: 'Leafy and fruit vegetables' },
  { id: 'fruits', name: 'Fruits', icon: '/assets/images/fruits.png', description: 'Tropical and seasonal fruits' },
  { id: 'rootCrops', name: 'Root Crops', icon: '/assets/images/rootcrop.png', description: 'Underground crops' },
  { id: 'legumes', name: 'Legumes', icon: '/assets/images/other.png', description: 'Beans and peas' },
  { id: 'spices', name: 'Herbs & Spices', icon: '/assets/images/other.png', description: 'Spices, seasonings, and culinary herbs' },
  { id: 'industrial', name: 'Industrial Crops', icon: '/assets/images/sugarcane.png', description: 'Commercial and industrial crops' },
  { id: 'mushrooms', name: 'Mushrooms', icon: '/assets/images/other.png', description: 'Edible fungi varieties' }
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
    { id: 'moringa', name: 'Moringa leaves', tagalog: 'Malunggay' },
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
  rootCrops: [
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
    { id: 'mung-bean-legume', name: 'Mung bean', tagalog: 'Monggo' },
    { id: 'soybean-legume', name: 'Soybean', tagalog: 'Soya' },
    { id: 'peanut-legume', name: 'Peanut', tagalog: 'Mani' },
    { id: 'cowpea-legume', name: 'Cowpea', tagalog: 'Paayap' },
    { id: 'string-beans-legume', name: 'String beans / Yardlong bean', tagalog: 'Sitaw' },
    { id: 'winged-bean-legume', name: 'Winged bean', tagalog: 'Sigarilyas' },
    { id: 'hyacinth-bean-legume', name: 'Hyacinth bean', tagalog: 'Bataw' },
    { id: 'lima-bean-legume', name: 'Lima bean', tagalog: 'Patani' },
    { id: 'chickpea-legume', name: 'Chickpea', tagalog: 'Garbanzo' },
    { id: 'pigeon-pea-legume', name: 'Pigeon pea', tagalog: 'Kadyos' },
    { id: 'lentil-legume', name: 'Lentil', tagalog: 'Lentehas' },
    { id: 'black-bean', name: 'Black bean', tagalog: 'Itim na beans' },
    { id: 'red-kidney-bean', name: 'Red kidney bean', tagalog: 'Red kidney bean' },
    { id: 'white-bean', name: 'White bean', tagalog: 'Puting beans' },
    { id: 'green-peas-legume', name: 'Green peas', tagalog: 'Gisantes' },
    { id: 'snow-peas-legume', name: 'Snow peas', tagalog: 'Sitsaro' },
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
  industrial: [
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
  ],
  others: []
}

export default function UserProfile() {
  const router = useRouter()
  const { showInfoPopup, showSuccessPopup, showErrorPopup, showConfirmPopup } = usePopup()
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [listings, setListings] = useState([])
  const [posts, setPosts] = useState([])
  const [requestCount, setRequestCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showDropdown, setShowDropdown] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [editText, setEditText] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editImagePreviews, setEditImagePreviews] = useState([])
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editLoading, setEditLoading] = useState(false)
  
  // Edit Profile Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editProfilePicture, setEditProfilePicture] = useState(null)
  const [editProfilePicturePreview, setEditProfilePicturePreview] = useState(null)
  const [editProfileLoading, setEditProfileLoading] = useState(false)
  const [editProfileLoadingMessage, setEditProfileLoadingMessage] = useState('')
  // State for editing crops/livestock
  const [editCrops, setEditCrops] = useState([])
  const [editLivestock, setEditLivestock] = useState([])
  const [editSpecificCrops, setEditSpecificCrops] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalType, setConfirmModalType] = useState('') // 'save' or 'discard'
  const [showHiddenPosts, setShowHiddenPosts] = useState(false) // For collapsible hidden posts container
  
  // State for crops editing modal
  const [showEditCropsModal, setShowEditCropsModal] = useState(false)
  const [editCropsModalLoading, setEditCropsModalLoading] = useState(false)
  const [editCropsModalLoadingMessage, setEditCropsModalLoadingMessage] = useState('')
  
  // Custom popup state for crops editing
  const [showCropsPopup, setShowCropsPopup] = useState(false)
  
  // Custom popup state for livestock editing
  const [showLivestockPopup, setShowLivestockPopup] = useState(false)
  const [editSpecificLivestock, setEditSpecificLivestock] = useState([])
  const [editSpecificLivestockByType, setEditSpecificLivestockByType] = useState({})
  const [editLivestockModalLoading, setEditLivestockModalLoading] = useState(false)
  const [editLivestockModalLoadingMessage, setEditLivestockModalLoadingMessage] = useState('')

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await loadUserProfile(currentUser.uid)
        await loadUserListings(currentUser.uid)
        await loadUserRequests(currentUser.uid)
        loadUserPosts(currentUser.uid)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDropdown && !e.target.closest(`.${styles.postOptions}`)) {
        setShowDropdown(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  // Cleanup scroll lock on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  const loadUserProfile = async (userId) => {
    try {
      console.log('🔄 Loading user profile for userId:', userId)
      // Use 'users' collection (lowercase) - matching listings.js
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        console.log('📊 User profile loaded from Firestore:', userData)
        console.log('🌱 userData.onboarding?.specificCrops:', userData.onboarding?.specificCrops)
        console.log('🌾 userData.cropFarmer?.specificCrops:', userData.cropFarmer?.specificCrops)
        console.log('📦 userData.cropFarmer?.cropType:', userData.cropFarmer?.cropType)
        console.log('📦 userData.onboarding?.cropTypes:', userData.onboarding?.cropTypes)
        setUserProfile(userData)
      } else {
        console.log('❌ User document not found')
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  // Helper function to get crop display information
  const getCropDisplayInfo = (cropId) => {
    const cropMap = {
      'rice': { icon: '/assets/images/wheat.png', name: 'Rice' },
      'corn': { icon: '/assets/images/corn.png', name: 'Corn' },
      'vegetables': { icon: '/assets/images/lettuce.png', name: 'Vegetables' },
      'fruits': { icon: '/assets/images/fruits.png', name: 'Fruits' },
      'root-tuber': { icon: '/assets/images/rootcrop.png', name: 'Root Crops' },
      'plantation': { icon: '/assets/images/sugarcane.png', name: 'Plantation Crops' },
      'other': { icon: '/assets/images/other.png', name: 'Other Crops' }
    }
    return cropMap[cropId] || { icon: '/assets/images/other.png', name: cropId }
  }

  // Helper function to get animal display information
  const getAnimalDisplayInfo = (animalId) => {
    const animalMap = {
      'cattle': { icon: '/assets/images/cattle.png', name: 'Cattle' },
      'poultry': { icon: '/assets/images/chicken.png', name: 'Poultry' },
      'swine': { icon: '/assets/images/swine.png', name: 'Swine' },
      'goat': { icon: '/assets/images/goat.png', name: 'Goats' },
      'sheep': { icon: '/assets/images/sheep.png', name: 'Sheep' },
      'rabbit': { icon: '/assets/images/rabbit.png', name: 'Rabbits' },
      'others': { icon: '/assets/images/livestock.png', name: 'Others' }
    }
    return animalMap[animalId] || { icon: '/assets/images/livestock.png', name: animalId }
  }

  // Helper function to get specific animal display information
  const getSpecificAnimalDisplayInfo = (animalId) => {
    // All specific animals from all categories
    const animalMap = {
      // Cattle
      'cow': { icon: '/assets/images/cattle.png', name: 'Cow' },
      'dairy-cow': { icon: '/assets/images/cattle.png', name: 'Dairy Cow' },
      'beef-cow': { icon: '/assets/images/cattle.png', name: 'Beef Cow' },
      // Poultry
      'chicken': { icon: '/assets/images/chicken.png', name: 'Chicken' },
      'layer-chicken': { icon: '/assets/images/chicken.png', name: 'Layer Chicken' },
      'broiler-chicken': { icon: '/assets/images/chicken.png', name: 'Broiler Chicken' },
      'duck': { icon: '/assets/images/duck.png', name: 'Duck' },
      'muscovy-duck': { icon: '/assets/images/duck.png', name: 'Muscovy Duck' },
      'turkey': { icon: '/assets/images/turkey.png', name: 'Turkey' },
      'quail': { icon: '/assets/images/quail.png', name: 'Quail' },
      'goose': { icon: '/assets/images/goose.png', name: 'Goose' },
      // Swine
      'pig': { icon: '/assets/images/swine.png', name: 'Pig' },
      'native-pig': { icon: '/assets/images/swine.png', name: 'Native Pig' },
      'crossbred-pig': { icon: '/assets/images/swine.png', name: 'Crossbred Pig' },
      // Goats
      'goat': { icon: '/assets/images/goat.png', name: 'Goat' },
      'native-goat': { icon: '/assets/images/goat.png', name: 'Native Goat' },
      'boer-goat': { icon: '/assets/images/goat.png', name: 'Boer Goat' },
      // Sheep
      'sheep': { icon: '/assets/images/sheep.png', name: 'Sheep' },
      'native-sheep': { icon: '/assets/images/sheep.png', name: 'Native Sheep' },
      // Rabbits
      'rabbit': { icon: '/assets/images/rabbit.png', name: 'Rabbit' },
      'native-rabbit': { icon: '/assets/images/rabbit.png', name: 'Native Rabbit' },
      // Others
      'carabao': { icon: '/assets/images/carabao.png', name: 'Carabao' },
      'horse': { icon: '/assets/images/horse.png', name: 'Horse' },
      'donkey': { icon: '/assets/images/donkey.png', name: 'Donkey' },
      'bee': { icon: '/assets/images/bee.png', name: 'Bee' },
      'silkworm': { icon: '/assets/images/silkworm.png', name: 'Silkworm' },
      'ostrich': { icon: '/assets/images/ostrich.png', name: 'Ostrich' },
      'camel': { icon: '/assets/images/camel.png', name: 'Camel' }
    }
    return animalMap[animalId] || { icon: '/assets/images/livestock.png', name: animalId }
  }

  const loadUserListings = async (userId) => {
    try {
      console.log('Loading listings for userId:', userId)
      const q = query(
        collection(db, 'livestock_listings'),
        where('ownerId', '==', userId)
      )
      const snapshot = await getDocs(q)
      console.log('Total listings found:', snapshot.docs.length)
      
      const allListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      
      // Filter out sold and deleted listings - only count available ones
      const availableListings = allListings.filter(
        listing => listing.status !== 'sold' && listing.status !== 'deleted'
      )
      
      console.log('Available listings (not sold/deleted):', availableListings.length)
      
      // Sort manually by createdAt
      availableListings.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0)
        const dateB = b.createdAt?.toDate?.() || new Date(0)
        return dateB - dateA
      })
      setListings(availableListings)
    } catch (error) {
      console.error('Error loading listings:', error)
    }
  }

  const loadUserRequests = async (userId) => {
    try {
      console.log('Loading requests for userId:', userId)
      const q = query(
        collection(db, 'listing_requests'),
        where('requesterId', '==', userId)
      )
      const snapshot = await getDocs(q)
      const count = snapshot.size
      console.log('Total requests made:', count)
      setRequestCount(count)
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const loadUserPosts = (userId) => {
    console.log('Loading posts for userId:', userId)
    // Use real-time listener for posts
    const unsubscribe = onSnapshot(collection(db, 'Posts'), (snapshot) => {
      const userPosts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(post => post.userId === userId)
      
      console.log('User posts found:', userPosts.length)
      
      // Sort manually by createdAt desc
      userPosts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0))
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0))
        return dateB - dateA
      })
      
      setPosts(userPosts)
    })
    return unsubscribe
  }

  // Toggle dropdown menu
  const toggleDropdown = (postId) => {
    setShowDropdown(showDropdown === postId ? null : postId)
  }

  // Check if user has liked a post
  const hasUserLiked = (post) => {
    return post.likedBy?.includes(user?.uid)
  }

  // Handle like/unlike post
  const handleLikePost = async (post) => {
    if (!user) return
    
    try {
      const postRef = doc(db, 'Posts', post.id)
      const hasLiked = hasUserLiked(post)
      
      if (hasLiked) {
        await updateDoc(postRef, {
          likes: (post.likes || 1) - 1,
          likedBy: arrayRemove(user.uid)
        })
      } else {
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1,
          likedBy: arrayUnion(user.uid)
        })
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  // Handle edit post
  const handleEditPost = (post) => {
    setEditingPost(post)
    setEditText(post.text || '')
    
    // Initialize existing images
    const existingImages = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
    setEditImagePreviews(existingImages)
    setEditImageFiles([])
    
    setShowEditModal(true)
    setShowDropdown(null)
  }

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingPost(null)
    setEditText('')
    setEditImageFiles([])
    setEditImagePreviews([])
    setEditLoading(false)
  }

  // Handle image selection for edit
  const handleEditImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const newPreviews = files.map(file => URL.createObjectURL(file))
    
    setEditImageFiles(prev => [...prev, ...files])
    setEditImagePreviews(prev => [...prev, ...newPreviews])
  }

  // Remove image from edit
  const removeEditImage = (index) => {
    const preview = editImagePreviews[index]
    const existingImages = editingPost?.imageUrls || (editingPost?.imageUrl ? [editingPost.imageUrl] : [])
    
    // Check if it's an existing image or a new upload
    if (existingImages.includes(preview)) {
      // It's an existing image, just remove from previews
      setEditImagePreviews(prev => prev.filter((_, i) => i !== index))
    } else {
      // It's a new upload, remove from both files and previews
      const newFileIndex = editImagePreviews.slice(existingImages.length).indexOf(preview)
      if (newFileIndex !== -1) {
        setEditImageFiles(prev => prev.filter((_, i) => i !== newFileIndex))
      }
      setEditImagePreviews(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Save edited post
  const saveEditedPost = async () => {
    if ((!editText.trim() && editImagePreviews.length === 0) || !editingPost) {
      console.log('Validation failed:', { editText, editImagePreviews, editingPost })
      return
    }
    
    setEditLoading(true)
    console.log('Starting save edit for post:', editingPost.id)

    try {
      // Upload new images to Cloudinary
      const newImageUrls = []
      if (editImageFiles.length > 0) {
        console.log('Uploading', editImageFiles.length, 'new images...')
        for (const file of editImageFiles) {
          try {
            const imageUrl = await uploadImageToFirebaseStorage(file, 'Images/Feed', user.uid)
            if (imageUrl) {
              newImageUrls.push(imageUrl)
              console.log('Image uploaded:', imageUrl)
            }
          } catch (uploadError) {
            console.error('Image upload failed:', uploadError)
          }
        }
      }

      // Combine existing images with new uploaded images
      const existingImages = editingPost.imageUrls || (editingPost.imageUrl ? [editingPost.imageUrl] : [])
      const finalImageUrls = []
      
      // Add existing images that are still in previews
      editImagePreviews.forEach(preview => {
        if (existingImages.includes(preview)) {
          finalImageUrls.push(preview)
        }
      })
      
      // Add new uploaded images
      finalImageUrls.push(...newImageUrls)
      
      console.log('Final image URLs:', finalImageUrls)

      const postRef = doc(db, 'Posts', editingPost.id)
      const updateData = {
        text: editText.trim()
      }

      // Only add editedAt if we have serverTimestamp
      try {
        updateData.editedAt = serverTimestamp()
      } catch (e) {
        updateData.editedAt = new Date()
      }

      // Update image fields
      if (finalImageUrls.length > 0) {
        updateData.imageUrls = finalImageUrls
        updateData.imageUrl = finalImageUrls[0]
      } else {
        updateData.imageUrls = []
        updateData.imageUrl = null
      }

      console.log('Update data:', updateData)
      await updateDoc(postRef, updateData)
      console.log('Post updated successfully!')
      
      closeEditModal()
    } catch (error) {
      console.error('Error editing post:', error)
      console.error('Error details:', error.message, error.code)
      alert('Failed to update post: ' + error.message)
      setEditLoading(false)
    }
  }

  // Handle delete post
  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return
    
    try {
      await deleteDoc(doc(db, 'Posts', postId))
      setShowDropdown(null)
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  // Open Edit Profile Modal
  const openEditProfileModal = () => {
    setEditFirstName(userProfile?.firstName || '')
    setEditLastName(userProfile?.lastName || '')
    setEditProfilePicture(null)
    setEditProfilePicturePreview(null)
    // Initialize crops/livestock from user profile
    setEditCrops(userProfile?.cropFarmer?.cropType || [])
    setEditLivestock(userProfile?.livestock?.animals || [])
    setEditSpecificCrops(userProfile?.onboarding?.specificCrops || [])
    setSearchQuery('')
    setShowEditProfileModal(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  // Handle specific crop selection
  const handleSpecificCropSelect = (cropId) => {
    setEditSpecificCrops(prev => 
      prev.includes(cropId) 
        ? prev.filter(id => id !== cropId)
        : [...prev, cropId]
    )
  }

  // Open crops editing modal
  const openEditCropsModal = () => {
    // Initialize crops/livestock from user profile
    setEditCrops(userProfile?.cropFarmer?.cropType || [])
    setEditSpecificCrops(userProfile?.onboarding?.specificCrops || [])
    setSearchQuery('')
    setShowCropsPopup(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  // Close crops editing modal
  const closeEditCropsModal = () => {
    setShowCropsPopup(false)
    setEditCrops([])
    setEditSpecificCrops([])
    setSearchQuery('')
    // Restore background scrolling
    document.body.style.overflow = 'auto'
  }

  // Open livestock editing modal
  const openEditLivestockModal = () => {
    console.log('🔧 Opening livestock edit modal')
    console.log('📊 Profile data:', userProfile?.livestock)
    
    // Initialize livestock from user profile and normalize old IDs
    let livestockAnimals = userProfile?.livestock?.animals || []
    // Normalize old plural IDs to singular
    livestockAnimals = livestockAnimals.map(animal => {
      if (animal === 'goats') return 'goat'
      if (animal === 'rabbits') return 'rabbit'
      return animal
    })
    setEditLivestock(livestockAnimals)
    
    // Initialize specific animals by type
    const specificByType = {}
    const allSpecificAnimals = userProfile?.livestock?.specificAnimals || []
    
    console.log('🐐 All specific animals from profile:', allSpecificAnimals)
    console.log('📝 Available specific animals data structure:', Object.keys(specificAnimals))
    
    // Group specific animals by their type
    Object.keys(specificAnimals).forEach(type => {
      if (type !== 'others') {
        const typeAnimals = allSpecificAnimals.filter(id => {
          const found = specificAnimals[type].some(animal => animal.id === id)
          if (found) {
            console.log(`✅ Found ${id} in category ${type}`)
          }
          return found
        })
        if (typeAnimals.length > 0) {
          specificByType[type] = typeAnimals
          console.log(`📦 ${type}:`, typeAnimals)
        }
      }
    })
    
    // Additional debugging for rabbits
    console.log('🐰 Checking for rabbit-specific animals:')
    console.log('specificAnimals.rabbit:', specificAnimals.rabbit)
    console.log('All specific animals containing "rabbit":', allSpecificAnimals.filter(id => id.includes('rabbit')))
    console.log('Rabbit category filter result:', allSpecificAnimals.filter(id => specificAnimals.rabbit?.some(animal => animal.id === id)))
    
    // Handle "others" separately
    const othersAnimals = allSpecificAnimals.filter(id => {
      const found = specificAnimals.others.some(animal => animal.id === id)
      if (found) {
        console.log(`✅ Found ${id} in others category`)
      }
      return found
    })
    setEditSpecificLivestock(othersAnimals)
    setEditSpecificLivestockByType(specificByType)
    
    console.log('🔧 Final edit modal state:', {
      livestock: livestockAnimals,
      specificByType: specificByType,
      others: othersAnimals
    })
    
    setShowLivestockPopup(true)
    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  // Close livestock editing modal
  const closeEditLivestockModal = () => {
    setShowLivestockPopup(false)
    setEditLivestock([])
    setEditSpecificLivestock([])
    setEditSpecificLivestockByType({})
    // Restore background scrolling
    document.body.style.overflow = 'auto'
  }

  // Filter specific crops based on search
  const getFilteredSpecificCrops = (cropType) => {
    if (!searchQuery) return specificCrops[cropType] || []
    return (specificCrops[cropType] || []).filter(crop => 
      crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crop.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  // Check if there are unsaved changes
  const hasProfileChanges = () => {
    const originalFirstName = userProfile?.firstName || ''
    const originalLastName = userProfile?.lastName || ''
    const originalPicture = userProfile?.profilePicture || user?.photoURL || null
    const originalCrops = userProfile?.cropFarmer?.cropType || []
    const originalLivestock = userProfile?.livestock?.animals || []
    const originalSpecificCrops = userProfile?.onboarding?.specificCrops || []
    
    return (
      editFirstName !== originalFirstName ||
      editLastName !== originalLastName ||
      editProfilePicture !== null ||
      JSON.stringify(editCrops.sort()) !== JSON.stringify(originalCrops.sort()) ||
      JSON.stringify(editLivestock.sort()) !== JSON.stringify(originalLivestock.sort()) ||
      JSON.stringify(editSpecificCrops.sort()) !== JSON.stringify(originalSpecificCrops.sort())
    )
  }

  // Close Edit Profile Modal
  const closeEditProfileModal = () => {
    setShowEditProfileModal(false)
    setEditFirstName('')
    setEditLastName('')
    setEditProfilePicture(null)
    setEditProfilePicturePreview(null)
    setEditSpecificCrops([])
    setSearchQuery('')
    setEditProfileLoadingMessage('')
    // Restore background scrolling
    document.body.style.overflow = 'auto'
  }

  // Handle Cancel with confirmation
  const handleCancelEditProfile = () => {
    if (hasProfileChanges()) {
      setConfirmModalType('discard')
      setShowConfirmModal(true)
    } else {
      closeEditProfileModal()
    }
  }

  // Confirm discard changes
  const confirmDiscardChanges = async () => {
    setShowConfirmModal(false)
    setEditProfileLoading(true)
    setEditProfileLoadingMessage('Discarding changes...')
    await new Promise(resolve => setTimeout(resolve, 800))
    setEditProfileLoading(false)
    setEditProfileLoadingMessage('')
    closeEditProfileModal()
  }

  // Handle Profile Picture Selection
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditProfilePicture(file)
      setEditProfilePicturePreview(URL.createObjectURL(file))
    }
  }

  // Request to save changes with validation
  const requestSaveChanges = () => {
    // Validate first name and last name
    if (!editFirstName.trim()) {
      alert('Please enter your first name')
      return
    }
    
    if (!editLastName.trim()) {
      alert('Please enter your last name')
      return
    }
    
    // Validate crop types and specific crops for crop farmers
    if (userProfile?.role === 'crop_farmer') {
      if (editCrops.length === 0) {
        alert('Please select at least one crop type')
        return
      }
      
      if (editSpecificCrops.length === 0) {
        alert('Please select at least one specific crop')
        return
      }
    }
    
    // Validate livestock for livestock owners
    if (userProfile?.role === 'livestock_owner' && editLivestock.length === 0) {
      alert('Please select at least one livestock animal')
      return
    }
    
    setConfirmModalType('save')
    setShowConfirmModal(true)
  }

  // Save Crops Changes
  const saveCropsChanges = async () => {
    setEditCropsModalLoading(true)
    setEditCropsModalLoadingMessage('Saving crops...')

    try {
      console.log('🔄 Starting to save crops changes...')
      console.log('Edit crops:', editCrops)
      console.log('Edit specific crops:', editSpecificCrops)
      
      const userRef = doc(db, 'users', user.uid)
      
      // Use updateDoc for better control over nested fields
      const updateData = {
        updatedAt: new Date(),
        'cropFarmer.cropType': editCrops,
        'cropFarmer.specificCrops': editSpecificCrops,
        'onboarding.cropTypes': editCrops,
        'onboarding.specificCrops': editSpecificCrops
      }

      console.log('📝 Update data:', updateData)
      
      await updateDoc(userRef, updateData)
      console.log('✅ Crops saved to Firestore successfully')

      // Verify save by reading back the data
      const verifyDoc = await getDoc(userRef)
      if (verifyDoc.exists()) {
        const savedData = verifyDoc.data()
        console.log('🔍 Verification - saved cropFarmer:', savedData.cropFarmer)
        console.log('🔍 Verification - saved onboarding:', savedData.onboarding)
      }

      // Update local state
      setUserProfile(prev => {
        const updatedProfile = {
          ...prev,
          cropFarmer: { 
            ...prev.cropFarmer,
            cropType: editCrops, 
            specificCrops: editSpecificCrops 
          },
          onboarding: {
            ...prev.onboarding,
            cropTypes: editCrops,
            specificCrops: editSpecificCrops
          }
        }
        console.log('📊 Updated local profile state:', updatedProfile)
        return updatedProfile
      })

      setEditCropsModalLoading(false)
      closeEditCropsModal()
      showSuccessPopup('Crops updated successfully!')
      
      // Notify other components that crops have been updated
      window.dispatchEvent(new Event('cropsUpdated'))
    } catch (error) {
      console.error('❌ Error updating crops:', error)
      alert('Failed to update crops. Please try again.')
      setEditCropsModalLoading(false)
      setEditCropsModalLoadingMessage('')
    }
  }

  // Save Livestock Changes
  const saveLivestockChanges = async () => {
    if (editLivestock.length === 0) {
      alert('Please select at least one livestock animal')
      return
    }

    // Validate that each selected livestock type has at least one specific animal selected
    console.log('🔍 Validating livestock selection:')
    console.log('editLivestock:', editLivestock)
    console.log('editSpecificLivestockByType:', editSpecificLivestockByType)
    console.log('editSpecificLivestock:', editSpecificLivestock)
    
    for (const animalType of editLivestock) {
      if (animalType === 'others') {
        if (editSpecificLivestock.length === 0) {
          alert('Please select at least one specific animal for "Others"')
          return
        }
      } else {
        const specificAnimalsForType = editSpecificLivestockByType[animalType] || []
        console.log(`📝 Checking ${animalType}:`, specificAnimalsForType)
        if (specificAnimalsForType.length === 0) {
          // Get the display name for the animal type
          const animalNames = {
            'cattle': 'cattle',
            'poultry': 'poultry',
            'swine': 'swine',
            'goat': 'goat',
            'sheep': 'sheep',
            'rabbit': 'rabbit'
          }
          alert(`Please select at least one specific ${animalNames[animalType] || animalType} type`)
          return
        }
      }
    }

    setEditLivestockModalLoading(true)
    setEditLivestockModalLoadingMessage('Saving livestock...')

    try {
      console.log('🔄 Starting to save livestock changes...')
      console.log('Edit livestock:', editLivestock)
      console.log('Edit specific livestock by type:', editSpecificLivestockByType)
      console.log('Edit specific others:', editSpecificLivestock)
      
      // Combine all specific animals
      const allSpecificAnimals = [...editSpecificLivestock]
      Object.values(editSpecificLivestockByType).forEach(animals => {
        allSpecificAnimals.push(...animals)
      })
      
      console.log('🔍 Debug save:')
      console.log('- editSpecificLivestock:', editSpecificLivestock)
      console.log('- editSpecificLivestockByType:', editSpecificLivestockByType)
      console.log('- Combined allSpecificAnimals:', allSpecificAnimals)
      console.log('- Length of allSpecificAnimals:', allSpecificAnimals.length)
      
      const userRef = doc(db, 'users', user.uid)
      
      // Use updateDoc for better control over nested fields
      const updateData = {
        updatedAt: new Date(),
        'livestock.animals': editLivestock,
        'livestock.specificAnimals': allSpecificAnimals,
        'onboarding.livestockTypes': editLivestock,
        'onboarding.livestockTypesCompleted': true,
        'onboarding.livestockOnboardingCompleted': true
      }
      console.log('📝 Update data:', updateData)
      await updateDoc(userRef, updateData)
      
      // Update local state
      const updatedProfile = {
        ...userProfile,
        livestock: {
          animals: editLivestock,
          specificAnimals: allSpecificAnimals
        },
        onboarding: {
          ...userProfile.onboarding,
          livestockTypes: editLivestock,
          livestockTypesCompleted: true,
          livestockOnboardingCompleted: true
        }
      }
      setUserProfile(updatedProfile)
      
      // Clear search query
      setSearchQuery('')
      
      // Show success message
      showSuccessPopup('Livestock animals updated successfully!')
      
      // Notify other components that livestock has been updated
      window.dispatchEvent(new Event('livestockUpdated'))
      
      // Close modal
      closeEditLivestockModal()
    } catch (error) {
      console.error('❌ Error saving livestock changes:', error)
      showErrorPopup('Failed to save livestock changes. Please try again.')
    } finally {
      setEditLivestockModalLoading(false)
      setEditLivestockModalLoadingMessage('')
    }
  }
  const saveProfileChanges = async () => {
    setShowConfirmModal(false)
    setEditProfileLoading(true)
    setEditProfileLoadingMessage('Saving changes...')

    try {
      let profilePictureUrl = userProfile?.profilePicture || null

      // Upload new profile picture if selected
      if (editProfilePicture) {
        console.log('Uploading new profile picture...')
        profilePictureUrl = await uploadImageToFirebaseStorage(editProfilePicture, 'Images/Profile', user.uid)
        console.log('Profile picture uploaded:', profilePictureUrl)
      }

      // Update user document in Firebase (use setDoc with merge to create if doesn't exist)
      const userRef = doc(db, 'users', user.uid)
      const updateData = {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      }

      if (profilePictureUrl) {
        updateData.profilePicture = profilePictureUrl
      }

      // Add crops/livestock data based on user role
      if (userProfile?.role === 'crop_farmer') {
        updateData['cropFarmer.cropType'] = editCrops
        updateData['cropFarmer.specificCrops'] = editSpecificCrops
        updateData['onboarding.cropTypes'] = editCrops
        updateData['onboarding.specificCrops'] = editSpecificCrops
      } else if (userProfile?.role === 'livestock_owner') {
        updateData.livestock = {
          animals: editLivestock
        }
        updateData['onboarding.livestockTypes'] = editLivestock
      }

      await setDoc(userRef, updateData, { merge: true })
      console.log('Profile updated successfully')

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        profilePicture: profilePictureUrl,
        ...(userProfile?.role === 'crop_farmer' && { 
          cropFarmer: { cropType: editCrops, specificCrops: editSpecificCrops },
          onboarding: {
            ...prev.onboarding,
            cropTypes: editCrops,
            specificCrops: editSpecificCrops
          }
        }),
        ...(userProfile?.role === 'livestock_owner' && { 
          livestock: { animals: editLivestock },
          onboarding: {
            ...prev.onboarding,
            livestockTypes: editLivestock
          }
        })
      }))

      // Show done message briefly
      setEditProfileLoadingMessage('Done!')
      await new Promise(resolve => setTimeout(resolve, 500))

      closeEditProfileModal()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile: ' + error.message)
    } finally {
      setEditProfileLoading(false)
      setEditProfileLoadingMessage('')
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const seconds = Math.floor((new Date() - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return formatDate(timestamp)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Cover Photo */}
      <div className={styles.coverPhoto}>
        <div className={styles.coverGradient}></div>
      </div>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileHeaderContent}>
          {/* Profile Picture */}
          <div className={styles.profilePictureWrapper}>
            <div className={styles.profilePicture}>
              {userProfile?.profilePicture || user?.photoURL ? (
                <img src={userProfile?.profilePicture || user?.photoURL} alt="Profile" className={styles.profileImage} />
              ) : (
                <div className={styles.profileInitial}>
                  {userProfile?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className={styles.userInfo}>
            <h1 className={styles.userName}>
              {userProfile?.firstName && userProfile?.lastName
                ? `${userProfile.firstName} ${userProfile.lastName}`
                : user?.displayName || user?.email || 'User'}
            </h1>
            <p className={styles.userRole}>
              {userProfile?.role === 'livestock_owner' ? 'Livestock Owner' : 
               userProfile?.role === 'crop_farmer' ? 'Crop Farmer' : 'User'}
            </p>
            <div className={styles.userRating}>
              <span className={styles.ratingStars}>
                {'★'.repeat(Math.floor(userProfile?.averageRating || 0))}
                {'☆'.repeat(5 - Math.floor(userProfile?.averageRating || 0))}
              </span>
              <span className={styles.ratingValue}>
                {typeof userProfile?.averageRating === 'number' ? userProfile.averageRating.toFixed(1) : '0.0'}
              </span>
              <span className={styles.ratingCount}>
                ({userProfile?.totalRatings || 0} rating{(userProfile?.totalRatings || 0) !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button className={styles.editProfileButton} onClick={openEditProfileModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Edit Profile
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <aside className={styles.leftSidebar}>
          {/* Farming Info Card */}
          {userProfile && (
            <div className={styles.farmingInfoCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h2 className={styles.cardTitle}>
                  {userProfile.role === 'crop_farmer' ? 'Crops Grown' : 'Livestock Animals'}
                </h2>
                {userProfile.role === 'crop_farmer' && (
                  <button 
                    className={styles.editCropsBtn}
                    onClick={openEditCropsModal}
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      padding: '5px 15px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Edit
                  </button>
                )}
                {userProfile.role === 'livestock_owner' && (
                  <button 
                    className={styles.editCropsBtn}
                    onClick={openEditLivestockModal}
                    style={{
                      background: 'none',
                      border: '1px solid #ddd',
                      padding: '5px 15px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
              <div className={styles.farmingContent}>
                {userProfile.role === 'crop_farmer' ? (
                  (() => {
                    const userSpecificCrops = userProfile.onboarding?.specificCrops || userProfile.cropFarmer?.specificCrops || []
                    return userSpecificCrops.length > 0 ? (
                      <div className={styles.specificCropsContainer}>
                        {userSpecificCrops.map((cropId, index) => {
                        // Find the specific crop details
                        let cropDetails = null
                        let categoryName = ''
                        
                        // Search through all categories to find the specific crop
                        for (const [category, crops] of Object.entries(specificCrops)) {
                          const found = crops.find(c => c.id === cropId)
                          if (found) {
                            cropDetails = found
                            categoryName = cropTypes.find(ct => ct.id === category)?.name || category
                            break
                          }
                        }
                        
                        if (!cropDetails) return null
                        
                        return (
                          <div key={index} className={`${cropOnboardingStyles.specificCard} ${styles.profileCropButton}`}>
                            <h4 className={cropOnboardingStyles.optionTitle}>{cropDetails.name}</h4>
                            <p className={cropOnboardingStyles.optionTagalog}>{cropDetails.tagalog}</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className={styles.noItems}>No crops added yet</p>
                  )
                  })()
                ) : (
                  userProfile.livestock?.specificAnimals && userProfile.livestock.specificAnimals.length > 0 ? (
                    <div className={styles.itemsGrid}>
                      {userProfile.livestock.specificAnimals.map((animalId, index) => {
                        const specificAnimalInfo = getSpecificAnimalDisplayInfo(animalId);
                        return (
                          <div key={index} className={styles.itemChip}>
                            <span className={styles.itemName}>{specificAnimalInfo.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.noItems}>No livestock added yet</p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Intro Card */}
          <div className={styles.introCard}>
            <h2 className={styles.cardTitle}>Intro</h2>
            <div className={styles.introContent}>
              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Email</p>
                  <p className={styles.introValue}>{user?.email || 'Not provided'}</p>
                </div>
              </div>

              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Phone Number</p>
                  <p className={styles.introValue}>{userProfile?.phoneNumber || 'Not provided'}</p>
                </div>
              </div>

              <div className={styles.introItem}>
                <svg className={styles.introIcon} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                </svg>
                <div>
                  <p className={styles.introLabel}>Joined</p>
                  <p className={styles.introValue}>
                    {userProfile?.createdAt 
                      ? (userProfile.createdAt.toDate 
                          ? userProfile.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
                      : 'Recently joined'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className={styles.statsCard}>
            <h2 className={styles.cardTitle}>Activity</h2>
            <div className={styles.statsContent}>
              {userProfile?.role === 'livestock_owner' ? (
                <>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{listings.length}</p>
                    <p className={styles.statLabel}>Listings</p>
                  </div>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{posts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{requestCount}</p>
                    <p className={styles.statLabel}>Requests</p>
                  </div>
                  <div className={styles.statItem}>
                    <p className={styles.statNumber}>{posts.length}</p>
                    <p className={styles.statLabel}>Posts</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <main className={styles.rightContent}>
          {/* Posts Title */}
          <h2 className={styles.postsTitle}>Posts</h2>

          {/* Posts Display */}
          {posts.length === 0 ? (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
              <h3>No posts yet</h3>
              <p>When you create posts, they will appear here</p>
            </div>
          ) : (
            <>
              {/* Hidden Posts Container - Collapsible */}
              {posts.filter(post => post.reportVerdict === 'VALID').length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div 
                    onClick={() => setShowHiddenPosts(!showHiddenPosts)}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: showHiddenPosts ? '0.5rem' : '0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                      <span style={{ fontWeight: '600', color: '#856404' }}>
                        Hidden Posts ({posts.filter(post => post.reportVerdict === 'VALID').length})
                      </span>
                    </div>
                    <span style={{ fontSize: '1.2rem', color: '#856404' }}>
                      {showHiddenPosts ? '▼' : '▶'}
                    </span>
                  </div>
                  
                  {showHiddenPosts && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#fff9e6',
                      border: '1px solid #ffc107',
                      borderTop: 'none',
                      borderRadius: '0 0 8px 8px'
                    }}>
                      <p style={{ 
                        fontSize: '0.9rem', 
                        color: '#856404', 
                        marginBottom: '1rem',
                        fontStyle: 'italic'
                      }}>
                        These posts were hidden due to reports. They are only visible to you.
                      </p>
                      {posts.filter(post => post.reportVerdict === 'VALID').map((post) => (
                        <div key={post.id} style={{ opacity: 0.5, marginBottom: '1rem' }}>
                          <div className={styles.post}>
                            <div className={styles.postHeader}>
                              <div className={styles.postAvatar}>
                                {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className={styles.postInfo}>
                                <h4 className={styles.postAuthor}>
                                  {userProfile?.firstName && userProfile?.lastName
                                    ? `${userProfile.firstName} ${userProfile.lastName}`
                                    : user?.displayName || 'User'}
                                </h4>
                                <span className={styles.postTime}>
                                  {formatTimeAgo(post.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className={styles.postContent}>
                              {post.text && <p className={styles.postText}>{post.text}</p>}
                              {(post.imageUrls?.length > 0 || post.images?.length > 0 || post.imageUrl) && (
                                <div className={styles.postImages}>
                                  {(post.imageUrls || post.images || (post.imageUrl ? [post.imageUrl] : [])).map((image, index) => (
                                    <img key={index} src={image} alt={`Post image ${index + 1}`} className={styles.postImage} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Regular Posts */}
              <div className={styles.postsListView}>
              {posts.filter(post => post.reportVerdict !== 'VALID').map((post) => (
                  <div key={post.id} className={styles.post}>
                    <div className={styles.postHeader}>
                      <div className={styles.postAvatar}>
                        {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className={styles.postInfo}>
                        <h4 className={styles.postAuthor}>
                          {userProfile?.firstName && userProfile?.lastName
                            ? `${userProfile.firstName} ${userProfile.lastName}`
                            : user?.displayName || 'User'}
                        </h4>
                        <span className={styles.postTime}>
                          {formatTimeAgo(post.createdAt)}
                          {post.editedAt && <span className={styles.edited}> (edited)</span>}
                        </span>
                      </div>
                      {/* 3-dot menu */}
                      <div className={styles.postOptions}>
                        <button 
                          className={styles.optionsBtn}
                          onClick={() => toggleDropdown(post.id)}
                        >
                          <img src="/assets/icons/menu-dots.png" alt="Options" className={styles.optionsIcon} />
                        </button>
                        {showDropdown === post.id && (
                          <div className={styles.dropdown}>
                            <button onClick={() => handleEditPost(post)} className={styles.dropdownItem}>
                              <img src="/assets/icons/pencil.png" alt="Edit" className={styles.dropdownIcon} />
                              Edit Post
                            </button>
                            <button onClick={() => handleDeletePost(post.id)} className={`${styles.dropdownItem} ${styles.deleteItem}`}>
                              <img src="/assets/icons/delete-white.png" alt="Delete" className={styles.dropdownIcon} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.postContent}>
                      {post.text && (
                        <p className={styles.postText}>{post.text}</p>
                      )}

                      {/* Support imageUrls array, images array, or single imageUrl */}
                      {(post.imageUrls?.length > 0 || post.images?.length > 0 || post.imageUrl) && (
                        <div className={styles.postImages}>
                          {(post.imageUrls || post.images || (post.imageUrl ? [post.imageUrl] : [])).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`Post image ${index + 1}`}
                              className={styles.postImage}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post Stats */}
                    <div className={styles.postStats}>
                      <span>{post.likes || 0} likes</span>
                      <span>{post.comments?.length || 0} comments</span>
                    </div>

                    <div className={styles.postSeparator}></div>

                    {/* Post Actions */}
                    <div className={styles.postActions}>
                      <button 
                        className={`${styles.actionBtn} ${hasUserLiked(post) ? styles.liked : ''}`}
                        onClick={() => handleLikePost(post)}
                      >
                        <img 
                          src={hasUserLiked(post) ? "/assets/icons/red-heart.png" : "/assets/icons/heart.png"} 
                          alt="Like" 
                          className={styles.actionIcon} 
                        />
                        {hasUserLiked(post) ? 'Liked' : 'Like'}
                      </button>
                      <button className={styles.actionBtn}>
                        <img src="/assets/icons/comment-all-dots.png" alt="Comment" className={styles.actionIcon} />
                        Comment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Post Modal - Using dashboard styles for consistency */}
      {showEditModal && editingPost && (
        <div className={dashboardStyles.modalOverlay} onClick={closeEditModal}>
          <div className={dashboardStyles.postModal} onClick={(e) => e.stopPropagation()}>
            <div className={dashboardStyles.modalHeader}>
              <h3>Edit Post</h3>
              <button onClick={closeEditModal} className={dashboardStyles.closeModalBtn}>×</button>
            </div>
            
            <div className={dashboardStyles.modalContent}>
              <div className={dashboardStyles.modalUserInfo}>
                <div className={dashboardStyles.modalUserAvatar}>
                  {userProfile?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className={dashboardStyles.modalUserName}>
                  {userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : user?.displayName || 'User'}
                </span>
              </div>
              
              <div className={dashboardStyles.modalBody}>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="What's on your mind?"
                  className={dashboardStyles.modalTextarea}
                  rows={4}
                  autoFocus
                />
              </div>
              
              <div className={dashboardStyles.modalFooter}>
                <div className={dashboardStyles.modalActions}>
                  {editImagePreviews.length > 0 ? (
                    <div className={dashboardStyles.multipleImagePreview}>
                      {editImagePreviews.map((preview, index) => (
                        <div key={index} className={dashboardStyles.previewImageContainer}>
                          <img src={preview} alt={`Preview ${index + 1}`} className={dashboardStyles.buttonPreviewImage} />
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeEditImage(index)
                            }}
                            className={dashboardStyles.removeImageBtn}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      <label className={dashboardStyles.addMoreImagesBtn}>
                        <img src="/assets/icons/image.png" alt="Photo" className={dashboardStyles.modalActionIcon} />
                        Add More
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className={dashboardStyles.hiddenInput}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className={dashboardStyles.modalImageUpload}>
                      <img src="/assets/icons/image.png" alt="Photo" className={dashboardStyles.modalActionIcon} />
                      Add Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageSelect}
                        className={dashboardStyles.hiddenInput}
                      />
                    </label>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeEditModal}
                    className={dashboardStyles.cancelBtn}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEditedPost}
                    disabled={editLoading || (!editText.trim() && editImagePreviews.length === 0)}
                    className={dashboardStyles.modalPostButton}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className={styles.modalOverlay} onClick={closeEditProfileModal}>
          <div className={styles.editProfileModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.editProfileHeader}>
              <h2>Edit Profile</h2>
              <button className={styles.closeModalBtn} onClick={closeEditProfileModal}>×</button>
            </div>
            
            <div className={styles.editProfileContent}>
              {/* Profile Picture and Name Section */}
              <div className={styles.editProfilePictureNameSection}>
                <div className={styles.editProfilePictureContainer}>
                  <div className={styles.editProfilePicturePreview}>
                    {editProfilePicturePreview ? (
                      <img src={editProfilePicturePreview} alt="Profile Preview" />
                    ) : (
                      <div className={styles.editProfileInitial}>
                        {editFirstName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <label className={styles.changePhotoBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/>
                    </svg>
                    Change Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div className={styles.editProfileNameFields}>
                  <div className={styles.editProfileField}>
                    <label>First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className={styles.editProfileField}>
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons or Loading State */}
              {editProfileLoading ? (
                <div className={styles.editProfileLoadingState}>
                  <div className={styles.editProfileSpinner}></div>
                  <p>{editProfileLoadingMessage}</p>
                </div>
              ) : (
                <div className={styles.editProfileActions}>
                  <button className={styles.cancelProfileBtn} onClick={handleCancelEditProfile}>
                    Cancel
                  </button>
                  <button 
                    className={styles.saveProfileBtn} 
                    onClick={requestSaveChanges}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className={styles.confirmModalOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmModalIcon}>
              {confirmModalType === 'save' ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#fa9100"/>
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#fa9100"/>
                </svg>
              )}
            </div>
            <h3 className={styles.confirmModalTitle}>
              {confirmModalType === 'save' ? 'Save Changes?' : 'Discard Changes?'}
            </h3>
            <p className={styles.confirmModalText}>
              {confirmModalType === 'save' 
                ? 'Are you sure you want to save your profile changes?' 
                : 'Are you sure you want to discard all changes?'}
            </p>
            <div className={styles.confirmModalActions}>
              <button 
                className={styles.confirmModalCancelBtn}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.confirmModalConfirmBtn}
                onClick={confirmModalType === 'save' ? saveProfileChanges : confirmDiscardChanges}
              >
                {confirmModalType === 'save' ? 'Save' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crops Editing Popup */}
      {showCropsPopup && (
        <div className={styles.popupOverlay}>
          <div className={`${styles.popup} ${styles.cropsPopup}`}>
            <div className={styles.popupHeader}>
              <h2>Edit Crops Grown</h2>
              <button 
                className={styles.closePopupBtn}
                onClick={closeEditCropsModal}
              >
                ×
              </button>
            </div>

            <div className={styles.popupContent}>
              {/* Column 1 - Crop Categories */}
              <div className={styles.cropCategoriesColumn}>
                <div className={styles.popupSection}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                    <label>Crop Categories</label>
                    {editCrops.length === 0 && (
                      <p className={styles.validationError} style={{ margin: 0, fontSize: '12px' }}>Please select at least one category</p>
                    )}
                  </div>
                  <div className={styles.selectionGrid}>
                    {cropTypes.map(crop => (
                      <button
                        key={crop.id}
                        type="button"
                        className={`${styles.cropCategoryButton} ${editCrops.includes(crop.id) ? styles.selected : ''}`}
                        onClick={() => {
                          const isCurrentlySelected = editCrops.includes(crop.id)
                          setEditCrops(prev => 
                            prev.includes(crop.id) 
                              ? prev.filter(id => id !== crop.id)
                              : [...prev, crop.id]
                          )
                          // Clear specific crops when category is removed
                          if (isCurrentlySelected) {
                            const actualCropType = crop.id === 'spices' ? 'herbs_spices' : crop.id
                            const categoryCrops = specificCrops[actualCropType] || []
                            setEditSpecificCrops(prev => 
                              prev.filter(id => !categoryCrops.some(c => c.id === id))
                            )
                          }
                        }}
                      >
                        {crop.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2 - Specific Crops */}
              <div className={styles.specificCropsColumn}>
                {editCrops.length > 0 && (
                  <div className={styles.popupSection}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <label>Specific Crops</label>
                      {editSpecificCrops.length === 0 && (
                        <p className={styles.validationError} style={{ margin: 0, fontSize: '12px' }}>Please select at least one specific crop</p>
                      )}
                    </div>
                    
                    {/* Search Bar */}
                    <div className={styles.searchBarContainer}>
                      <input
                        type="text"
                        placeholder="Search specific crops..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                      />
                      {searchQuery && (
                        <button 
                          className={styles.clearSearchBtn}
                          onClick={() => setSearchQuery('')}
                        >
                          ×
                        </button>
                      )}
                    </div>
                    
                    <div className={styles.specificCropsContainer}>
                      {editCrops.map(cropType => {
                        // Handle the combined herbs_spices category
                        const actualCropType = cropType === 'spices' ? 'herbs_spices' : cropType
                        const crop = cropTypes.find(c => c.id === cropType)
                        const categoryCrops = specificCrops[actualCropType]?.filter(specificCrop => 
                          specificCrop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          specificCrop.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
                        ) || []
                        
                        // Remove duplicates by name
                        const uniqueCategoryCrops = categoryCrops.filter((crop, index, self) => 
                          index === self.findIndex((c) => c.name === crop.name)
                        )
                        
                        return (
                          <div key={cropType} className={styles.specificCropCategory}>
                            <div className={styles.categoryHeader}>
                              <h4 className={styles.specificCropCategoryTitle}>{crop.name}</h4>
                              <button
                                type="button"
                                className={styles.selectAllBtn}
                                onClick={() => {
                                  const categoryCropIds = uniqueCategoryCrops.map(c => c.id)
                                  const allSelected = categoryCropIds.every(id => editSpecificCrops.includes(id))
                                  
                                  if (allSelected) {
                                    // Deselect all in this category
                                    setEditSpecificCrops(prev => 
                                      prev.filter(id => !categoryCropIds.includes(id))
                                    )
                                  } else {
                                    // Select all in this category
                                    setEditSpecificCrops(prev => 
                                      [...new Set([...prev, ...categoryCropIds])]
                                    )
                                  }
                                }}
                              >
                                {uniqueCategoryCrops.every(id => editSpecificCrops.includes(id)) ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            <div className={styles.specificOptionsGrid}>
                              {uniqueCategoryCrops.map(specificCrop => (
                                <div 
                                  key={specificCrop.id} 
                                  className={`${cropOnboardingStyles.specificCard} ${styles.profileCropButton} ${editSpecificCrops.includes(specificCrop.id) ? cropOnboardingStyles.selected : ''}`}
                                  onClick={() => handleSpecificCropSelect(specificCrop.id)}
                                >
                                  <h4 className={cropOnboardingStyles.optionTitle}>{specificCrop.name}</h4>
                                  <p className={cropOnboardingStyles.optionTagalog}>{specificCrop.tagalog}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.popupActions}>
              <button className={styles.cancelPopupBtn} onClick={closeEditCropsModal}>
                Cancel
              </button>
              <button 
                className={styles.savePopupBtn} 
                onClick={saveCropsChanges}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Livestock Editing Popup */}
      {showLivestockPopup && (
        <div className={styles.popupOverlay}>
          <div className={`${styles.popup} ${styles.livestockPopup}`}>
            <div className={styles.popupHeader}>
              <h2>Edit Livestock Animals</h2>
              <button 
                className={styles.closePopupBtn}
                onClick={closeEditLivestockModal}
              >
                ×
              </button>
            </div>

            <div className={styles.popupContent}>
              <div className={styles.popupSection}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <label>Livestock Animals</label>
                  {editLivestock.length === 0 && (
                    <p className={styles.validationError} style={{ margin: 0, fontSize: '12px' }}>Please select at least one animal</p>
                  )}
                </div>
                <div className={styles.selectionGrid}>
                  {[
                    { id: 'cattle', name: 'Cattle', icon: '/assets/images/cattle.png' },
                    { id: 'poultry', name: 'Poultry', icon: '/assets/images/chicken.png' },
                    { id: 'swine', name: 'Swine', icon: '/assets/images/swine.png' },
                    { id: 'goat', name: 'Goats', icon: '/assets/images/goat.png' },
                    { id: 'sheep', name: 'Sheep', icon: '/assets/images/sheep.png' },
                    { id: 'rabbit', name: 'Rabbits', icon: '/assets/images/rabbit.png' },
                    { id: 'others', name: 'Others', icon: '/assets/images/livestock.png' }
                  ].map(animal => (
                    <button
                      key={animal.id}
                      type="button"
                      className={`${styles.selectionButton} ${editLivestock.includes(animal.id) ? styles.selected : ''}`}
                      onClick={() => {
                        const isCurrentlySelected = editLivestock.includes(animal.id)
                        setEditLivestock(prev => 
                          prev.includes(animal.id) 
                            ? prev.filter(id => id !== animal.id)
                            : [...prev, animal.id]
                        )
                        // Clear specific livestock when type is removed (check old state)
                        if (isCurrentlySelected) {
                          console.log(`🗑️ Unselecting animal type: ${animal.id}`)
                          if (animal.id === 'others') {
                            console.log('Clearing all "others" specific animals')
                            setEditSpecificLivestock([])
                          } else {
                            console.log(`Clearing specific animals for type: ${animal.id}`)
                            setEditSpecificLivestockByType(prev => {
                              const newState = { ...prev }
                              console.log(`Before delete, ${animal.id} had:`, newState[animal.id])
                              delete newState[animal.id]
                              console.log('After delete:', newState)
                              return newState
                            })
                          }
                        }
                      }}
                    >
                      <img src={animal.icon} alt={animal.name} className={styles.selectionIcon} />
                      <span>{animal.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Show specific animals for each selected type */}
              {editLivestock.map(animalType => {
                if (animalType === 'others') {
                  return (
                    <div key={animalType} className={styles.popupSection} style={{ marginTop: '20px' }}>
                      <label>Specify Other Animals</label>
                      <div className={styles.specificOptionsGrid}>
                        {specificAnimals.others.map(animal => (
                          <div 
                            key={animal.id} 
                            className={`${styles.specificCard} ${editSpecificLivestock.includes(animal.id) ? styles.selected : ''}`}
                            onClick={() => {
                              setEditSpecificLivestock(prev => 
                                prev.includes(animal.id) 
                                  ? prev.filter(id => id !== animal.id)
                                  : [...prev, animal.id]
                              )
                            }}
                          >
                            <h4 className={styles.optionTitle}>{animal.name}</h4>
                            <p className={styles.optionTagalog}>{animal.tagalog}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                }
                
                const specificOptions = specificAnimals[animalType]
                if (!specificOptions || specificOptions.length === 0) return null
                
                return (
                  <div key={animalType} className={styles.popupSection} style={{ marginTop: '20px' }}>
                    <label>Specify {animalType.charAt(0).toUpperCase() + animalType.slice(1)} Types</label>
                    <div className={styles.specificOptionsGrid}>
                      {specificOptions.map(animal => (
                        <div 
                          key={animal.id} 
                          className={`${styles.specificCard} ${(editSpecificLivestockByType[animalType] || []).includes(animal.id) ? styles.selected : ''}`}
                          onClick={() => {
                            setEditSpecificLivestockByType(prev => ({
                              ...prev,
                              [animalType]: prev[animalType]?.includes(animal.id)
                                ? prev[animalType].filter(id => id !== animal.id)
                                : [...(prev[animalType] || []), animal.id]
                            }))
                          }}
                        >
                          <h4 className={styles.optionTitle}>{animal.name}</h4>
                          <p className={styles.optionTagalog}>{animal.tagalog}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className={styles.popupActions}>
              <button className={styles.cancelPopupBtn} onClick={closeEditLivestockModal}>
                Cancel
              </button>
              <button 
                className={styles.savePopupBtn} 
                onClick={saveLivestockChanges}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
