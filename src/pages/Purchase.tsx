import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from '../firebase/config'
import { createPurchase, updatePurchase, updateBox } from '../firebase/boxes'
import { useAuth } from '../context/AuthContext'
import { MeatBox, OrderStatus } from '../types'
import { createPixPayment } from '../mercadopago/pix'
import { sendEmail } from '../services/email'

export default function Purchase() {
  const { boxId } = useParams<{ boxId: string }>()
  const [box, setBox] = useState<MeatBox | null>(null)
  const [kgDesired, setKgDesired] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      // Salvar a página atual para redirecionar após login
      localStorage.setItem('redirectAfterLogin', `/purchase/${boxId}`)
      navigate('/login')
      return
    }
    if (!profile?.profileCompleted) {
      // Salvar a página atual para redirecionar após completar perfil
      localStorage.setItem('redirectAfterProfile', `/purchase/${boxId}`)
      navigate('/complete-profile')
      return
    }
    loadBox()
  }, [user, profile])

  async function loadBox() {
    if (!boxId) return
    try {
      const db = getFirestore(app)
      const docRef = doc(db, 'boxes', boxId)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        setBox({ id: docSnap.id, ...docSnap.data() } as MeatBox)
      } else {
        alert('Caixa não encontrada')
        navigate('/')
      }
    } catch (error) {
      console.error('Error loading box:', error)
      alert('Erro ao carregar caixa')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  function validatePurchase(): string | null {
    if (!box) return 'Caixa não carregada'
    if (!kgDesired.trim()) return 'Informe a quantidade desejada'
    if (!/^[0-9]+$/.test(kgDesired.trim())) return 'Utilize apenas números inteiros'

    const kg = parseInt(kgDesired, 10)
    if (isNaN(kg) || kg <= 0) return 'Quantidade inválida'
    if (kg > Math.round(box.remainingKg)) return `Máximo disponível: ${Math.round(box.remainingKg)}kg`

    const hasMinimum = box.minKgPerPerson > 0
    const enforceMinimum = hasMinimum && Math.round(box.remainingKg) >= box.minKgPerPerson

    if (enforceMinimum && kg < box.minKgPerPerson) {
      return `Mínimo: ${box.minKgPerPerson}kg`
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!box || !user || !profile) return

    const error = validatePurchase()
    if (error) {
      alert(error)
      return
    }

    setSubmitting(true)
    try {
  const kg = parseInt(kgDesired, 10)
      const totalAmount = kg * box.pricePerKg

      // Create purchase
      const purchaseId = await createPurchase({
        boxId: box.id,
        userId: user.uid,
        kgPurchased: kg,
        totalAmount,
        status: box.paymentType === 'prepaid' ? OrderStatus.WAITING_PAYMENT : OrderStatus.WAITING_BOX_CLOSURE,
        paymentStatus: box.paymentType === 'prepaid' ? 'pending' : 'paid',
      })

      // Update box remaining kg
      await updateBox(box.id, {
        remainingKg: Math.max(0, Math.round(box.remainingKg) - kg),
      })

  // If prepaid and sending Pix is enabled for this box, generate Pix and send email
  if (box.paymentType === 'prepaid' && box.sendPix !== false) {
        try {
          const pixPayment = await createPixPayment({
            amount: totalAmount,
            description: `Compra de ${kg}kg de ${box.name}`,
            payerEmail: user.email || '',
            payerName: profile.name || '',
          })

          // Update purchase with payment link
          await updatePurchase(purchaseId, {
            paymentLink: pixPayment.paymentLink,
            paymentExpiresAt: pixPayment.expiresAt,
          })

          // Send email with payment link
          await sendEmail({
            to_email: user.email || '',
            to_name: profile.name || '',
            subject: 'Link de Pagamento - GetMeats',
            message: `Olá ${profile.name},\n\nSua compra de ${kg}kg de ${box.name} foi sinalizada!\n\nValor total: R$ ${totalAmount.toFixed(2)}\n\nPara efetuar o pagamento, use o link abaixo:\n${pixPayment.paymentLink}\n\nOu escaneie o QR Code: ${pixPayment.qrCode}\n\nO pagamento expira em: ${new Date(pixPayment.expiresAt).toLocaleString('pt-BR')}\n\nAtenciosamente,\nEquipe GetMeats`,
            payment_link: pixPayment.paymentLink,
            qr_code: pixPayment.qrCode,
          })

          alert('Compra sinalizada com sucesso! Verifique seu email para o link de pagamento Pix.')
        } catch (pixError) {
          console.error('Erro ao gerar Pix:', pixError)
          alert('Compra sinalizada, mas houve erro no processamento do pagamento. Entre em contato conosco.')
        }
      } else {
        alert('Compra sinalizada com sucesso!')
      }

      navigate('/my-orders')
    } catch (error) {
      console.error('Error creating purchase:', error)
      alert('Erro ao sinalizar compra')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!box) {
    return (
      <div className="text-center text-gray-400 py-12">
        Caixa não encontrada.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sinalizar compra</h1>

      <div className="bg-gray-900 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">{box.name}</h2>
        <p className="text-gray-400 mb-2">Marca: {box.brand}</p>
        <p className="text-lg font-bold text-brand mb-2">R$ {box.pricePerKg?.toFixed(2) || '0.00'}/kg</p>
        <p className="text-sm text-gray-400">Disponível: {box.remainingKg}kg</p>
        <p className="text-sm text-gray-400">
          Mínimo por pessoa: {box.minKgPerPerson > 0 ? `${box.minKgPerPerson}kg` : 'Sem mínimo'}
        </p>
        <p className="text-sm text-gray-400">
          Tipo de pagamento: {box.paymentType === 'prepaid' ? 'Antecipado' : 'Pós-venda'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Quantidade desejada (kg):
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={kgDesired}
            onChange={e => {
              const { value } = e.target
              if (value === '' || /^[0-9]+$/.test(value)) {
                setKgDesired(value)
              }
            }}
            className="w-full p-2 rounded bg-gray-800 text-white"
            placeholder="Ex: 2"
            required
          />
          {box.minKgPerPerson > 0 && Math.round(box.remainingKg) < box.minKgPerPerson && (
            <p className="mt-2 text-sm text-yellow-400">
              Restam apenas {Math.round(box.remainingKg)}kg. Você pode comprar esse saldo final mesmo abaixo do mínimo previsto.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand text-white py-3 rounded hover:bg-red-700 transition disabled:opacity-50"
        >
          {submitting ? 'Sinalizando...' : 'Sinalizar compra'}
        </button>
      </form>
    </div>
  )
}