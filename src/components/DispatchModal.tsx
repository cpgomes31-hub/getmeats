import React, { useState, useEffect } from 'react'
import { Purchase, UserProfile, OrderStatus } from '../types'
import { changePurchaseStatus, updatePurchase } from '../firebase/boxes'

interface DispatchModalProps {
  isOpen: boolean
  onClose: () => void
  purchase: Purchase
  userProfile: UserProfile | undefined
  onStatusChanged: () => void
}

export default function DispatchModal({
  isOpen,
  onClose,
  purchase,
  userProfile,
  onStatusChanged
}: DispatchModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [localDispatchSteps, setLocalDispatchSteps] = useState(() => {
    // If purchase is already dispatching, force orderSeparated to true
    const isAlreadyDispatching = purchase.status === OrderStatus.DISPATCHING_TO_CLIENT
    const existingSteps = purchase.dispatchSteps || {
      orderSeparated: false,
      pickedUpByDelivery: false
    }

    return {
      ...existingSteps,
      orderSeparated: existingSteps.orderSeparated || isAlreadyDispatching
    }
  })

  // Update local state when purchase prop changes
  useEffect(() => {
    // If purchase is already dispatching, force orderSeparated to true
    const isAlreadyDispatching = purchase.status === OrderStatus.DISPATCHING_TO_CLIENT
    const existingSteps = purchase.dispatchSteps || {
      orderSeparated: false,
      pickedUpByDelivery: false
    }

    setLocalDispatchSteps({
      ...existingSteps,
      orderSeparated: existingSteps.orderSeparated || isAlreadyDispatching
    })
  }, [purchase.dispatchSteps, purchase.status])

  const handleOrderSeparated = async () => {
    try {
      setSubmitting(true)
      setError('')

      // Update purchase with dispatch step and change status
      const now = new Date().toISOString()
      const updatedDispatchSteps = {
        ...localDispatchSteps,
        orderSeparated: true,
        separatedAt: now
      }

      // First update the dispatch steps
      await updatePurchase(purchase.id, {
        dispatchSteps: updatedDispatchSteps
      })

      setLocalDispatchSteps(updatedDispatchSteps)

      // Then change status to DISPATCHING_TO_CLIENT
      await changePurchaseStatus(purchase, OrderStatus.DISPATCHING_TO_CLIENT, {
        userId: 'admin', // TODO: get from auth context
        reason: 'Pedido separado para despacho'
      })

      onStatusChanged()
      onClose()
    } catch (err: any) {
      console.error('Error separating order:', err)
      setError(err?.message || 'Erro ao separar pedido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTogglePickedUp = async (checked: boolean) => {
    // Only allow toggling if order has been separated
    if (!localDispatchSteps.orderSeparated) {
      return
    }

    try {
      const now = checked ? new Date().toISOString() : undefined
      const updatedDispatchSteps = {
        ...localDispatchSteps,
        pickedUpByDelivery: checked,
        pickedUpAt: now
      }

      await updatePurchase(purchase.id, {
        dispatchSteps: updatedDispatchSteps
      })

      setLocalDispatchSteps(updatedDispatchSteps)
      onStatusChanged()
    } catch (err: any) {
      console.error('Error updating pickup status:', err)
      setError(err?.message || 'Erro ao atualizar status de retirada')
    }
  }

  const handleConfirmDelivery = async () => {
    try {
      setSubmitting(true)
      setError('')

      // Change status to DELIVERED_TO_CLIENT
      await changePurchaseStatus(purchase, OrderStatus.DELIVERED_TO_CLIENT, {
        userId: 'admin', // TODO: get from auth context
        reason: 'Entrega confirmada pelo administrador'
      })

      onStatusChanged()
      onClose()
    } catch (err: any) {
      console.error('Error confirming delivery:', err)
      setError(err?.message || 'Erro ao confirmar entrega')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Despachar Pedido</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Customer Data */}
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-3 text-gray-900">Dados do Cliente</h4>
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-medium">{userProfile?.name || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{userProfile?.email || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">CPF</p>
              <p className="font-medium">{userProfile?.cpf || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-medium">{userProfile?.phone || 'Não informado'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600">Endereço</p>
              <p className="font-medium">
                {userProfile?.street && userProfile?.number
                  ? `${userProfile.street}, ${userProfile.number}${userProfile.complement ? ` - ${userProfile.complement}` : ''}`
                  : 'Não informado'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {userProfile?.cep ? `${userProfile.cep} - ` : ''}
                {userProfile?.city && userProfile?.state ? `${userProfile.city}/${userProfile.state}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Purchase Data */}
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-3 text-gray-900">Dados da Compra</h4>
          <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Número do Pedido</p>
              <p className="font-medium">{purchase.orderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Quantidade</p>
              <p className="font-medium">{purchase.kgPurchased}kg</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Valor Total</p>
              <p className="font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.totalAmount || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status do Pagamento</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                purchase.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {purchase.paymentStatus === 'paid' ? 'Pago' :
                 purchase.paymentStatus === 'pending' ? 'Pendente' : 'Reembolsado'}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data da Compra</p>
              <p className="font-medium">{new Date(purchase.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status Atual</p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                purchase.status === OrderStatus.WAITING_CLIENT_SHIPMENT ? 'bg-orange-100 text-orange-800' :
                purchase.status === OrderStatus.DISPATCHING_TO_CLIENT ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {purchase.status === OrderStatus.WAITING_CLIENT_SHIPMENT ? 'Aguardando Envio' :
                 purchase.status === OrderStatus.DISPATCHING_TO_CLIENT ? 'Despachando' :
                 purchase.status}
              </span>
            </div>
          </div>
        </div>

        {/* Dispatch Checklist */}
        <div className="mb-6">
          <h4 className="text-lg font-medium mb-3 text-gray-900">Checklist de Despacho</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={localDispatchSteps.orderSeparated}
                disabled
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Pedido separado
                {localDispatchSteps.separatedAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({new Date(localDispatchSteps.separatedAt).toLocaleString('pt-BR')})
                  </span>
                )}
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={localDispatchSteps.pickedUpByDelivery}
                onChange={(e) => handleTogglePickedUp(e.target.checked)}
                disabled={!localDispatchSteps.orderSeparated}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label className={`text-sm font-medium ${localDispatchSteps.orderSeparated ? 'text-gray-700' : 'text-gray-400'}`}>
                Retirado pelo entregador
                {localDispatchSteps.pickedUpAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({new Date(localDispatchSteps.pickedUpAt).toLocaleString('pt-BR')})
                  </span>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
          {!localDispatchSteps.orderSeparated && purchase.status === OrderStatus.WAITING_CLIENT_SHIPMENT && (
            <button
              onClick={handleOrderSeparated}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Separando...' : 'Despachar pedido'}
            </button>
          )}
          {localDispatchSteps.orderSeparated && purchase.status === OrderStatus.DISPATCHING_TO_CLIENT && (
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Confirmar
            </button>
          )}
          {(localDispatchSteps.orderSeparated && purchase.status !== OrderStatus.DISPATCHING_TO_CLIENT) && (
            <button
              onClick={onClose}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}