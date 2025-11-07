import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { saveUserProfile } from '../firebase/auth'
import { useNavigate } from 'react-router-dom'

export default function CompleteProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [cep, setCep] = useState('')
  const [street, setStreet] = useState('')
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    if (profile && profile.profileCompleted) {
      // Verificar se há uma página para redirecionar após completar perfil
      const redirectPath = localStorage.getItem('redirectAfterProfile')
      if (redirectPath) {
        localStorage.removeItem('redirectAfterProfile')
        navigate(redirectPath)
      } else {
        navigate('/')
      }
    }
  }, [user, profile])

  async function lookupCep() {
    setError(null)
    const cleaned = cep.replace(/[^0-9]/g, '')
    if (cleaned.length !== 8) {
      setError('CEP inválido. Deve conter 8 dígitos.')
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
      const data = await res.json()
      if (data.erro) {
        setError('CEP não encontrado')
      } else {
        setStreet(data.logradouro || '')
        setCity(data.localidade || '')
        setState(data.uf || '')
        // Restrict to São Paulo / SP
        if ((data.localidade || '').toLowerCase() !== 'são paulo' && (data.localidade || '').toLowerCase() !== 'sao paulo') {
          setError('Atendimento disponível apenas para cidade de São Paulo')
        }
        if ((data.uf || '').toUpperCase() !== 'SP') {
          setError('Atendimento disponível apenas para estado SP')
        }
      }
    } catch (e: any) {
      setError('Erro ao consultar CEP')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!user) {
      setError('Usuário não autenticado')
      return
    }
    if (!name || !cpf || !cep || !number) {
      setError('Preencha os campos obrigatórios')
      return
    }
    // city/state restriction
    if ((city || '').toLowerCase() !== 'são paulo' && (city || '').toLowerCase() !== 'sao paulo') {
      setError('Atendimento apenas para cidade de São Paulo')
      return
    }
    if ((state || '').toUpperCase() !== 'SP') {
      setError('Atendimento apenas para estado SP')
      return
    }

    try {
      setLoading(true)
      await saveUserProfile(user.uid, {
        name,
        cpf,
        cep,
        street,
        number,
        complement,
        city,
        state,
        phone,
      })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-gray-900 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Completar cadastro</h2>

      <form onSubmit={submit} className="space-y-3">
        <input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        <input placeholder="CPF" value={cpf} onChange={e => setCpf(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        <div className="flex gap-2">
          <input placeholder="CEP" value={cep} onChange={e => setCep(e.target.value)} className="flex-1 p-2 rounded bg-gray-800" />
          <button type="button" onClick={lookupCep} className="bg-brand text-white px-4 rounded">Buscar</button>
        </div>

        <input placeholder="Logradouro" value={street} onChange={e => setStreet(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        <div className="flex gap-2">
          <input placeholder="Número" value={number} onChange={e => setNumber(e.target.value)} className="flex-1 p-2 rounded bg-gray-800" />
          <input placeholder="Complemento" value={complement} onChange={e => setComplement(e.target.value)} className="flex-1 p-2 rounded bg-gray-800" />
        </div>

        <div className="flex gap-2">
          <input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} className="flex-1 p-2 rounded bg-gray-800" />
          <input placeholder="Estado" value={state} onChange={e => setState(e.target.value)} className="w-24 p-2 rounded bg-gray-800" />
        </div>

        <input placeholder="Celular" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 rounded bg-gray-800" />

        <div className="flex justify-end">
          <button type="submit" className="bg-brand text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  )
}
