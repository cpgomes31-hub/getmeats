import React, { useState } from 'react'
import {
  createBox,
  createPurchase,
  updatePurchase,
  changeBoxStatus,
  runBatchUpdate,
  getPurchasesForBox,
  getAllBoxes,
} from '../firebase/boxes'
import { fetchStatusLogs } from '../firebase/statusLogs'
import { BoxStatus, OrderStatus } from '../types'

export default function DevSmokeTest() {
  const [logs, setLogs] = useState<string[]>([])
  const append = (line: string) => setLogs(l => [line, ...l])

  const handleCreateBox = async () => {
    append('Creating test box...')
    try {
      const id = await createBox({
        name: 'DEV Test Box',
        brand: 'DEV',
        photos: [],
        pricePerKg: 50,
        costPerKg: 40,
        totalKg: 10,
        remainingKg: 10,
        minKgPerPerson: 1,
        status: BoxStatus.WAITING_PURCHASES,
        paymentType: 'prepaid',
        sendPix: false,
      })
      append(`Box created: ${id}`)
    } catch (err: any) {
      append('Error creating box: ' + (err.message || String(err)))
    }
  }

  const handleCreatePurchase = async () => {
    try {
      const boxes = await getAllBoxes()
      const box = boxes.find(b => b.name === 'DEV Test Box')
      if (!box) return append('No DEV Test Box found. Create box first.')

      append(`Creating purchase for box ${box.id} ...`)
      const pid = await createPurchase({
        boxId: box.id,
        userId: 'dev-user',
        kgPurchased: 5,
        totalAmount: 5 * box.pricePerKg,
        status: OrderStatus.WAITING_BOX_CLOSURE,
        paymentStatus: 'pending',
      })
      append(`Purchase created: ${pid}`)
    } catch (err: any) {
      append('Error creating purchase: ' + (err.message || String(err)))
    }
  }

  const handleMarkPaid = async () => {
    try {
      const boxes = await getAllBoxes()
      const box = boxes.find(b => b.name === 'DEV Test Box')
      if (!box) return append('No DEV Test Box found. Create box first.')

      const purchases = await getPurchasesForBox(box.id)
      if (!purchases.length) return append('No purchases found for DEV box')

      for (const p of purchases) {
        append(`Marking purchase ${p.id} as paid`)
        await updatePurchase(p.id, { paymentStatus: 'paid' as any })
      }

      append('All purchases marked paid')
    } catch (err: any) {
      append('Error marking paid: ' + (err.message || String(err)))
    }
  }

  const handleForceBoxDelivery = async () => {
    try {
      const boxes = await getAllBoxes()
      const box = boxes.find(b => b.name === 'DEV Test Box')
      if (!box) return append('No DEV Test Box found. Create box first.')

      append(`Forcing box ${box.id} -> WAITING_SUPPLIER_DELIVERY`)
      await changeBoxStatus(box, BoxStatus.WAITING_SUPPLIER_DELIVERY, { userId: 'dev', reason: 'Dev forced move', force: true })
      append('Box forced to WAITING_SUPPLIER_DELIVERY')
    } catch (err: any) {
      append('Error forcing box status: ' + (err.message || String(err)))
    }
  }

  const handleRunBatch = async () => {
    try {
      const boxes = await getAllBoxes()
      const box = boxes.find(b => b.name === 'DEV Test Box')
      if (!box) return append('No DEV Test Box found. Create box first.')

      append(`Running batch update for box ${box.id}`)
      await runBatchUpdate(box.id)
      append('Batch update completed')
      const purchases = await getPurchasesForBox(box.id)
      purchases.forEach(p => append(`Purchase ${p.id} status -> ${p.status} payment: ${p.paymentStatus}`))
    } catch (err: any) {
      append('Error running batch: ' + (err.message || String(err)))
    }
  }

  const [queryId, setQueryId] = useState('')
  const handleFetchLogs = async () => {
    if (!queryId) return append('Informe um boxId ou orderId para buscar logs')
    append(`Fetching status logs for box/order ${queryId}...`)
    try {
      const boxLogs = await fetchStatusLogs('box', queryId)
      if (!boxLogs || boxLogs.length === 0) {
        append('No status logs found for that id.')
        return
      }
      boxLogs.forEach((log: any) => append(`${log.performedAt} | ${log.entityType} ${log.entityId} ${log.previousStatus} -> ${log.nextStatus} by ${log.performedBy} reason: ${log.reason || ''}`))
    } catch (err: any) {
      append('Error fetching logs: ' + (err.message || String(err)))
    }
  }

  const handleRunBatchForId = async () => {
    if (!queryId) return append('Informe um boxId para rodar batch')
    append(`Running batch update for ${queryId}...`)
    try {
      await runBatchUpdate(queryId)
      append('Batch run completed')
    } catch (err: any) {
      append('Error running batch for id: ' + (err.message || String(err)))
    }
  }

  const handlePayAllPurchasesForBox = async () => {
    if (!queryId) return append('Informe um boxId para pagar todos os pedidos')
    append(`Pagando todos os pedidos da caixa ${queryId}...`)
    try {
      const purchases = await getPurchasesForBox(queryId)
      if (!purchases.length) {
        append(`Nenhum pedido encontrado para a caixa ${queryId}`)
        return
      }
      
      append(`Encontrados ${purchases.length} pedidos. Processando pagamentos...`)
      
      for (const purchase of purchases) {
        if (purchase.paymentStatus === 'paid') {
          append(`Pedido ${purchase.id} já está pago (${purchase.paymentStatus})`)
          continue
        }
        
        append(`Pagando pedido ${purchase.id} (${purchase.kgPurchased}kg - R$${purchase.totalAmount})`)
        await updatePurchase(purchase.id, { paymentStatus: 'paid' as any })
        append(`✅ Pedido ${purchase.id} marcado como pago`)
      }
      
      append(`🎉 Todos os pedidos da caixa ${queryId} foram pagos com sucesso!`)
      append('💡 A caixa deve transicionar automaticamente se estiver 100% reservada')
      
    } catch (err: any) {
      append('Error paying purchases: ' + (err.message || String(err)))
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl">Dev Smoke Test</h2>

      <div className="flex gap-2">
        <button onClick={handleCreateBox} className="px-3 py-1 bg-green-600 rounded">Create Box</button>
        <button onClick={handleCreatePurchase} className="px-3 py-1 bg-blue-600 rounded">Create Purchase (5kg)</button>
        <button onClick={handleMarkPaid} className="px-3 py-1 bg-yellow-600 rounded">Mark Purchases Paid</button>
  <button onClick={handleForceBoxDelivery} className="px-3 py-1 bg-orange-600 rounded">Force box to WAITING_SUPPLIER_DELIVERY</button>
        <button onClick={handleRunBatch} className="px-3 py-1 bg-purple-600 rounded">Run Batch Update</button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <input value={queryId} onChange={e => setQueryId(e.target.value)} placeholder="boxId para operações" className="px-2 py-1 rounded bg-white text-black" />
          <button onClick={handleFetchLogs} className="px-3 py-1 bg-gray-600 rounded">Fetch Status Logs</button>
          <button onClick={handleRunBatchForId} className="px-3 py-1 bg-indigo-600 rounded">Run Batch for ID</button>
      </div>

      <div className="flex items-center gap-2 mt-2">
          <button onClick={handlePayAllPurchasesForBox} className="px-3 py-1 bg-green-500 rounded font-bold">💰 Pagar Todos os Pedidos da Caixa</button>
          <span className="text-sm text-gray-400">Use o campo acima para informar o código da caixa</span>
      </div>

      <div className="mt-4 bg-gray-900 p-3 rounded max-h-96 overflow-auto">
        {logs.map((l, i) => (
          <div key={i} className="text-sm text-gray-300">{l}</div>
        ))}
      </div>
    </div>
  )
}
