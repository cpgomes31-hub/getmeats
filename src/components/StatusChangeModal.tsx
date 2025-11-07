import React, { useState } from 'react'
import { BoxStatus, OrderStatus, isValidStatusTransition, getValidNextStatuses } from '../types/status'

interface StatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  currentStatus: BoxStatus | OrderStatus
  newStatus: BoxStatus | OrderStatus
  type: 'box' | 'order'
  onConfirm: () => void
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
  const [error, setError] = useState('')

  const isValidTransition = isValidStatusTransition(currentStatus, newStatus, type)
  const validNextStatuses = getValidNextStatuses(currentStatus, type)

  const handleInitialConfirm = () => {
    if (isValidTransition) {
      onConfirm()
      onClose()
    } else {
      setShowAuth(true)
    }
  }

  const handleForcedChange = async () => {
    // Aqui você implementaria a validação da senha do admin
    // Por enquanto, vamos simular uma validação simples
    if (adminPassword === 'admin123') { // Em produção, isso seria validado no backend
      onConfirm()
      onClose()
      setAdminPassword('')
      setShowAuth(false)
      setError('')
    } else {
      setError('Senha incorreta. Tente novamente.')
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
                className={`flex-1 py-2 px-4 rounded text-white ${
                  isValidTransition
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isValidTransition ? 'Confirmar' : 'Continuar com Alteração Forçada'}
              </button>
            </div>
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
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
              >
                Confirmar Alteração Forçada
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}