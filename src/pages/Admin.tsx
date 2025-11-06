import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllBoxes, getPurchasesForBox, deleteBox, restoreBox, updateBoxStatus, permanentlyDeleteBox } from '../firebase/boxes'
import { MeatBox } from '../types'
import { useAuth } from '../context/AuthContext'
import { saveUserProfile } from '../firebase/auth'

export default function AdminPage() {
  const { user, profile } = useAuth()
  const [boxes, setBoxes] = useState<MeatBox[]>([])
  const [deletedBoxes, setDeletedBoxes] = useState<MeatBox[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'deleted'>('all')

  // Debug
  console.log('Admin Debug:', { user: user?.email, profile, role: profile?.role })

  useEffect(() => {
    loadBoxes()
  }, [])

  const loadBoxes = async () => {
    try {
      const allBoxes = await getAllBoxes(true) // Include deleted
      const activeBoxes = allBoxes.filter(box => !box.deletedAt)
      const deletedBoxesList = allBoxes.filter(box => box.deletedAt)
      setBoxes(activeBoxes)
      setDeletedBoxes(deletedBoxesList)
    } catch (error) {
      console.error('Error loading boxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetManagerRole = async () => {
    if (!user) return

    try {
      await saveUserProfile(user.uid, {
        ...profile,
        role: 'manager'
      })
      alert('✅ Permissões de administrador definidas com sucesso!')
      window.location.reload() // Recarregar para atualizar o contexto
    } catch (error) {
      console.error('Error setting manager role:', error)
      alert('❌ Erro ao definir permissões.')
    }
  }

  const handleStatusChange = async (boxId: string, newStatus: string) => {
    try {
      await updateBoxStatus(boxId, newStatus)
      await loadBoxes() // Recarregar lista
    } catch (error) {
      console.error('Error updating box status:', error)
    }
  }

  const handleDeleteBox = async (box: MeatBox) => {
    try {
      // Verificar se há compras sinalizadas
      const purchases = await getPurchasesForBox(box.id)

      if (purchases.length > 0) {
        const confirmDelete = window.confirm(
          `⚠️ ATENÇÃO: Esta caixa tem ${purchases.length} compra(s) sinalizada(s).\n\n` +
          `Ao excluir, as compras serão canceladas automaticamente.\n\n` +
          `Tem certeza que deseja excluir "${box.name}"?`
        )

        if (!confirmDelete) return
      } else {
        const confirmDelete = window.confirm(
          `Tem certeza que deseja excluir a caixa "${box.name}"?\n\n` +
          `Ela poderá ser restaurada posteriormente.`
        )

        if (!confirmDelete) return
      }

      await deleteBox(box.id)
      alert('✅ Caixa excluída com sucesso!')
      await loadBoxes()
    } catch (error) {
      console.error('Error deleting box:', error)
      alert('❌ Erro ao excluir caixa.')
    }
  }

  const handleRestoreBox = async (box: MeatBox) => {
    try {
      const confirmRestore = window.confirm(
        `Tem certeza que deseja restaurar a caixa "${box.name}"?`
      )

      if (!confirmRestore) return

      await restoreBox(box.id)
      alert('✅ Caixa restaurada com sucesso!')
      await loadBoxes()
    } catch (error) {
      console.error('Error restoring box:', error)
      alert('❌ Erro ao restaurar caixa.')
    }
  }

  const handlePermanentlyDeleteBox = async (box: MeatBox) => {
    try {
      const confirmDelete = window.confirm(
        `⚠️ ATENÇÃO: Exclusão IRREVERSÍVEL!\n\n` +
        `A caixa "${box.name}" será removida PERMANENTEMENTE do banco de dados.\n` +
        `Esta ação não pode ser desfeita!\n\n` +
        `Tem certeza absoluta que deseja continuar?`
      )

      if (!confirmDelete) return

      // Confirmação adicional
      const doubleConfirm = window.confirm(
        `CONFIRMAÇÃO FINAL: Digite "EXCLUIR" para confirmar a exclusão permanente de "${box.name}"`
      )

      if (!doubleConfirm) return

      await permanentlyDeleteBox(box.id)
      alert('✅ Caixa excluída permanentemente!')
      await loadBoxes()
    } catch (error) {
      console.error('Error permanently deleting box:', error)
      alert('❌ Erro ao excluir caixa permanentemente.')
    }
  }

  const filteredBoxes = (() => {
    switch (filter) {
      case 'active':
        return boxes.filter(b => b.status === 'awaiting_customer_purchases')
      case 'completed':
        return boxes.filter(b => b.status === 'completed')
      case 'deleted':
        return deletedBoxes
      default:
        return boxes
    }
  })()

  const getStatusColor = (status: string, isDeleted: boolean = false) => {
    if (isDeleted) return 'bg-gray-100 text-gray-600'
    switch (status) {
      case 'awaiting_customer_purchases': return 'bg-green-100 text-green-800'
      case 'awaiting_supplier_purchase':
      case 'collecting_payments': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string, isDeleted: boolean = false) => {
    if (isDeleted) return 'Excluída'
    switch (status) {
      case 'awaiting_customer_purchases': return 'Ativa'
      case 'awaiting_supplier_purchase':
      case 'collecting_payments': return 'Coletando Pagamentos'
      case 'completed': return 'Finalizada'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Carregando caixas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profile?.role !== 'manager' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Atenção:</strong> Você não tem permissões de administrador.
                  Ative as permissões para gerenciar caixas e usuários.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div className="mb-4">
            <p className="text-sm text-gray-900">
              Usuário: {user?.email} | Role: {profile?.role || 'Não definido'}
            </p>
          </div>
          <div className="flex gap-4">
            {profile?.role !== 'manager' && (
              <button
                onClick={handleSetManagerRole}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                🔑 Ativar Admin
              </button>
            )}
            {!profile?.role && (
              <button
                onClick={handleSetManagerRole}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                ⚡ Forçar Admin
              </button>
            )}
            <Link
              to="/admin/new"
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              + Nova Caixa
            </Link>
            <Link
              to="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ← Voltar ao Site
            </Link>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ativas ({boxes.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'active' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Aguardando ({boxes.filter(b => b.status === 'awaiting_customer_purchases').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'completed' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Finalizadas ({boxes.filter(b => b.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('deleted')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'deleted' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Excluídas ({deletedBoxes.length})
            </button>
          </div>
        </div>

        {/* Lista de Caixas */}
        <div className="grid gap-6">
          {filteredBoxes.map((box) => {
            const isDeleted = !!box.deletedAt
            return (
              <div key={box.id} className={`bg-white rounded-lg shadow-md p-6 ${isDeleted ? 'opacity-75 border-2 border-gray-300' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className={`text-xl font-semibold ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {box.name}
                    </h3>
                    <p className="text-gray-700">{box.brand}</p>
                    {isDeleted && (
                      <p className="text-sm text-gray-500 mt-1">
                        Excluída em {new Date(box.deletedAt!).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(box.status, isDeleted)}`}>
                    {getStatusText(box.status, isDeleted)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-700">Preço/kg</p>
                    <p className="font-semibold text-gray-900">R$ {box.pricePerKg.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Total</p>
                    <p className="font-semibold text-gray-900">{box.totalKg}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Restante</p>
                    <p className="font-semibold text-gray-900">{box.remainingKg}kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Mínimo/pessoa</p>
                    <p className="font-semibold text-gray-900">{box.minKgPerPerson}kg</p>
                  </div>
                </div>

                {/* Barra de progresso */}
                {!isDeleted && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-700 mb-1">
                      <span>Progresso</span>
                      <span>{box.totalKg > 0 ? Math.round(((box.totalKg - box.remainingKg) / box.totalKg) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${box.totalKg > 0 ? ((box.totalKg - box.remainingKg) / box.totalKg) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  {!isDeleted ? (
                    <>
                      <Link
                        to={`/admin/box/${box.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Ver Detalhes
                      </Link>
                      <Link
                        to={`/admin/box/${box.id}/edit`}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDeleteBox(box)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        🗑️ Excluir
                      </button>
                      {box.status === 'awaiting_customer_purchases' && (
                        <button
                          onClick={() => handleStatusChange(box.id, 'awaiting_supplier_purchase')}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Iniciar Cobrança
                        </button>
                      )}
                      {box.status === 'awaiting_supplier_purchase' && (
                        <button
                          onClick={() => handleStatusChange(box.id, 'completed')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                          Finalizar Caixa
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRestoreBox(box)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        🔄 Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentlyDeleteBox(box)}
                        className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        💀 Excluir Permanentemente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredBoxes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhuma caixa encontrada.</p>
          </div>
        )}
      </div>
    </div>
  )
}