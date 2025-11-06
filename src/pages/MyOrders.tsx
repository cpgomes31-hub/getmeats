import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from '../firebase/config'
import { getPurchasesForUser } from '../firebase/boxes'
import { useAuth } from '../context/AuthContext'
import { Purchase, MeatBox } from '../types'

export default function MyOrders() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [boxes, setBoxes] = useState<Map<string, MeatBox>>(new Map())
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadUserPurchases()
  }, [user])

  async function loadUserPurchases() {
    if (!user) return

    try {
      const userPurchases = await getPurchasesForUser(user.uid)
      setPurchases(userPurchases)

      // Load box details for each purchase
      const db = getFirestore(app)
      const boxPromises = userPurchases.map(async (purchase) => {
        const boxDoc = await getDoc(doc(db, 'boxes', purchase.boxId))
        if (boxDoc.exists()) {
          return { id: boxDoc.id, ...boxDoc.data() } as MeatBox
        }
        return null
      })

      const boxesData = await Promise.all(boxPromises)
      const boxesMap = new Map<string, MeatBox>()
      boxesData.forEach(box => {
        if (box) boxesMap.set(box.id, box)
      })
      setBoxes(boxesMap)
    } catch (error) {
      console.error('Error loading purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'awaiting_box_closure': return 'text-yellow-400'
      case 'awaiting_payment': return 'text-orange-400'
      case 'awaiting_supplier': return 'text-blue-400'
      case 'dispatching': return 'text-purple-400'
      case 'delivered': return 'text-green-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'awaiting_box_closure': return 'Aguardando fechamento da caixa'
      case 'awaiting_payment': return 'Aguardando pagamento'
      case 'awaiting_supplier': return 'Aguardando fornecedor'
      case 'dispatching': return 'Em despacho'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  function getPaymentStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'text-orange-400'
      case 'paid': return 'text-green-400'
      case 'refunded': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  function getPaymentStatusText(status: string) {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'paid': return 'Pago'
      case 'refunded': return 'Reembolsado'
      default: return status
    }
  }

  async function copyPaymentLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      alert('Link copiado para a área de transferência!')
    } catch (error) {
      console.error('Erro ao copiar link:', error)
      alert('Erro ao copiar link. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Carregando seus pedidos...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Meus Pedidos</h1>

      {purchases.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">Você ainda não fez nenhum pedido.</p>
          <p className="text-gray-500 mt-2">Que tal explorar nossas caixas disponíveis?</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-brand text-white px-6 py-2 rounded hover:bg-red-700 transition"
          >
            Ver Caixas Disponíveis
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {purchases.map((purchase) => {
            const box = boxes.get(purchase.boxId)
            if (!box) return null

            return (
              <div key={purchase.id} className="bg-gray-900 rounded-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-xl font-semibold">Pedido #{purchase.orderNumber}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(purchase.status)} bg-gray-800`}>
                        {getStatusText(purchase.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">Produto</p>
                        <p className="font-medium">{box.name}</p>
                        <p className="text-gray-400 text-sm">{box.brand}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-sm">Quantidade</p>
                        <p className="font-medium">{purchase.kgPurchased}kg</p>
                        <p className="text-gray-400 text-sm">R$ {box.pricePerKg.toFixed(2)}/kg</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-sm">Valor Total</p>
                        <p className="font-medium text-lg text-brand">R$ {purchase.totalAmount.toFixed(2)}</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-sm">Status do Pagamento</p>
                        <p className={`font-medium ${getPaymentStatusColor(purchase.paymentStatus)}`}>
                          {getPaymentStatusText(purchase.paymentStatus)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Data do Pedido</p>
                        <p className="font-medium">
                          {new Date(purchase.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      {purchase.paymentExpiresAt && (
                        <div>
                          <p className="text-gray-400 text-sm">Pagamento Expira em</p>
                          <p className="font-medium">
                            {new Date(purchase.paymentExpiresAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    {purchase.paymentLink && purchase.paymentStatus === 'pending' && (
                      <button
                        onClick={() => copyPaymentLink(purchase.paymentLink!)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm font-medium"
                      >
                        📋 Copiar Link Pix
                      </button>
                    )}

                    {purchase.paymentLink && (
                      <a
                        href={purchase.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition text-center text-sm font-medium"
                      >
                        💳 Pagar Agora
                      </a>
                    )}

                    <button
                      onClick={() => navigate(`/purchase/${box.id}`)}
                      className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition text-sm"
                    >
                      Ver Produto
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}