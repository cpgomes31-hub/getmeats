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

  // Check if payment status was changed to 'paid' and update order status accordingly
  if (updates.paymentStatus === 'paid') {
    try {
      const purchaseDoc = await getDoc(doc(db, 'purchases', purchaseId))
      if (purchaseDoc.exists()) {
        const purchase = purchaseDoc.data() as Purchase
        // If payment was confirmed and order is waiting for payment, move to waiting box closure
        if ((purchase.status as OrderStatus) === OrderStatus.WAITING_PAYMENT) {
          await changePurchaseStatus(purchase, OrderStatus.WAITING_BOX_CLOSURE, {
            userId: 'system',
            reason: 'Payment confirmed - moving to waiting box closure',
            force: false,
          })
        }
      }
    } catch (err) {
      console.error('Error updating purchase status after payment confirmation:', err)
    }
  }

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

    // Calculate totals excluding cancelled purchases
    const activePurchases = purchases.filter(p => (p.status as OrderStatus) !== OrderStatus.CANCELLED)
    const totalKgReserved = activePurchases.reduce((sum, p) => sum + (p.kgPurchased || 0), 0)
    const fullyReserved = box.totalKg > 0 ? totalKgReserved >= box.totalKg : false

    // Check if all active purchases are paid
    const allPaid = activePurchases.every(p => p.paymentStatus === 'paid')

    if (fullyReserved && allPaid) {
      const previousStatus = box.status
      await updateBoxStatus(boxId, BoxStatus.WAITING_SUPPLIER_ORDER)
      await logStatusChange({
        entityType: 'box',
        entityId: boxId,
        previousStatus,
        nextStatus: BoxStatus.WAITING_SUPPLIER_ORDER,
        forced: false,
        reason: `Automated transition: 100% reserved (${totalKgReserved}kg) and all ${activePurchases.length} active purchases paid`,
        performedBy: 'system',
      })

      // Update purchases that were waiting for box closure to 'Em processo de compra'
      try {
        for (const purchase of activePurchases) {
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
 * Run a comprehensive batch update for a box: validate all conditions, fix inconsistencies,
 * and align purchases to the correct status. Intended to be triggered manually by admins
 * ("Batch de atualização") to re-apply automated rules and fix any inconsistencies.
 */
export async function runBatchUpdate(boxId: string): Promise<{
  success: boolean
  actions: string[]
  errors: string[]
}> {
  const actions: string[] = []
  const errors: string[] = []

  try {
    actions.push(`🔍 Iniciando batch update para caixa ${boxId}`)

    // Step 1: Load current state
    const boxDocRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxDocRef)
    if (!boxSnap.exists()) {
      errors.push('Caixa não encontrada')
      return { success: false, actions, errors }
    }

    const box = boxSnap.data() as MeatBox
    const purchases = await getPurchasesForBox(boxId)

    actions.push(`📊 Estado atual: Caixa ${box.status}, ${purchases.length} pedidos`)

    // Step 2: Validate and fix payment status transitions first
    actions.push('💰 Verificando transições de pagamento...')
    for (const purchase of purchases) {
      try {
        if (purchase.paymentStatus === 'paid' && (purchase.status as OrderStatus) === OrderStatus.WAITING_PAYMENT) {
          await changePurchaseStatus(purchase, OrderStatus.WAITING_BOX_CLOSURE, {
            userId: 'system',
            reason: 'Batch update: payment confirmed, moving to waiting box closure',
            force: false,
          })
          actions.push(`✅ Pedido ${purchase.id}: WAITING_PAYMENT → WAITING_BOX_CLOSURE (pagamento confirmado)`)
        }
      } catch (err) {
        errors.push(`Erro ao corrigir pagamento do pedido ${purchase.id}: ${err}`)
      }
    }

    // Step 3: Re-evaluate box closure after payment fixes
    actions.push('🔄 Reavaliando fechamento da caixa...')
    const closureResult = await evaluateBoxClosureComprehensive(boxId, purchases)
    if (closureResult.transitioned) {
      actions.push(`📦 Caixa transicionada: ${closureResult.fromStatus} → ${closureResult.toStatus}`)
      // Reload box status after transition
      const updatedBoxSnap = await getDoc(boxDocRef)
      if (updatedBoxSnap.exists()) {
        box.status = updatedBoxSnap.data().status
      }
    }

    // Step 4: Validate purchase status consistency with box status
    actions.push('🔍 Validando consistência entre pedidos e caixa...')
    const consistencyIssues = validatePurchaseBoxConsistency(purchases, box.status)

    if (consistencyIssues.length > 0) {
      actions.push(`⚠️ Encontradas ${consistencyIssues.length} inconsistências`)
      consistencyIssues.forEach(issue => actions.push(`   ${issue}`))
    }

    // Step 5: Align all purchases with current box status
    actions.push('🔧 Alinhando pedidos com status da caixa...')
    const alignmentResults = await alignPurchasesWithBoxStatus(boxId, box.status, purchases)

    alignmentResults.forEach(result => {
      if (result.success) {
        actions.push(`✅ ${result.message}`)
      } else {
        errors.push(`❌ ${result.message}`)
      }
    })

    // Step 6: Final validation
    actions.push('🎯 Validação final...')
    const finalPurchases = await getPurchasesForBox(boxId)
    const finalConsistencyIssues = validatePurchaseBoxConsistency(finalPurchases, box.status)

    if (finalConsistencyIssues.length === 0) {
      actions.push('✅ Todos os pedidos estão consistentes com o status da caixa')
    } else {
      errors.push(`❌ Ainda há ${finalConsistencyIssues.length} inconsistências após alinhamento`)
      finalConsistencyIssues.forEach(issue => errors.push(`   ${issue}`))
    }

    const success = errors.length === 0
    actions.push(success ? '🎉 Batch update concluído com sucesso!' : '⚠️ Batch update concluído com avisos')

    return { success, actions, errors }

  } catch (err) {
    errors.push(`Erro crítico no batch update: ${err}`)
    return { success: false, actions, errors }
  }
}

/**
 * Comprehensive box closure evaluation that handles multiple purchases correctly
 */
async function evaluateBoxClosureComprehensive(boxId: string, purchases: Purchase[]): Promise<{
  transitioned: boolean
  fromStatus?: BoxStatus
  toStatus?: BoxStatus
}> {
  try {
    const boxDocRef = doc(db, 'boxes', boxId)
    const boxSnap = await getDoc(boxDocRef)
    if (!boxSnap.exists()) return { transitioned: false }

    const box = boxSnap.data() as MeatBox

    // Only apply for prepaid boxes still waiting purchases
    if (box.paymentType !== 'prepaid' || box.status !== BoxStatus.WAITING_PURCHASES) {
      return { transitioned: false }
    }

    if (!purchases || purchases.length === 0) return { transitioned: false }

    // Calculate totals excluding cancelled purchases
    const activePurchases = purchases.filter(p => (p.status as OrderStatus) !== OrderStatus.CANCELLED)
    const totalKgReserved = activePurchases.reduce((sum, p) => sum + (p.kgPurchased || 0), 0)
    const fullyReserved = box.totalKg > 0 ? totalKgReserved >= box.totalKg : false

    // Check if all active purchases are paid
    const allPaid = activePurchases.every(p => p.paymentStatus === 'paid')

    if (fullyReserved && allPaid) {
      const fromStatus = box.status
      await updateBoxStatus(boxId, BoxStatus.WAITING_SUPPLIER_ORDER)
      await logStatusChange({
        entityType: 'box',
        entityId: boxId,
        previousStatus: fromStatus,
        nextStatus: BoxStatus.WAITING_SUPPLIER_ORDER,
        forced: false,
        reason: `Batch: 100% reserved (${totalKgReserved}kg) and all ${activePurchases.length} active purchases paid`,
        performedBy: 'system',
      })

      // Update purchases that were waiting for box closure to 'Em processo de compra'
      for (const purchase of activePurchases) {
        if ((purchase.status as OrderStatus) === OrderStatus.WAITING_BOX_CLOSURE) {
          try {
            await changePurchaseStatus(purchase, OrderStatus.IN_PURCHASE_PROCESS, {
              userId: 'system',
              reason: 'Batch: box closed and all payments received',
              force: false,
            })
          } catch (err) {
            console.error(`Error updating purchase ${purchase.id} to IN_PURCHASE_PROCESS:`, err)
          }
        }
      }

      return {
        transitioned: true,
        fromStatus,
        toStatus: BoxStatus.WAITING_SUPPLIER_ORDER
      }
    }

    return { transitioned: false }

  } catch (error) {
    console.error('Error in evaluateBoxClosureComprehensive:', error)
    return { transitioned: false }
  }
}

/**
 * Validate consistency between purchase statuses and box status
 * For DISPATCHING status, allow purchases to be in different dispatch states
 */
function validatePurchaseBoxConsistency(purchases: Purchase[], boxStatus: BoxStatus): string[] {
  const issues: string[] = []
  const activePurchases = purchases.filter(p => (p.status as OrderStatus) !== OrderStatus.CANCELLED)

  for (const purchase of purchases) {
    const purchaseStatus = purchase.status as OrderStatus

    // Skip cancelled purchases - they can be in any state
    if (purchaseStatus === OrderStatus.CANCELLED) continue

    // Check payment consistency for prepaid boxes
    if (purchase.paymentStatus !== 'paid' && purchaseStatus !== OrderStatus.WAITING_PAYMENT) {
      issues.push(`Pedido ${purchase.id}: status ${purchaseStatus} mas pagamento ${purchase.paymentStatus}`)
    }

    // Special handling for DISPATCHING status - allow multiple states
    if (boxStatus === BoxStatus.DISPATCHING) {
      const validDispatchStatuses = [
        OrderStatus.WAITING_CLIENT_SHIPMENT,
        OrderStatus.DISPATCHING_TO_CLIENT,
        OrderStatus.DELIVERED_TO_CLIENT
      ]

      if (!validDispatchStatuses.includes(purchaseStatus)) {
        issues.push(`Pedido ${purchase.id}: status ${purchaseStatus} inválido para caixa em despacho`)
      }
      continue
    }

    // Check status alignment with box for other statuses
    const expectedStatus = getExpectedPurchaseStatusForBox(boxStatus)
    if (expectedStatus && purchaseStatus !== expectedStatus) {
      issues.push(`Pedido ${purchase.id}: status ${purchaseStatus} mas caixa ${boxStatus} espera ${expectedStatus}`)
    }
  }

  return issues
}

/**
 * Get expected purchase status for a given box status
 * Returns null for statuses where purchases can be in different states
 */
function getExpectedPurchaseStatusForBox(boxStatus: BoxStatus): OrderStatus | null {
  switch (boxStatus) {
    case BoxStatus.WAITING_PURCHASES:
      return null // Can be WAITING_PAYMENT or WAITING_BOX_CLOSURE depending on payment type
    case BoxStatus.WAITING_SUPPLIER_ORDER:
      return OrderStatus.IN_PURCHASE_PROCESS
    case BoxStatus.WAITING_SUPPLIER_DELIVERY:
      return OrderStatus.WAITING_SUPPLIER
    case BoxStatus.SUPPLIER_DELIVERY_RECEIVED:
      return OrderStatus.WAITING_CLIENT_SHIPMENT
    case BoxStatus.DISPATCHING:
      return null // Purchases can be in WAITING_CLIENT_SHIPMENT, DISPATCHING_TO_CLIENT, or DELIVERED_TO_CLIENT
    case BoxStatus.COMPLETED:
      return OrderStatus.DELIVERED_TO_CLIENT
    default:
      return null
  }
}

/**
 * Align all purchases with the current box status
 * IMPORTANT: This function should NEVER regress purchase status.
 * It should only advance purchases that are behind the expected status.
 */
async function alignPurchasesWithBoxStatus(
  boxId: string,
  boxStatus: BoxStatus,
  purchases: Purchase[]
): Promise<Array<{ success: boolean, message: string }>> {
  const results: Array<{ success: boolean, message: string }> = []

  for (const purchase of purchases) {
    try {
      const purchaseStatus = purchase.status as OrderStatus

      // Skip cancelled purchases
      if (purchaseStatus === OrderStatus.CANCELLED) {
        results.push({ success: true, message: `Pedido ${purchase.id}: cancelado (mantido)` })
        continue
      }

      let targetStatus: OrderStatus | null = null
      let reason = ''

      switch (boxStatus) {
        case BoxStatus.WAITING_SUPPLIER_ORDER:
          if (purchaseStatus === OrderStatus.WAITING_BOX_CLOSURE) {
            targetStatus = OrderStatus.IN_PURCHASE_PROCESS
            reason = 'Batch: box closed'
          }
          break

        case BoxStatus.WAITING_SUPPLIER_DELIVERY:
          // Only advance if purchase is behind
          if (purchaseStatus === OrderStatus.IN_PURCHASE_PROCESS ||
              purchaseStatus === OrderStatus.WAITING_BOX_CLOSURE) {
            targetStatus = OrderStatus.WAITING_SUPPLIER
            reason = 'Batch: supplier order placed'
          }
          break

        case BoxStatus.SUPPLIER_DELIVERY_RECEIVED:
          // Only advance if purchase is behind
          if (purchaseStatus === OrderStatus.WAITING_SUPPLIER ||
              purchaseStatus === OrderStatus.IN_PURCHASE_PROCESS ||
              purchaseStatus === OrderStatus.WAITING_BOX_CLOSURE) {
            targetStatus = OrderStatus.WAITING_CLIENT_SHIPMENT
            reason = 'Batch: supplier delivery received'
          }
          break

        case BoxStatus.DISPATCHING:
          // CRITICAL: DO NOT automatically advance purchases to DISPATCHING_TO_CLIENT
          // This should only happen when admin manually clicks "Despachar pedido"
          // and confirms with the dispatch checklist
          results.push({
            success: true,
            message: `Pedido ${purchase.id}: aguardando despacho manual (${purchaseStatus})`
          })
          continue

        case BoxStatus.COMPLETED:
          // Only advance if purchase is behind, never regress
          if (purchaseStatus === OrderStatus.DISPATCHING_TO_CLIENT ||
              purchaseStatus === OrderStatus.WAITING_CLIENT_SHIPMENT ||
              purchaseStatus === OrderStatus.WAITING_SUPPLIER ||
              purchaseStatus === OrderStatus.IN_PURCHASE_PROCESS ||
              purchaseStatus === OrderStatus.WAITING_BOX_CLOSURE) {
            targetStatus = OrderStatus.DELIVERED_TO_CLIENT
            reason = 'Batch: completed'
          }
          break
      }

      if (targetStatus && purchaseStatus !== targetStatus) {
        await changePurchaseStatus(purchase, targetStatus, {
          userId: 'system',
          reason,
          force: true, // Force alignment during batch update
        })
        results.push({
          success: true,
          message: `Pedido ${purchase.id}: ${purchaseStatus} → ${targetStatus} (${reason})`
        })
      } else if (targetStatus && purchaseStatus === targetStatus) {
        results.push({
          success: true,
          message: `Pedido ${purchase.id}: já está correto (${purchaseStatus})`
        })
      } else {
        results.push({
          success: true,
          message: `Pedido ${purchase.id}: mantido em ${purchaseStatus} (não deve regredir)`
        })
      }

    } catch (err) {
      results.push({
        success: false,
        message: `Erro ao alinhar pedido ${purchase.id}: ${err}`
      })
    }
  }

  return results
}