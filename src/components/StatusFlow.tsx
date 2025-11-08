import React from 'react'
import { BoxStatus, OrderStatus } from '../types/status'

interface StatusFlowProps {
  currentStatus: BoxStatus | OrderStatus
  type: 'box' | 'order'
}

export default function StatusFlow({ currentStatus, type }: StatusFlowProps) {
  const boxStatuses = [
    { status: BoxStatus.WAITING_PURCHASES, label: 'Aguardando compras', color: 'bg-green-500' },
    { status: BoxStatus.WAITING_SUPPLIER_ORDER, label: 'Aguardando pedido ao fornecedor', color: 'bg-yellow-500' },
    { status: BoxStatus.WAITING_SUPPLIER_DELIVERY, label: 'Aguardando entrega fornecedor', color: 'bg-orange-500' },
    { status: BoxStatus.SUPPLIER_DELIVERY_RECEIVED, label: 'Entrega do fornecedor recebida', color: 'bg-blue-500' },
    { status: BoxStatus.DISPATCHING, label: 'Despachando', color: 'bg-purple-500' },
    { status: BoxStatus.COMPLETED, label: 'Finalizada', color: 'bg-gray-500' },
    { status: BoxStatus.CANCELLED, label: 'Cancelada', color: 'bg-red-600' }
  ]

  const orderStatuses = [
    { status: OrderStatus.WAITING_PAYMENT, label: 'Aguardando pagamento cliente', color: 'bg-orange-500' },
    { status: OrderStatus.WAITING_BOX_CLOSURE, label: 'Aguardando fechamento da caixa', color: 'bg-yellow-500' },
    { status: OrderStatus.IN_PURCHASE_PROCESS, label: 'Em processo de compra', color: 'bg-blue-500' },
    { status: OrderStatus.WAITING_SUPPLIER, label: 'Aguardando fornecedor - frigorífico', color: 'bg-indigo-500' },
    { status: OrderStatus.WAITING_CLIENT_SHIPMENT, label: 'Aguardando envio para o cliente', color: 'bg-cyan-500' },
    { status: OrderStatus.DISPATCHING_TO_CLIENT, label: 'Despachando para o cliente', color: 'bg-purple-500' },
    { status: OrderStatus.DELIVERED_TO_CLIENT, label: 'Entregue ao cliente', color: 'bg-green-500' },
    { status: OrderStatus.CANCELLED, label: 'Cancelado', color: 'bg-red-600' }
  ]

  const statuses = type === 'box' ? boxStatuses : orderStatuses
  const currentIndex = statuses.findIndex(s => s.status === currentStatus)

  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Fluxo de Status - {type === 'box' ? 'Caixa' : 'Pedido'}
      </h4>

      <div className="flex items-center justify-between relative">
        {/* Linha de conexão */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-300 -z-10"></div>

        {statuses.map((statusItem, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={statusItem.status} className="flex flex-col items-center flex-1">
              {/* Círculo do status */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mb-2 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? statusItem.color
                    : 'bg-gray-300'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Label do status */}
              <div className="text-center">
                <p
                  className={`text-xs font-medium leading-tight ${
                    isCurrent
                      ? 'text-gray-900'
                      : isCompleted
                      ? 'text-green-700'
                      : 'text-gray-500'
                  }`}
                >
                  {statusItem.label}
                </p>

                {/* Indicador de status atual */}
                {isCurrent && (
                  <div className="mt-1">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Status atual destacado */}
      <div className="mt-4 text-center">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          Status Atual: {statuses.find(s => s.status === currentStatus)?.label || currentStatus}
        </span>
      </div>
    </div>
  )
}