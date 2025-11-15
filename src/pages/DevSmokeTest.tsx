import React, { useState, useEffect } from 'react'
import {
  createBox,
  createPurchase,
  updatePurchase,
  changeBoxStatus,
  runBatchUpdate,
  getPurchasesForBox,
  getAllBoxes,
  permanentlyDeleteBox,
} from '../firebase/boxes'
import { fetchStatusLogs } from '../firebase/statusLogs'
import { BoxStatus, OrderStatus, Purchase } from '../types'

export default function DevSmokeTest() {
  const [logs, setLogs] = useState<string[]>([])
  const [devPurchases, setDevPurchases] = useState<Purchase[]>([])
  const [allBoxes, setAllBoxes] = useState<any[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string>('')
  const append = (line: string) => setLogs(l => [line, ...l])

  // Load all boxes and set default selection when component mounts
  useEffect(() => {
    loadAllBoxes()
  }, [])

  // Load purchases when selected box changes
  useEffect(() => {
    if (selectedBoxId) {
      loadPurchasesForBox(selectedBoxId)
    }
  }, [selectedBoxId])

  // Load all available boxes
  const loadAllBoxes = async () => {
    try {
      const boxes = await getAllBoxes()
      setAllBoxes(boxes)
      
      // Auto-select DEV Test Box if it exists, otherwise select first box
      const devBox = boxes.find(b => b.name === 'DEV Test Box')
      if (devBox) {
        setSelectedBoxId(devBox.id)
      } else if (boxes.length > 0) {
        setSelectedBoxId(boxes[0].id)
      }
    } catch (err) {
      console.error('Error loading boxes:', err)
      setAllBoxes([])
    }
  }

  // Load purchases for a specific box
  const loadPurchasesForBox = async (boxId: string) => {
    try {
      const purchases = await getPurchasesForBox(boxId)
      setDevPurchases(purchases)
    } catch (err) {
      console.error('Error loading purchases:', err)
      setDevPurchases([])
    }
  }

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
        status: box.paymentType === 'prepaid' ? OrderStatus.WAITING_PAYMENT : OrderStatus.WAITING_BOX_CLOSURE,
        paymentStatus: box.paymentType === 'prepaid' ? 'pending' : 'paid',
      })
      append(`Purchase created: ${pid} (status: ${box.paymentType === 'prepaid' ? 'WAITING_PAYMENT' : 'WAITING_BOX_CLOSURE'})`)
      await loadPurchasesForBox(box.id) // Reload purchases
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

      append(`Marking ${purchases.length} purchases as paid...`)
      for (const p of purchases) {
        if (p.paymentStatus !== 'paid') {
          append(`Marking purchase ${p.id} as paid`)
          await updatePurchase(p.id, { paymentStatus: 'paid' as any })
          append(`✅ Purchase ${p.id} marked as paid`)
        } else {
          append(`Purchase ${p.id} already paid`)
        }
      }

      append('All purchases processed. Running batch update...')
      const batchResult = await runBatchUpdate(box.id)
      append(`Batch result: ${batchResult.success ? 'SUCCESS' : 'COMPLETED WITH ISSUES'}`)

      await loadPurchasesForBox(box.id) // Reload purchases after batch
      append('✅ All operations completed')
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
      const result = await runBatchUpdate(box.id)

      append(`Batch result: ${result.success ? 'SUCCESS' : 'FAILED'}`)

      result.actions.forEach(action => append(`ACTION: ${action}`))
      result.errors.forEach(error => append(`ERROR: ${error}`))

      append('Batch update completed')
      await loadPurchasesForBox(box.id) // Reload purchases after batch
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

  const handlePayIndividualPurchase = async (purchaseId: string) => {
    try {
      append(`Paying individual purchase ${purchaseId}...`)

      const purchase = devPurchases.find(p => p.id === purchaseId)
      if (!purchase) {
        append(`Purchase ${purchaseId} not found`)
        return
      }

      if (purchase.paymentStatus === 'paid') {
        append(`Purchase ${purchaseId} is already paid`)
        return
      }

      await updatePurchase(purchaseId, { paymentStatus: 'paid' as any })
      append(`✅ Purchase ${purchaseId} marked as paid`)

      // Run batch update automatically
      append('Running batch update after payment...')
      const batchResult = await runBatchUpdate(purchase.boxId)
      append(`Batch result: ${batchResult.success ? 'SUCCESS' : 'COMPLETED WITH ISSUES'}`)

      await loadPurchasesForBox(selectedBoxId) // Reload purchases
      append('✅ Individual payment completed')
    } catch (err: any) {
      append('Error paying individual purchase: ' + (err.message || String(err)))
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

      let paidCount = 0
      for (const purchase of purchases) {
        if (purchase.paymentStatus === 'paid') {
          append(`Pedido ${purchase.id} já está pago (${purchase.paymentStatus})`)
          continue
        }

        append(`Pagando pedido ${purchase.id} (${purchase.kgPurchased}kg - R$${purchase.totalAmount})`)
        await updatePurchase(purchase.id, { paymentStatus: 'paid' as any })
        append(`✅ Pedido ${purchase.id} marcado como pago`)
        paidCount++
      }

      if (paidCount > 0) {
        append(`🎉 ${paidCount} pedidos pagos. Executando batch update...`)
        const batchResult = await runBatchUpdate(queryId)
        append(`Batch result: ${batchResult.success ? 'SUCCESS' : 'COMPLETED WITH ISSUES'}`)
      }

      append(`🎉 Todos os pedidos da caixa ${queryId} foram processados com sucesso!`)

    } catch (err: any) {
      append('Error paying purchases: ' + (err.message || String(err)))
    }
  }

  const handleDeleteAllBoxes = async () => {
    append('⚠️ EXCLUINDO TODAS AS CAIXAS E SEUS PEDIDOS VINCULADOS...')
    try {
      const boxes = await getAllBoxes(true) // incluir deletadas também
      if (!boxes.length) {
        append('Nenhuma caixa encontrada para excluir.')
        return
      }
      
      append(`Encontradas ${boxes.length} caixas. Iniciando exclusão...`)
      
      for (const box of boxes) {
        append(`🗑️ Excluindo caixa "${box.name}" (${box.id}) e todos os seus pedidos...`)
        await permanentlyDeleteBox(box.id)
        append(`✅ Caixa ${box.id} e pedidos excluídos permanentemente`)
      }
      
      append(`🎉 Todas as ${boxes.length} caixas e seus pedidos foram excluídos com sucesso!`)
      append('💡 O banco de dados foi limpo completamente')
      
    } catch (err: any) {
      append('❌ Error deleting boxes: ' + (err.message || String(err)))
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

      <div className="flex items-center gap-2 mt-2">
          <button onClick={handleDeleteAllBoxes} className="px-3 py-1 bg-red-700 rounded font-bold hover:bg-red-800">🗑️ EXCLUIR TODAS AS CAIXAS</button>
          <span className="text-sm text-red-400">⚠️ CUIDADO: Isso excluirá permanentemente todas as caixas e pedidos!</span>
      </div>

      {/* Individual Purchase Management */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Gerenciar Pedidos Individuais</h3>
        
        {/* Box Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Selecionar Caixa:</label>
          <select
            value={selectedBoxId}
            onChange={(e) => setSelectedBoxId(e.target.value)}
            className="px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {allBoxes.map((box) => (
              <option key={box.id} value={box.id}>
                {box.name} ({box.status}) - {box.totalKg}kg total
              </option>
            ))}
          </select>
        </div>

        {devPurchases.length === 0 ? (
          <p className="text-gray-400 text-sm">
            {selectedBoxId ? 'Nenhum pedido encontrado para esta caixa.' : 'Selecione uma caixa para ver os pedidos.'}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => selectedBoxId && loadPurchasesForBox(selectedBoxId)} 
                className="px-3 py-1 bg-blue-600 rounded text-sm"
                disabled={!selectedBoxId}
              >
                🔄 Recarregar Pedidos
              </button>
              <span className="text-sm text-gray-400 self-center">
                {devPurchases.length} pedido(s) encontrado(s)
              </span>
            </div>

            {devPurchases.map((purchase) => (
              <div key={purchase.id} className="bg-gray-800 p-3 rounded flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Pedido: {purchase.id.slice(-8)}...
                  </div>
                  <div className="text-xs text-gray-400">
                    {purchase.kgPurchased}kg - R${purchase.totalAmount} |
                    Status: {purchase.status} |
                    Pagamento: <span className={purchase.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'}>
                      {purchase.paymentStatus}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {purchase.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => handlePayIndividualPurchase(purchase.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm font-medium"
                    >
                      💳 Pagar
                    </button>
                  )}
                  {purchase.paymentStatus === 'paid' && (
                    <span className="px-3 py-1 bg-green-800 text-green-300 rounded text-sm font-medium">
                      ✅ Pago
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 bg-gray-900 p-3 rounded max-h-96 overflow-auto">
        {logs.map((l, i) => (
          <div key={i} className="text-sm text-gray-300">{l}</div>
        ))}
      </div>
    </div>
  )
}
