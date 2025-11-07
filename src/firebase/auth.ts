import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDoc, connectFirestoreEmulator } from 'firebase/firestore'
import { app } from './config'

const auth = getAuth(app)
const db = getFirestore(app)

// Uncomment these lines if you want to use Firebase emulators locally
// connectAuthEmulator(auth, "http://localhost:9099")
// connectFirestoreEmulator(db, 'localhost', 8080)

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  // create user doc if missing
  if (result.user) await ensureUserDoc(result.user)
  return result.user
}

export async function signInWithEmail(email: string, password: string) {
  const res = await signInWithEmailAndPassword(auth, email, password)
  if (res.user) await ensureUserDoc(res.user)
  return res.user
}

export async function registerWithEmail(email: string, password: string) {
  const res = await createUserWithEmailAndPassword(auth, email, password)
  if (res.user) await ensureUserDoc(res.user)
  return res.user
}

export function logout() {
  return signOut(auth)
}

export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

async function ensureUserDoc(user: User) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const userData = {
      uid: user.uid,
      email: user.email || null,
      name: user.displayName || null,
      createdAt: new Date().toISOString(),
      profileCompleted: false,
    }
    await setDoc(ref, userData)
  }
}

export async function saveUserProfile(uid: string, profile: any) {
  const ref = doc(db, 'users', uid)
  await setDoc(ref, { ...profile, profileCompleted: true }, { merge: true })
}

export async function getUserProfile(uid: string) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export { auth }
