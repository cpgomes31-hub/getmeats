import React, { useEffect, useState } from 'react'
import { BoxStatus, OrderStatus, isValidStatusTransition, getValidNextStatuses } from '../types/status'

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentStatus: BoxStatus | OrderStatus
  newStatus: BoxStatus | OrderStatus
  type: 'box' | 'order'
  onConfirm: (options: { forced: boolean; reason?: string; password?: string }) => Promise<void>
  itemName: string
}

export default function StatusChangeModal({
  isOpen,
  onClose,
  currentStatus,
  newStatus,
  type,
  onConfirm,
  itemName
}: StatusChangeModalProps) {
  const [adminPassword, setAdminPassword] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setAdminPassword('')
      setShowAuth(false)
      setReason('')
      setError('')
      setSubmitting(false)
    }
  }, [isOpen])

  const isValidTransition = isValidStatusTransition(currentStatus, newStatus, type)
  const validNextStatuses = getValidNextStatuses(currentStatus, type)

  const handleInitialConfirm = async () => {
    if (isValidTransition) {
      try {
        setSubmitting(true)
        setError('')
        await onConfirm({ forced: false })
        onClose()
      } catch (err: any) {
        // Surface error to the user instead of leaving modal silent
        console.error('Error confirming status change:', err)
        setError(err?.message || 'Erro ao confirmar alteração. Verifique o console.')
      } finally {
        setSubmitting(false)
      }
    } else {
      setShowAuth(true)
    }
  }

  const handleForcedChange = async () => {
    if (!reason.trim()) {
      setError('Informe o motivo da alteração forçada.')
      return
    }

    try {
      setSubmitting(true)
      await onConfirm({ forced: true, reason: reason.trim(), password: adminPassword })
      onClose()
      setAdminPassword('')
      setReason('')
      setShowAuth(false)
      setError('')
    } catch (authError: any) {
      setError(authError?.message || 'Não foi possível confirmar. Verifique os dados e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusDisplayName = (status: BoxStatus | OrderStatus) => {
    const statusMap: Record<string, string> = {
      [BoxStatus.WAITING_PURCHASES]: 'Aguardando compras',
      [BoxStatus.WAITING_SUPPLIER_ORDER]: 'Aguardando pedido ao fornecedor',
      [BoxStatus.WAITING_SUPPLIER_DELIVERY]: 'Aguardando entrega fornecedor',
      [BoxStatus.SUPPLIER_DELIVERY_RECEIVED]: 'Entrega do fornecedor recebida',
      [BoxStatus.DISPATCHING]: 'Despachando',
      [BoxStatus.COMPLETED]: 'Finalizada',
      [BoxStatus.CANCELLED]: 'Cancelada',
      [OrderStatus.WAITING_PAYMENT]: 'Aguardando pagamento cliente',
      [OrderStatus.WAITING_BOX_CLOSURE]: 'Aguardando fechamento da caixa',
      [OrderStatus.IN_PURCHASE_PROCESS]: 'Em processo de compra',
      [OrderStatus.WAITING_SUPPLIER]: 'Aguardando fornecedor - frigorífico',
      [OrderStatus.WAITING_CLIENT_SHIPMENT]: 'Aguardando envio para o cliente',
      [OrderStatus.DISPATCHING_TO_CLIENT]: 'Despachando para o cliente',
      [OrderStatus.DELIVERED_TO_CLIENT]: 'Entregue ao cliente',
      [OrderStatus.CANCELLED]: 'Cancelado'
    }
    return statusMap[status] || status
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {!showAuth ? (
          <>
            <h3 className="text-lg font-semibold mb-4">Confirmação de Alteração</h3>

            {!isValidTransition && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-red-800 text-sm">
                  ⚠️ <strong>Alteração Forçada Detectada!</strong>
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Esta transição não segue o fluxo normal do sistema.
                </p>
              </div>
            )}

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>Item:</strong> {itemName}
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Status Atual:</strong> {getStatusDisplayName(currentStatus)}
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Novo Status:</strong> {getStatusDisplayName(newStatus)}
              </p>

              {isValidTransition ? (
                <p className="text-green-600 text-sm">
                  ✅ Esta é uma transição válida no fluxo do sistema.
                </p>
              ) : (
                <div className="mt-3">
                  <p className="text-gray-600 text-sm mb-2">
                    <strong>Transições válidas do status atual:</strong>
                  </p>
                  <ul className="text-sm text-gray-500 list-disc list-inside">
                    {validNextStatuses.map(status => (
                      <li key={status}>{getStatusDisplayName(status)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleInitialConfirm}
                disabled={submitting}
                className={`flex-1 py-2 px-4 rounded text-white ${
                  isValidTransition
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting ? 'Confirmando...' : isValidTransition ? 'Confirmar' : 'Continuar com Alteração Forçada'}
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">Autenticação Necessária</h3>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                🔐 <strong>Alteração Forçada Requer Autenticação</strong>
              </p>
              <p className="text-yellow-700 text-sm mt-1">
                Digite a senha do administrador para confirmar esta alteração.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo da alteração
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Descreva o motivo da alteração fora de fluxo"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha do Administrador
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Digite a senha..."
              />
              {error && (
                <p className="text-red-600 text-sm mt-1">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAuth(false)
                  setAdminPassword('')
                  setError('')
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Voltar
              </button>
              <button
                onClick={handleForcedChange}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Confirmando...' : 'Confirmar Alteração Forçada'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}