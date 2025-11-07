import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'

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

async function checkBoxes() {
  try {
    const q = query(collection(db, 'boxes'), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    const boxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

    console.log(`Found ${boxes.length} boxes total:`)
    boxes.forEach(box => {
      console.log(`- ID: ${box.id}`)
      console.log(`  Name: ${box.name}`)
      console.log(`  Status: "${box.status}"`)
      console.log(`  Deleted: ${!!box.deletedAt}`)
      console.log(`  Created: ${box.createdAt}`)
      console.log('---')
    })
  } catch (error) {
    console.error('Error checking boxes:', error)
  }
}

checkBoxes()