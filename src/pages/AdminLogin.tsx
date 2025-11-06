import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmail } from '../firebase/auth'
import { saveUserProfile } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  // If user is already logged in as manager, redirect to admin
  React.useEffect(() => {
    if (user) {
      navigate('/admin')
    }
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if credentials are correct for admin
      if (email === 'admin@getmeats.com' && password === '123') {
        // Create or sign in admin user
        const adminUser = await signInWithEmail(email, password)

        // Set admin role
        await saveUserProfile(adminUser.uid, {
          uid: adminUser.uid,
          email: adminUser.email,
          name: 'Administrador',
          role: 'manager',
          profileCompleted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        navigate('/admin')
      } else {
        setError('Credenciais inválidas')
      }
    } catch (error) {
      console.error('Admin login error:', error)
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-0 mb-4">
            <div className="text-white font-serif font-extrabold text-4xl tracking-wide" style={{fontWeight: 900}}>GET</div>
            <div className="font-script text-brand text-5xl font-bold px-2 logo-meats">Meats</div>
          </div>
          <h1 className="text-2xl font-bold">Login Administrativo</h1>
          <p className="text-gray-400 mt-2">Acesso restrito aos gestores</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-lg">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Email Administrativo
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-brand focus:outline-none"
              placeholder="admin@getmeats.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700 focus:border-brand focus:outline-none"
              placeholder="Digite a senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand text-white py-3 rounded hover:bg-red-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Entrando...' : 'Entrar como Admin'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Voltar ao site
          </button>
        </div>
      </div>
    </div>
  )
}