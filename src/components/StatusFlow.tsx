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
    { status: BoxStatus.COMPLETED, label: 'Finalizada', color: 'bg-green-500' },
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

  // Sempre mostrar todos os status, mas posicionar CANCELLED no final
  // e só destacá-lo quando for o status atual
  const visibleStatuses = [...statuses].sort((a, b) => {
    // CANCELLED sempre por último
    if (a.status === OrderStatus.CANCELLED || a.status === BoxStatus.CANCELLED) return 1
    if (b.status === OrderStatus.CANCELLED || b.status === BoxStatus.CANCELLED) return -1
    return 0
  })

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between relative">
        {/* Linha de conexão */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-600 -z-10"></div>

        {visibleStatuses.map((statusItem) => {
          // Encontrar o índice correto no array original
          const originalIndex = statuses.findIndex(s => s.status === statusItem.status)
          const isCompleted = originalIndex < currentIndex
          const isCurrent = originalIndex === currentIndex
          const isPending = originalIndex > currentIndex

          return (
            <div key={statusItem.status} className="flex flex-col items-center flex-1">
              {/* Círculo do status */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? statusItem.color
                    : 'bg-gray-400'
                }`}
              >
                {isCompleted ? '✓' : originalIndex + 1}
              </div>

              {/* Label do status */}
              <div className="text-center min-h-[2.5rem] flex items-center justify-center">
                <p
                  className={`text-sm font-medium leading-tight ${
                    isCurrent
                      ? 'text-blue-600 font-bold'
                      : isCompleted
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {statusItem.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}