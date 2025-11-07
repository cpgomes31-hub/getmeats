import fs from 'fs'
import path from 'path'
import process from 'process'

// Simple .env parser (no dependency)
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eq = trimmed.indexOf('=')
    if (eq === -1) return
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    // strip optional surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  })
}

// Try load .env.local or .env
loadEnv(path.resolve(process.cwd(), '.env.local'))
loadEnv(path.resolve(process.cwd(), '.env'))

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

if (!firebaseConfig.projectId) {
  console.error('Missing Firebase config in environment. Aborting.')
  process.exit(2)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function findOrphanPurchases() {
  const snapshot = await getDocs(collection(db, 'purchases'))
  const results = []
  for (const docSnap of snapshot.docs) {
    const purchase = { id: docSnap.id, ...docSnap.data() }
    const boxId = purchase.boxId
    if (!boxId) {
      results.push({ id: docSnap.id, reason: 'missing boxId', purchase })
      continue
    }
    const boxRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxRef)
    if (!boxSnap.exists()) {
      results.push({ id: docSnap.id, boxId, reason: 'box-not-found', purchase })
    }
  }
  return results
}

async function run() {
  const args = process.argv.slice(2)
  const doDelete = args.includes('--delete')
  const dryRun = args.includes('--dry-run') || !doDelete

  console.log('Running cleanup-orphan-purchases', { dryRun, doDelete })

  try {
    const orphans = await findOrphanPurchases()
    console.log(`Found ${orphans.length} orphan purchases.`)
    if (orphans.length === 0) process.exit(0)

    orphans.forEach(o => {
      console.log(`- id=${o.id} boxId=${o.boxId || '[none]'} reason=${o.reason}`)
    })

    if (dryRun) {
      console.log('\nDry-run mode: no deletions performed. To delete, run with --delete')
      process.exit(0)
    }

    // Confirm again via stdin
    if (!doDelete) {
      console.log('No --delete flag present, aborting to be safe.')
      process.exit(0)
    }

    console.log('Deleting orphan purchases...')
    for (const o of orphans) {
      try {
        await deleteDoc(doc(db, 'purchases', o.id))
        console.log(`Deleted purchase ${o.id}`)
      } catch (err) {
        console.error(`Failed to delete ${o.id}:`, err)
      }
    }

    console.log('Done.')
    process.exit(0)
  } catch (err) {
    console.error('Error during cleanup:', err)
    process.exit(1)
  }
}

run()
