import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBox } from '../firebase/boxes'

interface BoxFormData {
  name: string
  brand: string
  photos: string[]
  pricePerKg: number
  costPerKg: number
  totalKg: number
  remainingKg: number
  minKgPerPerson: number
  status: 'awaiting_customer_purchases' | 'awaiting_supplier_purchase' | 'awaiting_supplier_delivery' | 'received_at_warehouse' | 'dispatching_to_customers' | 'completed' | 'cancelled'
  paymentType: 'prepaid' | 'postpaid'
}

export default function AdminNewBox() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<BoxFormData>({
    name: '',
    brand: '',
    photos: [''],
    pricePerKg: 0,
    costPerKg: 0,
    totalKg: 0,
    remainingKg: 0,
    minKgPerPerson: 1,
    status: 'awaiting_customer_purchases',
    paymentType: 'prepaid'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Kg') || name.includes('price') || name.includes('cost')
        ? parseFloat(value) || 0
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
    setLoading(true)

    try {
      // Filtrar fotos vazias
      const filteredPhotos = formData.photos.filter(photo => photo.trim() !== '')

      const boxData = {
        ...formData,
        photos: filteredPhotos.length > 0 ? filteredPhotos : ['https://via.placeholder.com/400x300?text=Sem+Foto'],
        remainingKg: formData.totalKg // Inicialmente restante = total
      }

      await createBox(boxData)
      navigate('/admin')
    } catch (error) {
      console.error('Error creating box:', error)
      alert('Erro ao criar caixa. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nova Caixa de Carne</h1>
          <button
            onClick={() => navigate('/admin')}
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
                step="0.1"
                value={formData.totalKg}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mínimo por Pessoa (kg) *
              </label>
              <input
                type="number"
                name="minKgPerPerson"
                required
                min="0.1"
                step="0.1"
                value={formData.minKgPerPerson}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                placeholder="1.0"
              />
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
              onClick={() => navigate('/admin')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Criando...' : 'Criar Caixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}