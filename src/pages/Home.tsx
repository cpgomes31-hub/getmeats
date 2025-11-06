import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAvailableBoxes } from '../firebase/boxes'
import { useAuth } from '../context/AuthContext'
import { MeatBox } from '../types'

export default function Home() {
  const [boxes, setBoxes] = useState<MeatBox[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadBoxes()
  }, [])

  async function loadBoxes() {
    try {
      const availableBoxes = await getAvailableBoxes()
      setBoxes(availableBoxes)
    } catch (error) {
      console.error('Error loading boxes:', error)
    } finally {
      setLoading(false)
    }
  }

  function handlePurchase(box: MeatBox) {
    if (!user) {
      navigate('/login')
      return
    }
    if (!profile?.profileCompleted) {
      navigate('/complete-profile')
      return
    }
    navigate(`/purchase/${box.id}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Carregando caixas...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Caixas disponíveis</h1>

      {boxes.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          Nenhuma caixa disponível no momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boxes.map(box => (
            <div key={box.id} className="bg-gray-900 p-4 rounded-lg shadow-lg">
              {/* Photos carousel placeholder */}
              <div className="h-48 bg-gray-800 rounded mb-4 flex items-center justify-center">
                {box.photos.length > 0 ? (
                  <img src={box.photos[0]} alt={box.name} className="w-full h-full object-cover rounded" />
                ) : (
                  <div className="text-gray-500">Sem foto</div>
                )}
              </div>

              <h2 className="text-xl font-semibold mb-2">{box.name}</h2>
              <p className="text-sm text-gray-400 mb-2">Marca: {box.brand}</p>
              <p className="text-lg font-bold text-brand mb-2">R$ {box.pricePerKg.toFixed(2)}/kg</p>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Total: {box.totalKg}kg</span>
                  <span>Restante: {box.remainingKg}kg</span>
                </div>
                <div className="w-full bg-gray-800 h-3 rounded">
                  <div
                    className={`${box.totalKg > 0 && ((box.totalKg - box.remainingKg) / box.totalKg) * 100 === 100 ? 'bg-green-600' : 'bg-brand'} h-3 rounded`}
                    style={{ width: `${box.totalKg > 0 ? ((box.totalKg - box.remainingKg) / box.totalKg) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {box.totalKg > 0 ? Math.round(((box.totalKg - box.remainingKg) / box.totalKg) * 100) : 0}% adquirido
                </p>
              </div>

              <div className="text-sm text-gray-400 mb-4">
                Mínimo por pessoa: {box.minKgPerPerson > 0 ? `${box.minKgPerPerson}kg` : 'Sem mínimo'}
              </div>

              <button
                onClick={() => handlePurchase(box)}
                disabled={box.remainingKg === 0}
                className={`w-full py-2 rounded transition ${box.remainingKg === 0 ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-brand text-white hover:bg-red-700'}`}
              >
                {box.remainingKg === 0 ? 'Caixa esgotada' : 'Sinalizar compra'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
