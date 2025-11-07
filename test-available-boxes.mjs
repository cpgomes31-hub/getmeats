import { getAvailableBoxes } from './src/firebase/boxes.js'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAyePBbzKcAuASi5U4uz8pkqgCG92ecHIg",
  authDomain: "getmeats.firebaseapp.com",
  projectId: "getmeats",
  storageBucket: "getmeats.appspot.com",
  messagingSenderId: "448977262837",
  appId: "1:448977262837:web:ee792526b6ac636a3b8dbc"
}

const app = initializeApp(firebaseConfig)

async function testGetAvailableBoxes() {
  try {
    console.log('Testing getAvailableBoxes...')
    const boxes = await getAvailableBoxes()
    console.log(`Found ${boxes.length} available boxes:`)
    boxes.forEach(box => {
      console.log(`- ${box.name} (status: "${box.status}")`)
    })
  } catch (error) {
    console.error('Error:', error)
  }
}

testGetAvailableBoxes()