import { collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from './config'
import { MeatBox, Purchase } from '../types'

const db = getFirestore(app)

export async function deleteBox(boxId: string): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await updateDoc(docRef, {
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function restoreBox(boxId: string): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await updateDoc(docRef, {
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  })
}

export async function permanentlyDeleteBox(boxId: string): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await deleteDoc(docRef)
}

export async function getAllBoxes(includeDeleted: boolean = false): Promise<MeatBox[]> {
  const q = query(collection(db, 'boxes'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  const allBoxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeatBox))

  if (includeDeleted) {
    return allBoxes
  }

  return allBoxes.filter(box => !box.deletedAt)
}

export async function getDeletedBoxes(): Promise<MeatBox[]> {
  const q = query(collection(db, 'boxes'), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  const allBoxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeatBox))

  return allBoxes.filter(box => box.deletedAt)
}

export async function getAvailableBoxes(): Promise<MeatBox[]> {
  // Temporário: sem orderBy até o índice ser criado
  const q = query(
    collection(db, 'boxes'),
    where('status', '==', 'awaiting_customer_purchases')
  )
  const snapshot = await getDocs(q)
  // Ordenar manualmente por createdAt desc e filtrar caixas excluídas
  const boxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeatBox))
  return boxes
    .filter(box => !box.deletedAt) // Filtrar caixas excluídas
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createBox(boxData: Omit<MeatBox, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const docRef = await addDoc(collection(db, 'boxes'), {
    ...boxData,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateBox(boxId: string, updates: Partial<MeatBox>): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function getPurchasesForBox(boxId: string): Promise<Purchase[]> {
  const q = query(collection(db, 'purchases'), where('boxId', '==', boxId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))
}

export async function createPurchase(purchaseData: Omit<Purchase, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const orderNumber = `GM${Date.now().toString().slice(-8)}` // Generate order number: GM + last 8 digits of timestamp
  
  const docRef = await addDoc(collection(db, 'purchases'), {
    ...purchaseData,
    orderNumber,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updatePurchase(purchaseId: string, updates: Partial<Purchase>): Promise<void> {
  const docRef = doc(db, 'purchases', purchaseId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateBoxStatus(boxId: string, status: string): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function getPurchasesForUser(userId: string): Promise<Purchase[]> {
  const q = query(collection(db, 'purchases'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))
}