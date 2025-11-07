import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAllBoxes, getPurchasesForBox, updateBoxStatus } from '../firebase/boxes'
import { getUserProfile } from '../firebase/auth'
import { MeatBox, Purchase, UserProfile, BoxStatus } from '../types'

export default function AdminBoxDetails() {
  const { boxId } = useParams<{ boxId: string }>()
  const navigate = useNavigate()
  const [box, setBox] = useState<MeatBox | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (boxId) {
      loadBoxDetails()
    }
  }, [boxId])

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

  const handleStatusChange = async (newStatus: string) => {
    if (!box) return

    try {
      await updateBoxStatus(box.id, newStatus)
      await loadBoxDetails() // Recarregar dados
    } catch (error) {
      console.error('Error updating box status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_customer_purchases': return 'bg-green-100 text-green-800'
      case 'awaiting_supplier_purchase':
      case 'collecting_payments': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'awaiting_customer_purchases': return 'Ativa'
      case 'awaiting_supplier_purchase':
      case 'collecting_payments': return 'Coletando Pagamentos'
      case 'completed': return 'Finalizada'
      default: return status
    }
  }

  const getPurchaseStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_box_closure': return 'bg-blue-100 text-blue-800'
      case 'awaiting_payment': return 'bg-yellow-100 text-yellow-800'
      case 'awaiting_supplier': return 'bg-purple-100 text-purple-800'
      case 'dispatching': return 'bg-orange-100 text-orange-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPurchaseStatusText = (status: string) => {
    switch (status) {
      case 'awaiting_box_closure': return 'Aguardando Fechamento'
      case 'awaiting_payment': return 'Aguardando Pagamento'
      case 'awaiting_supplier': return 'Aguardando Fornecedor'
      case 'dispatching': return 'Despachando'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
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
            <h1 className="text-3xl font-bold text-gray-900">{box.name}</h1>
            <p className="text-gray-600">{box.brand}</p>
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

        {/* Status e Ações */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(box.status)}`}>
                {getStatusText(box.status)}
              </span>
              <span className="text-gray-600">
                Criada em {new Date(box.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex gap-2">
              {box.status === BoxStatus.WAITING_PURCHASES && (
                <button
                  onClick={() => handleStatusChange(BoxStatus.WAITING_SUPPLIER_ORDER)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Iniciar Cobrança
                </button>
              )}
              {box.status === BoxStatus.WAITING_SUPPLIER_ORDER && (
                <button
                  onClick={() => handleStatusChange(BoxStatus.COMPLETED)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Finalizar Caixa
                </button>
              )}
              {isFullyReserved && box.status === BoxStatus.WAITING_PURCHASES && (
                <button
                  onClick={() => handleStatusChange(BoxStatus.WAITING_SUPPLIER_ORDER)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium animate-pulse"
                >
                  🏆 Finalizar (100% Reservada!)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informações da Caixa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Detalhes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detalhes da Caixa</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Preço de Venda:</span>
                <span className="font-semibold text-gray-900">R$ {box.pricePerKg.toFixed(2)}/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Custo:</span>
                <span className="font-semibold text-gray-900">R$ {box.costPerKg.toFixed(2)}/kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade Total:</span>
                <span className="font-semibold text-gray-900">{box.totalKg}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Restante:</span>
                <span className="font-semibold text-gray-900">{box.remainingKg}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mínimo por Pessoa:</span>
                <span className="font-semibold text-gray-900">{box.minKgPerPerson}kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo de Pagamento:</span>
                <span className="font-semibold text-gray-900 capitalize">{box.paymentType === 'prepaid' ? 'Pré-pago' : 'Pós-pago'}</span>
              </div>
            </div>
          </div>

          {/* Progresso */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Progresso</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Reservado</span>
                  <span className={isFullyReserved ? 'font-bold text-green-600' : ''}>
                    {totalKgReserved.toFixed(1)}kg de {box.totalKg}kg
                    {isFullyReserved && ' 🎉'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isFullyReserved ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {isFullyReserved
                    ? 'Caixa totalmente reservada! Pronto para iniciar cobrança.'
                    : `${progressPercentage.toFixed(1)}% preenchido`
                  }
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{purchases.length}</p>
                  <p className="text-sm text-gray-600">Interessados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{box.remainingKg.toFixed(1)}kg</p>
                  <p className="text-sm text-gray-600">Disponível</p>
                </div>
              </div>
            </div>
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
                      Status
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPurchaseStatusColor(purchase.status)}`}>
                            {getPurchaseStatusText(purchase.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(purchase.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              const userProfile = userProfiles[purchase.userId]
                              alert(`Detalhes da Compra:\n\nCliente: ${userProfile?.name || 'Não informado'}\nEmail: ${userProfile?.email || 'Não informado'}\nQuantidade: ${purchase.kgPurchased}kg\nStatus: ${getPurchaseStatusText(purchase.status)}\nData: ${new Date(purchase.createdAt).toLocaleDateString('pt-BR')}\nStatus de Pagamento: ${purchase.paymentStatus}`)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}