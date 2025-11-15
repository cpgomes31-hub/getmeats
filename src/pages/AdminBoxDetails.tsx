import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAllBoxes, getPurchasesForBox, changeBoxStatus, changePurchaseStatus, updatePurchase } from '../firebase/boxes'
import { OrderStatus, BoxStatus } from '../types'
import { getValidNextStatuses, isValidStatusTransition } from '../types/status'
import StatusChangeModal from '../components/StatusChangeModal'
import DispatchModal from '../components/DispatchModal'
import StatusFlow from '../components/StatusFlow'
import { getUserProfile } from '../firebase/auth'
import { MeatBox, Purchase, UserProfile } from '../types'
import { useAuth } from '../context/AuthContext'

export default function AdminBoxDetails() {
  const { boxId } = useParams<{ boxId: string }>()
  const navigate = useNavigate()
  const [box, setBox] = useState<MeatBox | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [desiredNewStatus, setDesiredNewStatus] = useState<OrderStatus | null>(null)
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false)
  const [dispatchPurchase, setDispatchPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    if (boxId) {
      loadBoxDetails()
    }
  }, [boxId])

  const { user } = useAuth()

  const loadBoxDetails = async () => {
    if (!boxId) return

    try {
      // Carregar dados da caixa
      const allBoxes = await getAllBoxes()
      const foundBox = allBoxes.find(b => b.id === boxId)
      if (foundBox) {
        setBox(foundBox)
      }

      // Carregar compras da caixa
      const boxPurchases = await getPurchasesForBox(boxId)
      setPurchases(boxPurchases)

      // Carregar dados dos usuários
      const userIds = [...new Set(boxPurchases.map(p => p.userId))]
      const userProfilesData: Record<string, UserProfile> = {}

      for (const userId of userIds) {
        const profile = await getUserProfile(userId)
        if (profile) {
          userProfilesData[userId] = profile as UserProfile
        }
      }

      setUserProfiles(userProfilesData)
    } catch (error) {
      console.error('Error loading box details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: BoxStatus) => {
    if (!box) return

    try {
      await changeBoxStatus(box, newStatus, { userId: user?.uid || 'system', reason: 'Admin changed status via details view', force: false })
      await loadBoxDetails() // Recarregar dados
    } catch (error) {
      console.error('Error updating box status:', error)
    }
  }

  const openEditPurchaseStatus = (purchase: Purchase) => {
    // Determine default next status: prefer the first valid next status, but
    // ensure DISPATCHING_TO_CLIENT is available so admin can mark dispatching.
    const validNext = getValidNextStatuses(purchase.status, 'order') as OrderStatus[]
    let defaultNext: OrderStatus | null = validNext && validNext.length ? validNext[0] : null
    if (!validNext.includes(OrderStatus.DISPATCHING_TO_CLIENT)) {
      // if dispatching isn't a natural next, allow admin to pick it explicitly
      // by default.
      defaultNext = defaultNext || OrderStatus.DISPATCHING_TO_CLIENT
    }
    setSelectedPurchase(purchase)
    setDesiredNewStatus(defaultNext)
    setIsStatusModalOpen(true)
  }

  const closeStatusModal = () => {
    setIsStatusModalOpen(false)
    setSelectedPurchase(null)
    setDesiredNewStatus(null)
  }

  const openDispatchModal = (purchase: Purchase) => {
    setDispatchPurchase(purchase)
    setIsDispatchModalOpen(true)
  }

  const closeDispatchModal = () => {
    setIsDispatchModalOpen(false)
    setDispatchPurchase(null)
  }

  const handleConfirmDelivery = async (purchase: Purchase) => {
    try {
      await changePurchaseStatus(purchase, OrderStatus.DELIVERED_TO_CLIENT, {
        userId: user?.uid || 'system',
        reason: 'Entrega confirmada pelo administrador'
      })
      await loadBoxDetails()
      alert('Entrega confirmada com sucesso!')
    } catch (err: any) {
      console.error('Error confirming delivery:', err)
      alert('Erro ao confirmar entrega: ' + err.message)
    }
  }

  const handleConfirmPurchaseStatusChange = async ({ forced }: { forced: boolean; reason?: string; password?: string }) => {
    if (!selectedPurchase || !desiredNewStatus) throw new Error('No purchase or new status selected')
    try {
      const res = await changePurchaseStatus(selectedPurchase, desiredNewStatus, { userId: user?.uid || 'system', reason: (arguments[0] as any)?.reason, force: forced })
      await loadBoxDetails()
      if (res && res.boxUpdated) {
        alert('Pedido atualizado e caixa automaticamente alterada.')
      } else {
        alert('Pedido atualizado com sucesso.')
      }
    } catch (err: any) {
      console.error('Error changing purchase status:', err)
      throw err
    }
  }

  const getStatusColor = (status: BoxStatus, isDeleted: boolean = false) => {
    if (isDeleted) return 'bg-gray-100 text-gray-500'
    switch (status) {
      case BoxStatus.WAITING_PURCHASES: return 'bg-green-100 text-green-800'
      case BoxStatus.WAITING_SUPPLIER_ORDER: return 'bg-yellow-100 text-yellow-800'
      case BoxStatus.WAITING_SUPPLIER_DELIVERY: return 'bg-blue-100 text-blue-800'
      case BoxStatus.SUPPLIER_DELIVERY_RECEIVED: return 'bg-purple-100 text-purple-800'
      case BoxStatus.DISPATCHING: return 'bg-orange-100 text-orange-800'
      case BoxStatus.COMPLETED: return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: BoxStatus, isDeleted: boolean = false) => {
    if (isDeleted) return 'Excluída'
    switch (status) {
      case BoxStatus.WAITING_PURCHASES: return 'Aguardando Compras'
      case BoxStatus.WAITING_SUPPLIER_ORDER: return 'Aguardando Pedido'
      case BoxStatus.WAITING_SUPPLIER_DELIVERY: return 'Aguardando Entrega'
      case BoxStatus.SUPPLIER_DELIVERY_RECEIVED: return 'Mercadoria Recebida'
      case BoxStatus.DISPATCHING: return 'Despachando'
      case BoxStatus.COMPLETED: return 'Finalizada'
      default: return status
    }
  }

  const getPurchaseStatusColor = (status: string) => {
    switch (status) {
      case OrderStatus.WAITING_PAYMENT: return 'bg-yellow-100 text-yellow-800'
      case OrderStatus.WAITING_BOX_CLOSURE: return 'bg-blue-100 text-blue-800'
      case OrderStatus.IN_PURCHASE_PROCESS: return 'bg-purple-100 text-purple-800'
      case OrderStatus.WAITING_SUPPLIER: return 'bg-indigo-100 text-indigo-800'
      case OrderStatus.WAITING_CLIENT_SHIPMENT: return 'bg-orange-100 text-orange-800'
      case OrderStatus.DISPATCHING_TO_CLIENT: return 'bg-red-100 text-red-800'
      case OrderStatus.DELIVERED_TO_CLIENT: return 'bg-green-100 text-green-800'
      case OrderStatus.CANCELLED: return 'bg-gray-100 text-gray-800'
      // Fallback para strings antigas
      case 'awaiting_box_closure': return 'bg-blue-100 text-blue-800'
      case 'awaiting_payment': return 'bg-yellow-100 text-yellow-800'
      case 'awaiting_supplier': return 'bg-purple-100 text-purple-800'
      case 'dispatching': return 'bg-orange-100 text-orange-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'delivered_to_client': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPurchaseStatusText = (status: string) => {
    switch (status) {
      case OrderStatus.WAITING_PAYMENT: return 'Aguardando Pagamento'
      case OrderStatus.WAITING_BOX_CLOSURE: return 'Aguardando Fechamento'
      case OrderStatus.IN_PURCHASE_PROCESS: return 'Em Processo'
      case OrderStatus.WAITING_SUPPLIER: return 'Aguardando Fornecedor'
      case OrderStatus.WAITING_CLIENT_SHIPMENT: return 'Aguardando Envio'
      case OrderStatus.DISPATCHING_TO_CLIENT: return 'Despachando'
      case OrderStatus.DELIVERED_TO_CLIENT: return 'Entregue'
      case OrderStatus.CANCELLED: return 'Cancelado'
      // Fallback para strings antigas
      case 'awaiting_box_closure': return 'Aguardando Fechamento'
      case 'awaiting_payment': return 'Aguardando Pagamento'
      case 'awaiting_supplier': return 'Aguardando Fornecedor'
      case 'dispatching': return 'Despachando'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'refunded': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'paid': return 'Pago'
      case 'refunded': return 'Reembolsado'
      default: return status
    }
  }

  const totalKgReserved = purchases.reduce((sum, purchase) => sum + purchase.kgPurchased, 0)
  const progressPercentage = box && box.totalKg > 0 ? ((totalKgReserved / box.totalKg) * 100) : 0
  const isFullyReserved = progressPercentage >= 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Carregando detalhes da caixa...</p>
        </div>
      </div>
    )
  }

  if (!box) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Caixa não encontrada.</p>
          <Link
            to="/admin"
            className="text-blue-600 hover:text-blue-800 underline mt-4 inline-block"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detalhes da Caixa</h1>
            <p className="text-gray-600">Visualização completa da caixa selecionada</p>
          </div>
          <div className="flex gap-4">
            <Link
              to={`/admin/box/${box.id}/edit`}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Editar Caixa
            </Link>
            <Link
              to="/admin"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ← Voltar ao Painel
            </Link>
          </div>
        </div>

        {/* Card da Caixa - Mesmo layout da tela Admin */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-6 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {box.name} | {box.brand}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-72 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${box.totalKg > 0 ? ((box.totalKg - box.remainingKg) / box.totalKg) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-gray-700">
                    {box.totalKg > 0 ? Math.round(((box.totalKg - box.remainingKg) / box.totalKg) * 100) : 0}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Criada em {new Date(box.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(box.status)}`}>
              {getStatusText(box.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-700">Preço/kg</p>
              <p className="font-semibold text-gray-900 text-sm">R$ {box.pricePerKg.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Total</p>
              <p className="font-semibold text-gray-900 text-sm">{box.totalKg}kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Restante</p>
              <p className="font-semibold text-gray-900 text-sm">{box.remainingKg}kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Mínimo/pessoa</p>
              <p className="font-semibold text-gray-900 text-sm">{box.minKgPerPerson}kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-700">Pagamento</p>
              <p className="font-semibold text-gray-900 text-sm capitalize">{box.paymentType === 'prepaid' ? 'Pré-pago' : 'Pós-pago'}</p>
            </div>
          </div>

          {/* Fluxo de Status */}
          <StatusFlow currentStatus={box.status} type="box" />

          {/* Ações */}
          <div className="flex flex-wrap gap-1 mt-3">
            <Link
              to={`/admin/box/${box.id}/edit`}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Editar
            </Link>
            {box.status === BoxStatus.WAITING_PURCHASES && (
              <button
                onClick={() => handleStatusChange(BoxStatus.WAITING_SUPPLIER_ORDER)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Iniciar Pedido
              </button>
            )}
            {box.status === BoxStatus.WAITING_SUPPLIER_ORDER && (
              <button
                onClick={() => handleStatusChange(BoxStatus.WAITING_SUPPLIER_DELIVERY)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Pedido Realizado
              </button>
            )}
            {box.status === BoxStatus.WAITING_SUPPLIER_DELIVERY && (
              <button
                onClick={() => handleStatusChange(BoxStatus.SUPPLIER_DELIVERY_RECEIVED)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Mercadoria Recebida
              </button>
            )}
            {box.status === BoxStatus.SUPPLIER_DELIVERY_RECEIVED && (
              <button
                onClick={() => handleStatusChange(BoxStatus.DISPATCHING)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Iniciar Despacho
              </button>
            )}
            {box.status === BoxStatus.DISPATCHING && (
              <button
                onClick={() => handleStatusChange(BoxStatus.COMPLETED)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium"
              >
                Finalizar Caixa
              </button>
            )}
          </div>
        </div>

        {/* Lista de Compras Sinalizadas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Compras Sinalizadas ({purchases.length})
          </h2>

          {purchases.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma compra sinalizada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pagamento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Despacho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((purchase) => {
                    const userProfile = userProfiles[purchase.userId]
                    return (
                      <tr key={purchase.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {userProfile?.name || `Usuário ${purchase.userId.slice(-8)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userProfile?.email || `ID: ${purchase.userId}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {purchase.kgPurchased}kg
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                            {getPaymentStatusText(purchase.paymentStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.totalAmount || 0)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurchaseStatusColor(purchase.status)}`}>
                            {getPurchaseStatusText(purchase.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(purchase.status === OrderStatus.WAITING_CLIENT_SHIPMENT ||
                            purchase.status === OrderStatus.DISPATCHING_TO_CLIENT ||
                            purchase.status === OrderStatus.DELIVERED_TO_CLIENT) && (
                            <div className="space-y-1">
                              <div className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={purchase.dispatchSteps?.orderSeparated || false}
                                  disabled
                                  className="mr-1 h-3 w-3"
                                />
                                <span className={purchase.dispatchSteps?.orderSeparated ? 'text-green-600' : 'text-gray-400'}>
                                  Separado
                                </span>
                              </div>
                              <div className="flex items-center text-xs">
                                <input
                                  type="checkbox"
                                  checked={purchase.dispatchSteps?.pickedUpByDelivery || false}
                                  disabled
                                  className="mr-1 h-3 w-3"
                                />
                                <span className={purchase.dispatchSteps?.pickedUpByDelivery ? 'text-green-600' : 'text-gray-400'}>
                                  Retirado
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(purchase.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                          {(purchase.status === OrderStatus.WAITING_CLIENT_SHIPMENT ||
                            purchase.status === OrderStatus.DISPATCHING_TO_CLIENT) && (
                            <button
                              onClick={() => openDispatchModal(purchase)}
                              className="block text-blue-600 hover:text-blue-900"
                            >
                              Despachar pedido
                            </button>
                          )}
                          {purchase.status === OrderStatus.DISPATCHING_TO_CLIENT && 
                           purchase.dispatchSteps?.orderSeparated && 
                           purchase.dispatchSteps?.pickedUpByDelivery && (
                            <button
                              onClick={() => handleConfirmDelivery(purchase)}
                              className="block text-green-600 hover:text-green-900 font-semibold"
                            >
                              Confirmar entrega
                            </button>
                          )}
                          {box.paymentType !== 'prepaid' && (
                            <button
                              onClick={() => openEditPurchaseStatus(purchase)}
                              className="block text-indigo-600 hover:text-indigo-900"
                            >
                              Editar Status
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status edit modal for purchases */}
        {selectedPurchase && desiredNewStatus && (
          <StatusChangeModal
            isOpen={isStatusModalOpen}
            onClose={closeStatusModal}
            currentStatus={selectedPurchase!.status}
            newStatus={desiredNewStatus!}
            type="order"
            itemName={`Pedido ${selectedPurchase!.orderNumber}`}
            onConfirm={async (opts) => {
              await handleConfirmPurchaseStatusChange(opts as any)
            }}
          />
        )}

        {/* Dispatch modal for purchases */}
        {dispatchPurchase && (
          <DispatchModal
            isOpen={isDispatchModalOpen}
            onClose={closeDispatchModal}
            purchase={dispatchPurchase}
            userProfile={userProfiles[dispatchPurchase.userId]}
            onStatusChanged={loadBoxDetails}
          />
        )}
      </div>
    </div>
  )
}