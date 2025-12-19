import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { auth, db } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import StepIndicator from '../components/StepIndicator'
import styles from '../../styles/modules/crop-onboarding.module.css'

export default function CropOnboarding() {
  const [currentStep, setCurrentStep] = useState(1) // Step 1: Crop selection, Step 2: Specific crops
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [selectedCrops, setSelectedCrops] = useState([])
  const [selectedSpecificCrops, setSelectedSpecificCrops] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

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
      { id: 'sweet-corn', name: 'Sweet corn', tagalog: 'Mais matamis' },
      { id: 'white-corn', name: 'White corn', tagalog: 'Mais puti' },
      { id: 'yellow-corn', name: 'Yellow corn', tagalog: 'Mais dilaw' },
      { id: 'purple-corn', name: 'Purple corn', tagalog: 'Mais ube' },
      { id: 'popcorn', name: 'Popcorn', tagalog: 'Popcorn' },
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
    ]
  }


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        
        // Verify user role and onboarding status
        try {
          const userDocRef = doc(db, 'Users', currentUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const onboarding = userData.onboarding || {}
            
            // If user hasn't selected crop farmer role, redirect to role selection
            if (userData.role !== 'crop_farmer') {
              router.push('/role-selection')
              return
            }

            // If user already completed crop onboarding, redirect to dashboard
            if (onboarding.cropOnboardingCompleted) {
              router.push('/dashboard')
              return
            }
          }
        } catch (err) {
          console.error('Error fetching user data:', err)
        }
      } else {
        // Redirect to signin if not authenticated
        router.push('/signin')
      }
    })

    return () => unsubscribe()
  }, [router])

  const showErrorToast = (message) => {
    setError(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
    }, 5000)
  }

  const dismissToast = () => {
    setShowToast(false)
  }

  const handleCropSelect = (cropId) => {
    setSelectedCrops(prev => {
      if (prev.includes(cropId)) {
        return prev.filter(id => id !== cropId)
      } else {
        return [...prev, cropId]
      }
    })
    // Clear specific crops when changing crop types
    setSelectedSpecificCrops([])
  }

  const handleSpecificCropSelect = (cropId) => {
    setSelectedSpecificCrops(prev => {
      if (prev.includes(cropId)) {
        return prev.filter(id => id !== cropId)
      } else {
        return [...prev, cropId]
      }
    })
  }


  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedCrops.length === 0) {
        showErrorToast('Please select at least one type of crop you grow')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (selectedSpecificCrops.length === 0) {
        showErrorToast('Please select at least one specific crop')
        return
      }
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep === 1) {
      router.push('/location-permission')
    } else {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)

    try {
      // Update user profile with crop farming information matching mobile app structure
      console.log('Saving onboarding data...')
      console.log('selectedCrops:', selectedCrops)
      console.log('selectedSpecificCrops:', selectedSpecificCrops)
      const userDocRef = doc(db, 'Users', user.uid)
      await updateDoc(userDocRef, {
        role: 'crop_farmer',
        cropFarmer: {
          cropType: selectedCrops,
          specificCrops: selectedSpecificCrops
        },
        'onboarding.cropTypes': selectedCrops,
        'onboarding.specificCrops': selectedSpecificCrops,
        'onboarding.cropTypesCompleted': true,
        'onboarding.cropOnboardingCompleted': true,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date()
      })

      // Dispatch event to notify profile page of role change
      window.dispatchEvent(new Event('roleChanged'))
      console.log('✅ Role change event dispatched')

      // Navigate to completion screen
      router.push('/onboarding-complete')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      showErrorToast('Failed to save your information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Filter crops based on search query
  const filteredCrops = cropTypes.filter(crop =>
    crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crop.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get all specific crops for selected crop types
  const getAllSpecificCrops = () => {
    let allSpecific = []
    selectedCrops.forEach(cropType => {
      // Handle the spices/herbs_spices mapping
      const actualCropType = cropType === 'spices' ? 'herbs_spices' : cropType
      if (specificCrops[actualCropType]) {
        allSpecific = [...allSpecific, ...specificCrops[actualCropType]]
      }
    })
    return allSpecific
  }

  // Filter specific crops based on search query
  const filteredSpecificCrops = getAllSpecificCrops().filter(crop =>
    crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    crop.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Crop Farm Setup | AgriLink PH</title>
        <meta name="description" content="Tell us about your crop farming operation" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css" />
      </Head>

      <div className={`${styles.container} ${currentStep === 2 ? styles.step2Container : ''}`}>
        <div className={styles.backgroundPattern}></div>
        
        <div className={styles.content}>
          <div className={styles.topBar}>
            <button className={styles.backButton} onClick={handleBack}>
              <i className="fas fa-arrow-left"></i>
              Back
            </button>
            <StepIndicator currentStep={currentStep + 1} totalSteps={2} variant="dots" />
            <img 
              src="/assets/images/AgrilinkLogo.png" 
              alt="AgriLink Logo" 
              className={styles.logo}
            />
          </div>
          
          <div className={`${styles.mainContent} ${currentStep === 2 ? styles.step2Layout : ''}`}>
            {/* Step 1: Crop Type Selection */}
            {currentStep === 1 && (
              <>
                <div className={styles.leftSection}>
                  <h1 className={styles.title}>
                    What <span style={{ color: '#2d5a27' }}>Crops</span><br />do you grow?
                  </h1>
                  
                  <p className={styles.subtitle}>
                    Select the crops you grow so <br />we can  connect you with <br />relevant livestock <br />owners and tailored <br />opportunities.
                  </p>
                </div>
                
                <div className={styles.rightSection}>
                  <div className={styles.optionsGrid}>
                    {cropTypes.map((crop) => (
                      <div
                        key={crop.id}
                        className={`${styles.optionCard} ${selectedCrops.includes(crop.id) ? styles.selected : ''}`}
                        onClick={() => handleCropSelect(crop.id)}
                      >
                        <div className={styles.optionIcon}>
                          <img 
                            src={crop.icon} 
                            alt={crop.name} 
                            className={styles.cropIcon} 
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.innerHTML = '<i class="fas fa-seedling" style="font-size: 2.5rem; color: #2d5a27;"></i>'
                            }}
                          />
                        </div>
                        <h3 className={styles.optionTitle}>{crop.name}</h3>
                        <p className={styles.optionDescription}>{crop.description}</p>
                        <div className={styles.selectIndicator}>
                          <i className="fas fa-check-circle"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Specific Crop Selection */}
            {currentStep === 2 && (
              <>
                <div className={styles.topSection}>
                  <div className={styles.titleRow}>
                    <h1 className={styles.title}>
                      Select <span style={{ color: '#2d5a27' }}>Specific Crops</span>
                    </h1>
                    <div className={styles.searchContainer}>
                      <div className={styles.searchBox}>
                        <i className="fas fa-search"></i>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <p className={styles.subtitle}>
                    Choose the specific crops you grow from your selected categories.
                  </p>
                </div>
                
                <div className={styles.bottomSection}>
                  <div className={styles.scrollableContainer}>
                    {/* Render crops by categories */}
                    {selectedCrops.map(cropType => {
                      const crop = cropTypes.find(c => c.id === cropType)
                      // Handle the spices/herbs_spices mapping
                      const actualCropType = cropType === 'spices' ? 'herbs_spices' : cropType
                      const filteredCrops = specificCrops[actualCropType]?.filter((specificCrop) =>
                        specificCrop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        specificCrop.tagalog.toLowerCase().includes(searchQuery.toLowerCase())
                      ) || []
                      
                      if (filteredCrops.length === 0 && searchQuery) return null
                      
                      return (
                        <div key={cropType} className={styles.categorySection}>
                          <h4 className={styles.categoryTitle}>{crop.name}</h4>
                          <div className={styles.specificOptionsGrid}>
                            {filteredCrops.map((specificCrop) => (
                              <div
                                key={specificCrop.id}
                                className={`${styles.optionCard} ${styles.specificCard} ${selectedSpecificCrops.includes(specificCrop.id) ? styles.selected : ''}`}
                                onClick={() => handleSpecificCropSelect(specificCrop.id)}
                              >
                                <h4 className={styles.optionTitle}>{specificCrop.name}</h4>
                                <p className={styles.optionTagalog}>{specificCrop.tagalog}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button className={styles.nextButton} onClick={handleNext}>
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
            <i className={`fas fa-exclamation-circle ${styles.toastIcon}`}></i>
            <span className={styles.toastMessage}>{error}</span>
            <button className={styles.toastClose} onClick={dismissToast}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
