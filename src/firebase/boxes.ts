import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from './config'
import { MeatBox, Purchase, BoxStatus, OrderStatus } from '../types'
import { isValidStatusTransition } from '../types/status'
import { logStatusChange } from './statusLogs'

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
  const q = query(collection(db, 'boxes'))
  const snapshot = await getDocs(q)

  const boxes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeatBox))

  return boxes
    .filter(box => !box.deletedAt)
    .filter(box => box.status === BoxStatus.WAITING_PURCHASES)
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

/**
 * Recalcula e atualiza o remainingKg de uma caixa baseado nos pedidos ativos
 */
async function updateBoxRemainingKg(boxId: string): Promise<void> {
  try {
    const boxDocRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxDocRef)
    if (!boxSnap.exists()) return

    const box = boxSnap.data() as MeatBox
    const purchases = await getPurchasesForBox(boxId)
    
    // Calculate total kg reserved (only active purchases, not cancelled)
    const totalKgReserved = purchases
      .filter(p => (p.status as OrderStatus) !== OrderStatus.CANCELLED)
      .reduce((sum, p) => sum + (p.kgPurchased || 0), 0)
    
    const newRemainingKg = Math.max(0, box.totalKg - totalKgReserved)
    
    await updateBox(boxId, { remainingKg: newRemainingKg })
  } catch (error) {
    console.error('Error updating box remaining kg:', error)
    throw error
  }
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
  
  // Update box remaining kg after creating purchase
  try {
    await updateBoxRemainingKg(purchaseData.boxId)
  } catch (err) {
    console.error('Error updating box remaining kg after createPurchase:', err)
  }
  
  // After creating a purchase, evaluate whether the box needs to move to supplier-request state
  try {
    await evaluateBoxClosure(purchaseData.boxId)
  } catch (err) {
    console.error('Error evaluating box closure after createPurchase:', err)
  }
  return docRef.id
}

export async function updatePurchase(purchaseId: string, updates: Partial<Purchase>): Promise<void> {
  const docRef = doc(db, 'purchases', purchaseId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })

  // Update box remaining kg after updating purchase
  try {
    const purchaseDoc = await getDoc(doc(db, 'purchases', purchaseId))
    if (purchaseDoc.exists()) {
      const p = purchaseDoc.data() as Purchase
      if (p.boxId) await updateBoxRemainingKg(p.boxId)
    }
  } catch (err) {
    console.error('Error updating box remaining kg after updatePurchase:', err)
  }

  // Re-load the purchase to get its boxId and re-evaluate box closure
  try {
    const purchaseDoc = await getDoc(doc(db, 'purchases', purchaseId))
    if (purchaseDoc.exists()) {
      const p = purchaseDoc.data() as Purchase
      if (p.boxId) await evaluateBoxClosure(p.boxId)
    }
  } catch (err) {
    console.error('Error evaluating box closure after updatePurchase:', err)
  }
}

export async function updateBoxStatus(boxId: string, status: BoxStatus): Promise<void> {
  const docRef = doc(db, 'boxes', boxId)
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
  })
}

interface ChangeStatusBase {
  userId: string
  reason?: string
  force?: boolean
}

// DEPRECATED - Use StatusManager.changeBoxStatusSafe instead
export async function changeBoxStatus(
  box: MeatBox,
  nextStatus: BoxStatus,
  { userId, reason, force }: ChangeStatusBase
): Promise<void> {
  console.warn('⚠️ Using deprecated changeBoxStatus. Use StatusManager.changeBoxStatusSafe instead')
  
  const { StatusManager } = await import('./statusManager')
  await StatusManager.changeBoxStatusSafe(box.id, nextStatus, { userId, reason, force })
}



// DEPRECATED - Use StatusManager.changePurchaseStatusSafe instead  
export async function changePurchaseStatus(
  purchase: Purchase,
  nextStatus: OrderStatus,
  { userId, reason, force }: ChangeStatusBase
): Promise<{ boxUpdated: boolean }> {
  console.warn('⚠️ Using deprecated changePurchaseStatus. Use StatusManager.changePurchaseStatusSafe instead')
  
  const { StatusManager } = await import('./statusManager')
  return await StatusManager.changePurchaseStatusSafe(purchase.id, nextStatus, { userId, reason, force })
}



/**
 * Verifica se a caixa pré-paga está 100% comprada e se todos os pedidos estão pagos.
 * Se sim e a caixa estiver em WAITING_PURCHASES, transiciona automaticamente para
 * WAITING_SUPPLIER_ORDER (Aguardando pedido ao fornecedor).
 */
async function evaluateBoxClosure(boxId: string): Promise<void> {
  try {
    const boxDocRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxDocRef)
    if (!boxSnap.exists()) return

    const box = boxSnap.data() as MeatBox

    // Only apply for prepaid boxes still waiting purchases
    if (box.paymentType !== 'prepaid' || box.status !== BoxStatus.WAITING_PURCHASES) return

    const purchases = await getPurchasesForBox(boxId)
    if (!purchases || purchases.length === 0) return

    const totalKgReserved = purchases.reduce((sum, p) => sum + (p.kgPurchased || 0), 0)
    const fullyReserved = box.totalKg > 0 ? totalKgReserved >= box.totalKg : false

    // Option B: require both fully reserved AND all purchases paid to transition
    // the box to 'Aguardando pedido ao fornecedor'. This prevents ordering before
    // payments are settled.
    const allPaid = purchases.every(p => p.paymentStatus === 'paid')

    if (fullyReserved && allPaid) {
      const previousStatus = box.status
      await updateBoxStatus(boxId, BoxStatus.WAITING_SUPPLIER_ORDER)
      await logStatusChange({
        entityType: 'box',
        entityId: boxId,
        previousStatus,
        nextStatus: BoxStatus.WAITING_SUPPLIER_ORDER,
        forced: false,
        reason: 'Automated transition: 100% reserved and all purchases paid',
        performedBy: 'system',
      })

      // Update purchases that were waiting for box closure to 'Em processo de compra'
      try {
        for (const purchase of purchases) {
          if ((purchase.status as OrderStatus) === OrderStatus.WAITING_BOX_CLOSURE) {
            await changePurchaseStatus(purchase, OrderStatus.IN_PURCHASE_PROCESS, {
              userId: 'system',
              reason: 'Automated: box closed and all payments received',
              force: false,
            })
          }
        }
      } catch (err) {
        console.error('Error updating purchases to IN_PURCHASE_PROCESS after box closure:', err)
      }
    }
  } catch (error) {
    console.error('Error in evaluateBoxClosure:', error)
    throw error
  }
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

/**
 * Run a batch update for a box: evaluate closure rules and align purchases
 * to the box's current status. Intended to be triggered manually by admins
 * ("Batch de atualização") to re-apply automated rules.
 */
export async function runBatchUpdate(boxId: string): Promise<void> {
  try {
    // First, evaluate closure rules which may transition the box automatically
    await evaluateBoxClosure(boxId)

    // Re-load box and purchases
    const boxDocRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxDocRef)
    if (!boxSnap.exists()) return
    const box = boxSnap.data() as MeatBox

    const purchases = await getPurchasesForBox(boxId)

    // Align purchase statuses according to current box.status
    for (const purchase of purchases) {
      try {
        if (box.status === BoxStatus.WAITING_SUPPLIER_ORDER) {
          if ((purchase.status as OrderStatus) === OrderStatus.WAITING_BOX_CLOSURE) {
            await changePurchaseStatus(purchase, OrderStatus.IN_PURCHASE_PROCESS, {
              userId: 'system',
              reason: 'Batch update: box closed',
              force: false,
            })
          }
        } else if (box.status === BoxStatus.WAITING_SUPPLIER_DELIVERY) {
          if ((purchase.status as OrderStatus) !== OrderStatus.CANCELLED) {
            await changePurchaseStatus(purchase, OrderStatus.WAITING_SUPPLIER, {
              userId: 'system',
              reason: 'Batch update: supplier order placed',
              // force to guarantee alignment even when intermediate transitions
              // would otherwise block a direct move to WAITING_SUPPLIER
              force: true,
            })
          }
        } else if (box.status === BoxStatus.SUPPLIER_DELIVERY_RECEIVED) {
          if ((purchase.status as OrderStatus) !== OrderStatus.CANCELLED) {
            await changePurchaseStatus(purchase, OrderStatus.WAITING_CLIENT_SHIPMENT, {
              userId: 'system',
              reason: 'Batch update: supplier delivery received',
              force: false,
            })
          }
        } else if (box.status === BoxStatus.DISPATCHING) {
          if ((purchase.status as OrderStatus) !== OrderStatus.CANCELLED) {
            await changePurchaseStatus(purchase, OrderStatus.DISPATCHING_TO_CLIENT, {
              userId: 'system',
              reason: 'Batch update: dispatching',
              force: false,
            })
          }
        } else if (box.status === BoxStatus.COMPLETED) {
          if ((purchase.status as OrderStatus) !== OrderStatus.CANCELLED) {
            await changePurchaseStatus(purchase, OrderStatus.DELIVERED_TO_CLIENT, {
              userId: 'system',
              reason: 'Batch update: completed',
              force: false,
            })
          }
        }
      } catch (err) {
        console.error(`Error aligning purchase ${purchase.id} during batch update:`, err)
      }
    }
  } catch (err) {
    console.error('Error running batch update for box:', err)
    throw err
  }
}