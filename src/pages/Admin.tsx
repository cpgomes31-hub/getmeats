import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllBoxes, getPurchasesForBox, deleteBox, restoreBox, permanentlyDeleteBox, changeBoxStatus, runBatchUpdate } from '../firebase/boxes'
import { MeatBox, BoxStatus } from '../types'
import { useAuth } from '../context/AuthContext'
import { saveUserProfile, reauthenticateCurrentUser } from '../firebase/auth'
import StatusFlow from '../components/StatusFlow'
import MultiSelectDropdown from '../components/MultiSelectDropdown'
import StatusChangeModal from '../components/StatusChangeModal'

export default function AdminPage() {
  const { user, profile } = useAuth()
  const [boxes, setBoxes] = useState<MeatBox[]>([])
  const [deletedBoxes, setDeletedBoxes] = useState<MeatBox[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatusFilters, setSelectedStatusFilters] = useState<BoxStatus[]>([])
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ box: MeatBox; nextStatus: BoxStatus } | null>(null)
  const [batchRunningIds, setBatchRunningIds] = useState<Record<string, boolean>>({})

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

  const handleStatusChangeConfirm = async ({ forced, reason, password }: { forced: boolean; reason?: string; password?: string }) => {
    if (!pendingStatusChange) return

    try {
      if (forced) {
        if (!password) {
          throw new Error('Informe a senha do administrador para continuar.')
        }
        await reauthenticateCurrentUser(password)
      }

      const actorId = user?.uid || profile?.uid || 'unknown'

      await changeBoxStatus(pendingStatusChange.box, pendingStatusChange.nextStatus, {
        userId: actorId,
        reason,
        force: forced,
      })

      await loadBoxes()
    } catch (error) {
      console.error('Error updating box status:', error)
      throw error
    }
  }

  const openStatusModal = (box: MeatBox, nextStatus: BoxStatus) => {
    setPendingStatusChange({ box, nextStatus })
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

  const handleBatchUpdate = async (box: MeatBox) => {
    try {
      setBatchRunningIds(prev => ({ ...prev, [box.id]: true }))

      const result = await runBatchUpdate(box.id)

      // Create detailed message
      let message = `Batch concluído para: ${box.name}\n\n`

      if (result.actions.length > 0) {
        message += '📋 Ações realizadas:\n'
        result.actions.forEach(action => {
          message += `• ${action}\n`
        })
        message += '\n'
      }

      if (result.errors.length > 0) {
        message += '⚠️ Avisos/Erros:\n'
        result.errors.forEach(error => {
          message += `• ${error}\n`
        })
        message += '\n'
      }

      if (result.success) {
        message += '✅ Batch executado com sucesso!'
      } else {
        message += '❌ Batch executado com problemas. Verifique os avisos acima.'
      }

      alert(message)
      await loadBoxes()
    } catch (err) {
      console.error('Batch update error:', err)
      alert('Erro crítico ao executar batch de atualização. Veja o console para mais detalhes.')
    } finally {
      setBatchRunningIds(prev => ({ ...prev, [box.id]: false }))
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

  const baseBoxes = useMemo(
    () => (includeDeleted ? [...boxes, ...deletedBoxes] : boxes),
    [boxes, deletedBoxes, includeDeleted]
  )

  const filteredBoxes = baseBoxes.filter(box => {
    if (selectedStatusFilters.length === 0) return true
    return selectedStatusFilters.includes(box.status as BoxStatus)
  })

  const getStatusColor = (status: BoxStatus, isDeleted: boolean = false) => {
    if (isDeleted) return 'bg-gray-100 text-gray-600'
    switch (status) {
      case BoxStatus.WAITING_PURCHASES: return 'bg-green-100 text-green-800'
      case BoxStatus.WAITING_SUPPLIER_ORDER:
      case BoxStatus.WAITING_SUPPLIER_DELIVERY: return 'bg-yellow-100 text-yellow-800'
      case BoxStatus.SUPPLIER_DELIVERY_RECEIVED:
      case BoxStatus.DISPATCHING: return 'bg-blue-100 text-blue-800'
      case BoxStatus.COMPLETED: return 'bg-gray-100 text-gray-800'
      case BoxStatus.CANCELLED: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: BoxStatus, isDeleted: boolean = false) => {
    if (isDeleted) return 'Excluída'
    return status
  }

  const statusOptions = useMemo(() => {
    return Object.values(BoxStatus).map(status => ({
      value: status,
      label: getStatusText(status),
      count: baseBoxes.filter(box => (box.status as BoxStatus) === status).length
    }))
  }, [baseBoxes])

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
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <MultiSelectDropdown
            label="Filtrar por status"
            placeholder="Todos os status"
            options={statusOptions}
            selected={selectedStatusFilters}
            onChange={setSelectedStatusFilters}
          />
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(event) => setIncludeDeleted(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Incluir caixas excluídas ({deletedBoxes.length})
          </label>
        </div>

        {/* Lista de Caixas */}
        <div className="grid gap-4">
          {filteredBoxes.map((box) => {
            const isDeleted = !!box.deletedAt
            const boxStatus = box.status as BoxStatus
            return (
              <div key={box.id} className={`bg-white rounded-lg shadow-md p-4 ${isDeleted ? 'opacity-75 border-2 border-gray-300' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-6 mb-2">
                      <h3 className={`text-lg font-semibold ${isDeleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {box.name} | {box.brand}
                      </h3>
                      {!isDeleted && (
                        <>
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
                        </>
                      )}
                    </div>
                    {isDeleted && (
                      <p className="text-xs text-gray-500 mt-1">
                        Excluída em {new Date(box.deletedAt!).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(box.status, isDeleted)}`}>
                    {getStatusText(boxStatus, isDeleted)}
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
                <StatusFlow currentStatus={boxStatus} type="box" />

                {/* Ações */}
                <div className="flex flex-wrap gap-1">
                  {!isDeleted ? (
                    <>
                      <Link
                        to={`/admin/box/${box.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                      >
                        Ver Detalhes
                      </Link>
                      <Link
                        to={`/admin/box/${box.id}/edit`}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDeleteBox(box)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                      >
                        🗑️ Excluir
                      </button>
                      <button
                        onClick={() => handleBatchUpdate(box)}
                        disabled={!!batchRunningIds[box.id]}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                      >
                        {batchRunningIds[box.id] ? 'Processando...' : 'Batch'}
                      </button>
                      {boxStatus === BoxStatus.WAITING_PURCHASES && (
                        <button
                          onClick={() => openStatusModal(box, BoxStatus.WAITING_SUPPLIER_ORDER)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Iniciar Pedido
                        </button>
                      )}
                      {boxStatus === BoxStatus.WAITING_SUPPLIER_ORDER && (
                        <button
                          onClick={() => openStatusModal(box, BoxStatus.WAITING_SUPPLIER_DELIVERY)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Pedido Realizado
                        </button>
                      )}
                      {boxStatus === BoxStatus.WAITING_SUPPLIER_DELIVERY && (
                        <button
                          onClick={() => openStatusModal(box, BoxStatus.SUPPLIER_DELIVERY_RECEIVED)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Mercadoria Recebida
                        </button>
                      )}
                      {boxStatus === BoxStatus.SUPPLIER_DELIVERY_RECEIVED && (
                        <button
                          onClick={() => openStatusModal(box, BoxStatus.DISPATCHING)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Iniciar Despacho
                        </button>
                      )}
                      {boxStatus === BoxStatus.DISPATCHING && (
                        <button
                          onClick={() => openStatusModal(box, BoxStatus.COMPLETED)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Finalizar Caixa
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleRestoreBox(box)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium"
                      >
                        🔄 Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentlyDeleteBox(box)}
                        className="bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded text-xs font-medium"
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
      {pendingStatusChange && (
        <StatusChangeModal
          isOpen={!!pendingStatusChange}
          onClose={() => setPendingStatusChange(null)}
          currentStatus={pendingStatusChange.box.status as BoxStatus}
          newStatus={pendingStatusChange.nextStatus}
          type="box"
          itemName={pendingStatusChange.box.name}
          onConfirm={handleStatusChangeConfirm}
        />
      )}
    </div>
  )
}