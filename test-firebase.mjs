// Simple test to check Firebase connection and boxes query
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAyePBbzKcAuASi5U4uz8pkqgCG92ecHIg",
  authDomain: "getmeats.firebaseapp.com",
  projectId: "getmeats",
  storageBucket: "getmeats.appspot.com",
  messagingSenderId: "448977262837",
  appId: "1:448977262837:web:ee792526b6ac636a3b8dbc"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testFirebase() {
  try {
    console.log('Testing Firebase connection...')
    const boxesRef = collection(db, 'boxes')
    const snapshot = await getDocs(boxesRef)
    console.log(`Found ${snapshot.size} boxes:`)
    snapshot.forEach((doc) => {
      console.log(`- ID: ${doc.id}`, doc.data())
    })
  } catch (error) {
    console.error('Firebase test failed:', error)
  }
}

testFirebase()