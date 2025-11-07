import { collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from './config'
import { MeatBox, Purchase, BoxStatus } from '../types'

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
  // Primeiro, buscar todos os pedidos relacionados à caixa
  const purchases = await getPurchasesForBox(boxId)

  // Excluir todos os pedidos relacionados
  const deletePromises = purchases.map(purchase =>
    deleteDoc(doc(db, 'purchases', purchase.id))
  )

  // Aguardar a exclusão de todos os pedidos
  await Promise.all(deletePromises)

  // Depois excluir a caixa
  const boxDocRef = doc(db, 'boxes', boxId)
  await deleteDoc(boxDocRef)
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
  // Buscar caixas ativas (não excluídas) e filtrar por status válido no lado do cliente
  // para manter compatibilidade com dados antigos e novos
  const q = query(collection(db, 'boxes'))
  const snapshot = await getDocs(q)

  const boxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeatBox))

  // Aceitar todos os formatos de status que representam "Aguardando compras"
  const validWaitingStatuses = [
    'awaiting_customer_purchases', // legado
    'WAITING_PURCHASES',           // enum string
    'Aguardando compras',          // português
    'aguardando compras',          // português minúsculo
    'Aguardando Compras',          // português capitalizado
    'Aguardando Compras',          // duplicado para garantir
    'Aguardando compras',          // duplicado para garantir
    'Aguardando compras',          // duplicado para garantir
    // Enum valor
    BoxStatus.WAITING_PURCHASES
  ]

  // Status que tornam a caixa indisponível
  const unavailableStatuses = [
    'completed', 'COMPLETED', 'Finalizada', 'finalizada',
    'cancelled', 'CANCELLED', 'Cancelada', 'cancelada',
    BoxStatus.COMPLETED,
    BoxStatus.CANCELLED
  ]

  const availableBoxes = boxes
    .filter(box => !box.deletedAt)
    .filter(box => {
      // Se status está em unavailableStatuses, não exibir
      if (unavailableStatuses.includes(box.status)) return false
      // Se status está em validWaitingStatuses, exibir
      if (validWaitingStatuses.includes(box.status)) return true
      // Se status é exatamente o valor do enum
      if (box.status === BoxStatus.WAITING_PURCHASES) return true
      // Se status é string e contém "aguardando" e "compra"
      if (typeof box.status === 'string' && box.status.toLowerCase().includes('aguard') && box.status.toLowerCase().includes('compr')) return true
      // Se status não está em unavailableStatuses, exibir
      return false
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return availableBoxes
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
  try {
    // Primeiro tentar com orderBy (pode falhar se não houver índice)
    try {
      const q = query(collection(db, 'purchases'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))
      return purchases
    } catch (orderByError) {
      // Fallback: buscar sem orderBy e ordenar manualmente
      const q = query(collection(db, 'purchases'), where('userId', '==', userId))
      const snapshot = await getDocs(q)
      const purchases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase))
      // Ordenar manualmente por createdAt desc
      purchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return purchases
    }
  } catch (error) {
    console.error('Erro ao buscar pedidos do usuário:', error)
    throw error
  }
}