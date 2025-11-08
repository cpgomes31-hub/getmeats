import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveUserProfile, updateCurrentUserEmail } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'

interface ProfileFormData {
  name: string
  email: string
  cpf: string
  phone: string
  cep: string
  street: string
  number: string
  complement: string
  city: string
  state: string
}

const INITIAL_FORM: ProfileFormData = {
  name: '',
  email: '',
  cpf: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  city: '',
  state: ''
}

export default function Profile() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ProfileFormData>(INITIAL_FORM)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login')
        return
      }
      setFormData({
        name: profile?.name || '',
        email: user.email || profile?.email || '',
        cpf: profile?.cpf || '',
        phone: profile?.phone || '',
        cep: profile?.cep || '',
        street: profile?.street || '',
        number: profile?.number || '',
        complement: profile?.complement || '',
        city: profile?.city || '',
        state: profile?.state || ''
      })
    }
  }, [loading, navigate, profile, user])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)
    setError(null)

    try {
      if (!user) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      if (!formData.email.trim()) {
        throw new Error('Informe um e-mail válido.')
      }

      if (formData.email !== (user.email || '')) {
        await updateCurrentUserEmail(formData.email.trim())
      }

      await saveUserProfile(user.uid, {
        ...(profile || {}),
        ...formData,
        email: formData.email.trim(),
        profileCompleted: true,
        updatedAt: new Date().toISOString(),
      })

      setFeedback('Dados atualizados com sucesso!')
    } catch (submitError: any) {
      console.error('Erro ao atualizar perfil:', submitError)
      if (submitError?.code === 'auth/requires-recent-login') {
        setError('Por segurança, faça login novamente para alterar o e-mail.')
      } else {
        setError(submitError?.message || 'Erro ao salvar os dados. Tente novamente.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-gray-400">Carregando perfil...</span>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meus Dados</h1>
        <button
          onClick={() => navigate(-1)}
          className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          ← Voltar
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-gray-900 p-6 shadow-lg">
        {feedback && (
          <div className="rounded bg-green-600/10 p-3 text-sm text-green-300">
            {feedback}
          </div>
        )}

        {error && (
          <div className="rounded bg-red-600/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Nome completo *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">E-mail *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">CPF *</label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              required
              maxLength={14}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Telefone *</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">CEP *</label>
            <input
              type="text"
              name="cep"
              value={formData.cep}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="00000-000"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-300">Rua *</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="Nome da rua"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Número *</label>
            <input
              type="text"
              name="number"
              value={formData.number}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="123"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Complemento</label>
            <input
              type="text"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="Apartamento, bloco..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Cidade *</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-red-500 focus:outline-none"
              placeholder="Sua cidade"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Estado *</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              maxLength={2}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 uppercase text-white focus:border-red-500 focus:outline-none"
              placeholder="UF"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-red-600 px-6 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
