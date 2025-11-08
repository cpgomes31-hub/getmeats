import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAllBoxes, updateBox } from '../firebase/boxes'
import { MeatBox, BoxStatus } from '../types'

interface BoxFormData {
  name: string
  brand: string
  photos: string[]
  pricePerKg: number
  costPerKg: number
  totalKg: number
  remainingKg: number
  minKgPerPerson: number
  status: BoxStatus
  paymentType: 'prepaid' | 'postpaid'
  sendPix: boolean
}

export default function AdminEditBox() {
  const { boxId } = useParams<{ boxId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<BoxFormData>({
    name: '',
    brand: '',
    photos: [''],
    pricePerKg: 0,
    costPerKg: 0,
    totalKg: 0,
    remainingKg: 0,
    minKgPerPerson: 1,
    status: BoxStatus.WAITING_PURCHASES,
    paymentType: 'prepaid'
    ,
    sendPix: true
  })

  useEffect(() => {
    if (boxId) {
      loadBoxData()
    }
  }, [boxId])

  const loadBoxData = async () => {
    if (!boxId) return

    try {
      const allBoxes = await getAllBoxes()
      const box = allBoxes.find(b => b.id === boxId)

      if (box) {
        setFormData({
          name: box.name,
          brand: box.brand,
          photos: box.photos.length > 0 ? box.photos : [''],
          pricePerKg: box.pricePerKg,
          costPerKg: box.costPerKg,
          totalKg: Math.round(box.totalKg),
          remainingKg: Math.round(box.remainingKg),
          minKgPerPerson: Math.round(box.minKgPerPerson),
          status: box.status,
          paymentType: box.paymentType,
          sendPix: box.sendPix ?? true
        })
      }
    } catch (error) {
      console.error('Error loading box data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const integerFields = ['totalKg', 'remainingKg', 'minKgPerPerson']
    const decimalFields = ['pricePerKg', 'costPerKg']

    setFormData(prev => ({
      ...prev,
      [name]: integerFields.includes(name)
        ? (parseInt(value, 10) || 0)
        : decimalFields.includes(name)
        ? (parseFloat(value) || 0)
        : value
    }))
  }

  const handlePhotoChange = (index: number, value: string) => {
    const newPhotos = [...formData.photos]
    newPhotos[index] = value
    setFormData(prev => ({ ...prev, photos: newPhotos }))
  }

  const addPhoto = () => {
    setFormData(prev => ({ ...prev, photos: [...prev.photos, ''] }))
  }

  const removePhoto = (index: number) => {
    if (formData.photos.length > 1) {
      const newPhotos = formData.photos.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, photos: newPhotos }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!boxId) return

    setSaving(true)

    try {
      // Filtrar fotos vazias
      const filteredPhotos = formData.photos.filter(photo => photo.trim() !== '')

      const updates = {
        ...formData,
        photos: filteredPhotos.length > 0 ? filteredPhotos : ['https://via.placeholder.com/400x300?text=Sem+Foto']
      }

      await updateBox(boxId, updates)
      navigate(`/admin/box/${boxId}`)
    } catch (error) {
      console.error('Error updating box:', error)
      alert('Erro ao atualizar caixa. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados da caixa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Editar Caixa de Carne</h1>
          <button
            onClick={() => navigate(`/admin/box/${boxId}`)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            ← Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Nome e Marca */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Carne *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Ex: Contrafilé Premium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca/Fazenda *
              </label>
              <input
                type="text"
                name="brand"
                required
                value={formData.brand}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="Ex: Fazenda Boa Vista"
              />
            </div>
          </div>

          {/* Preços */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preço de Venda (R$/kg) *
              </label>
              <input
                type="number"
                name="pricePerKg"
                required
                min="0"
                step="0.01"
                value={formData.pricePerKg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="59.90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custo (R$/kg) *
              </label>
              <input
                type="number"
                name="costPerKg"
                required
                min="0"
                step="0.01"
                value={formData.costPerKg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="45.00"
              />
            </div>
          </div>

          {/* Quantidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantidade Total (kg) *
              </label>
              <input
                type="number"
                name="totalKg"
                required
                min="0"
                step="1"
                value={formData.totalKg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restante (kg) *
              </label>
              <input
                type="number"
                name="remainingKg"
                required
                min="0"
                step="1"
                value={formData.remainingKg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="20"
              />
            </div>
          </div>

          {/* Mínimo por pessoa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mínimo por Pessoa (kg) *
            </label>
            <input
              type="number"
              name="minKgPerPerson"
              required
              min="0"
              step="1"
              value={formData.minKgPerPerson}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
              placeholder="1"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            >
              <option value={BoxStatus.WAITING_PURCHASES}>Aguardando Compras</option>
              <option value={BoxStatus.WAITING_SUPPLIER_ORDER}>Aguardando Fornecedor</option>
              <option value={BoxStatus.WAITING_SUPPLIER_DELIVERY}>Aguardando Entrega</option>
              <option value={BoxStatus.SUPPLIER_DELIVERY_RECEIVED}>Recebido no Armazém</option>
              <option value={BoxStatus.DISPATCHING}>Despachando</option>
              <option value={BoxStatus.COMPLETED}>Finalizada</option>
              <option value={BoxStatus.CANCELLED}>Cancelada</option>
            </select>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="sendPix"
              checked={formData.sendPix}
              onChange={(e) => setFormData(prev => ({ ...prev, sendPix: e.target.checked }))}
              className="h-4 w-4 text-red-600 rounded"
            />
            <label className="text-sm text-gray-700">Enviar link Pix automaticamente (quando pré-pago)</label>
          </div>
          </div>

          {/* Tipo de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Pagamento *
            </label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
            >
              <option value="prepaid">Pré-pago (pagar antes)</option>
              <option value="postpaid">Pós-pago (pagar depois)</option>
            </select>
          </div>

          {/* Fotos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URLs das Fotos
            </label>
            {formData.photos.map((photo, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={photo}
                  onChange={(e) => handlePhotoChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                  placeholder="https://exemplo.com/foto.jpg"
                />
                {formData.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addPhoto}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              + Adicionar Foto
            </button>
          </div>

          {/* Botão de Submit */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(`/admin/box/${boxId}`)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}