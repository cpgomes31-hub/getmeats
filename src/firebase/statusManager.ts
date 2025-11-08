// src/firebase/statusManager.ts
// SOLUÇÃO CRÍTICA: Sistema de transições thread-safe e consistente

import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from './config'
import { MeatBox, Purchase, BoxStatus, OrderStatus } from '../types'
import { isValidStatusTransition } from '../types/status'
import { logStatusChange } from './statusLogs'
import { getPurchasesForBox } from './boxes'

const db = getFirestore(app)

// Flag global para prevenir loops infinitos
const activeTransitions = new Set<string>()

interface StatusChangeRequest {
  userId: string
  reason?: string
  force?: boolean
  preventRecursion?: boolean
}

/**
 * SISTEMA SEGURO DE TRANSIÇÕES DE STATUS
 * Previne loops infinitos e garante consistência
 */
export class StatusManager {
  
  /**
   * Muda status da caixa com verificações de segurança
   */
  static async changeBoxStatusSafe(
    boxId: string,
    nextStatus: BoxStatus,
    { userId, reason, force = false, preventRecursion = false }: StatusChangeRequest
  ): Promise<void> {
    const transitionKey = `box-${boxId}-${nextStatus}`
    
    // Prevenir loops infinitos
    if (activeTransitions.has(transitionKey)) {
      console.warn(`⚠️ Transição bloqueada - loop detectado: ${transitionKey}`)
      return
    }

    activeTransitions.add(transitionKey)
    
    try {
      await runTransaction(db, async (transaction) => {
        const boxRef = doc(db, 'boxes', boxId)
        const boxSnap = await transaction.get(boxRef)
        
        if (!boxSnap.exists()) {
          throw new Error(`Caixa ${boxId} não encontrada`)
        }
        
        const box = boxSnap.data() as MeatBox
        const currentStatus = box.status
        
        // Validar transição
        const isValid = this.validateBoxTransition(currentStatus, nextStatus, force)
        if (!isValid) {
          throw new Error(`Transição inválida: ${currentStatus} → ${nextStatus}`)
        }
        
        // Atualizar caixa
        transaction.update(boxRef, {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        })
        
        // Log da mudança
        await logStatusChange({
          entityType: 'box',
          entityId: boxId,
          previousStatus: currentStatus,
          nextStatus,
          forced: !isValidStatusTransition(currentStatus, nextStatus, 'box'),
          reason,
          performedBy: userId,
        })
      })
      
      // Alinhar purchases APÓS a transação (evita deadlocks)
      if (!preventRecursion) {
        await this.alignPurchasesWithBox(boxId, nextStatus, { userId, reason, preventRecursion: true })
      }
      
    } finally {
      activeTransitions.delete(transitionKey)
    }
  }
  
  /**
   * Muda status do pedido com verificações de segurança
   */
  static async changePurchaseStatusSafe(
    purchaseId: string,
    nextStatus: OrderStatus,
    { userId, reason, force = false, preventRecursion = false }: StatusChangeRequest
  ): Promise<{ boxUpdated: boolean }> {
    const transitionKey = `purchase-${purchaseId}-${nextStatus}`
    
    if (activeTransitions.has(transitionKey)) {
      console.warn(`⚠️ Transição bloqueada - loop detectado: ${transitionKey}`)
      return { boxUpdated: false }
    }

    activeTransitions.add(transitionKey)
    let boxUpdated = false
    
    try {
      await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'purchases', purchaseId)
        const purchaseSnap = await transaction.get(purchaseRef)
        
        if (!purchaseSnap.exists()) {
          throw new Error(`Pedido ${purchaseId} não encontrado`)
        }
        
        const purchase = purchaseSnap.data() as Purchase
        const currentStatus = purchase.status
        
        // Validar transição
        const isValid = isValidStatusTransition(currentStatus, nextStatus, 'order')
        if (!isValid && !force) {
          throw new Error(`Transição inválida: ${currentStatus} → ${nextStatus}`)
        }
        
        // Atualizar pedido
        transaction.update(purchaseRef, {
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        })
        
        // Log da mudança
        await logStatusChange({
          entityType: 'order',
          entityId: purchaseId,
          previousStatus: currentStatus,
          nextStatus,
          forced: !isValid,
          reason,
          performedBy: userId,
        })
      })
      
      // Verificar propagação para box APÓS transação
      if (!preventRecursion) {
        const purchaseDoc = await getDoc(doc(db, 'purchases', purchaseId))
        if (purchaseDoc.exists()) {
          const purchase = purchaseDoc.data() as Purchase
          boxUpdated = await this.handlePurchaseToBoxPropagation(
            purchase, 
            nextStatus, 
            { userId, reason, preventRecursion: true }
          )
        }
      }
      
    } finally {
      activeTransitions.delete(transitionKey)
    }
    
    return { boxUpdated }
  }
  
  /**
   * Validação rigorosa de transições de caixa
   */
  private static validateBoxTransition(
    currentStatus: BoxStatus,
    nextStatus: BoxStatus,
    force: boolean
  ): boolean {
    // Regras especiais que nunca devem ser violadas
    if (nextStatus === BoxStatus.DISPATCHING && !force) {
      // DISPATCHING só pode ser atingido por propagação de pedidos
      return false
    }
    
    if (nextStatus === BoxStatus.COMPLETED && !force) {
      // COMPLETED só pode ser atingido quando todos os pedidos são entregues
      return false
    }
    
    return force || isValidStatusTransition(currentStatus, nextStatus, 'box')
  }
  
  /**
   * Alinha purchases com status da box (sem recursão)
   */
  private static async alignPurchasesWithBox(
    boxId: string,
    boxStatus: BoxStatus,
    { userId, reason, preventRecursion }: StatusChangeRequest
  ): Promise<void> {
    const purchases = await getPurchasesForBox(boxId)
    
    for (const purchase of purchases) {
      if ((purchase.status as OrderStatus) === OrderStatus.CANCELLED) continue
      
      try {
        let targetOrderStatus: OrderStatus | null = null
        
        switch (boxStatus) {
          case BoxStatus.WAITING_SUPPLIER_ORDER:
            if ((purchase.status as OrderStatus) === OrderStatus.WAITING_BOX_CLOSURE) {
              targetOrderStatus = OrderStatus.IN_PURCHASE_PROCESS
            }
            break
            
          case BoxStatus.WAITING_SUPPLIER_DELIVERY:
            targetOrderStatus = OrderStatus.WAITING_SUPPLIER
            break
            
          case BoxStatus.SUPPLIER_DELIVERY_RECEIVED:
            targetOrderStatus = OrderStatus.WAITING_CLIENT_SHIPMENT
            break
            
          case BoxStatus.DISPATCHING:
            targetOrderStatus = OrderStatus.DISPATCHING_TO_CLIENT
            break
            
          case BoxStatus.COMPLETED:
            targetOrderStatus = OrderStatus.DELIVERED_TO_CLIENT
            break
        }
        
        if (targetOrderStatus && purchase.status !== targetOrderStatus) {
          await this.changePurchaseStatusSafe(purchase.id, targetOrderStatus, {
            userId,
            reason: reason || `Box aligned to ${boxStatus}`,
            force: true,
            preventRecursion: true
          })
        }
        
      } catch (err) {
        console.error(`Error aligning purchase ${purchase.id}:`, err)
      }
    }
  }
  
  /**
   * Propagação segura de pedido para caixa
   */
  private static async handlePurchaseToBoxPropagation(
    purchase: Purchase,
    purchaseStatus: OrderStatus,
    { userId, reason, preventRecursion }: StatusChangeRequest
  ): Promise<boolean> {
    
    // Regra: DISPATCHING_TO_CLIENT → Box DISPATCHING
    if (purchaseStatus === OrderStatus.DISPATCHING_TO_CLIENT) {
      await this.changeBoxStatusSafe(purchase.boxId, BoxStatus.DISPATCHING, {
        userId,
        reason: reason || `Auto: purchase dispatching`,
        force: true,
        preventRecursion: true
      })
      return true
    }
    
    // Regra: Todos entregues → Box COMPLETED
    if (purchaseStatus === OrderStatus.DELIVERED_TO_CLIENT) {
      const allPurchases = await getPurchasesForBox(purchase.boxId)
      
      // Filtra apenas pedidos não cancelados (ativos)
      const activePurchases = allPurchases.filter(p => 
        (p.status as OrderStatus) !== OrderStatus.CANCELLED
      )
      
      // Verifica se TODOS os pedidos ativos foram entregues
      const allActiveDelivered = activePurchases.length > 0 && 
        activePurchases.every(p => (p.status as OrderStatus) === OrderStatus.DELIVERED_TO_CLIENT)
      
      if (allActiveDelivered) {
        await this.changeBoxStatusSafe(purchase.boxId, BoxStatus.COMPLETED, {
          userId,
          reason: reason || `Auto: all active purchases delivered (${activePurchases.length}/${allPurchases.length})`,
          force: true,
          preventRecursion: true
        })
      }
    }
    
    return false
  }
  
  /**
   * Diagnóstico de estados inconsistentes
   */
  static async diagnoseInconsistencies(boxId: string): Promise<{
    issues: string[]
    fixes: Array<{ action: string, params: any }>
  }> {
    const issues: string[] = []
    const fixes: Array<{ action: string, params: any }> = []
    
    const boxDoc = await getDoc(doc(db, 'boxes', boxId))
    if (!boxDoc.exists()) {
      issues.push('Caixa não encontrada')
      return { issues, fixes }
    }
    
    const box = boxDoc.data() as MeatBox
    const purchases = await getPurchasesForBox(boxId)
    
    // Verificar consistência box-purchases
    const inconsistentPurchases = purchases.filter(p => {
      const expectedStatus = this.getExpectedPurchaseStatus(box.status)
      return expectedStatus && p.status !== expectedStatus && p.status !== OrderStatus.CANCELLED
    })
    
    if (inconsistentPurchases.length > 0) {
      issues.push(`${inconsistentPurchases.length} pedidos com status inconsistente`)
      fixes.push({
        action: 'alignPurchasesWithBox',
        params: { boxId, boxStatus: box.status }
      })
    }
    
    // Verificar se box deveria estar em COMPLETED
    if (box.status !== BoxStatus.COMPLETED && box.status !== BoxStatus.CANCELLED) {
      const allDelivered = purchases.every(p => 
        (p.status as OrderStatus) === OrderStatus.DELIVERED_TO_CLIENT ||
        (p.status as OrderStatus) === OrderStatus.CANCELLED
      )
      
      if (allDelivered && purchases.length > 0) {
        issues.push('Caixa deveria estar finalizada (todos pedidos entregues)')
        fixes.push({
          action: 'changeBoxStatus',
          params: { boxId, status: BoxStatus.COMPLETED }
        })
      }
    }
    
    return { issues, fixes }
  }
  
  private static getExpectedPurchaseStatus(boxStatus: BoxStatus): OrderStatus | null {
    switch (boxStatus) {
      case BoxStatus.WAITING_SUPPLIER_DELIVERY:
        return OrderStatus.WAITING_SUPPLIER
      case BoxStatus.SUPPLIER_DELIVERY_RECEIVED:
        return OrderStatus.WAITING_CLIENT_SHIPMENT
      case BoxStatus.DISPATCHING:
        return OrderStatus.DISPATCHING_TO_CLIENT
      case BoxStatus.COMPLETED:
        return OrderStatus.DELIVERED_TO_CLIENT
      default:
        return null
    }
  }
}