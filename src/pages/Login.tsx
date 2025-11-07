import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithGoogle, signInWithEmail, registerWithEmail } from '../firebase/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const navigate = useNavigate()
  const { user, profile, isAdmin } = useAuth()

  // Limpar campos quando o componente montar (evitar dados pré-preenchidos do admin)
  useEffect(() => {
    setEmail('')
    setPassword('')
    setMessage(null)
  }, [])

  // Redirecionar automaticamente após login bem-sucedido
  useEffect(() => {
    // Aguardar tanto user quanto profile serem definidos (não null/undefined)
    if (user && !isAdmin && profile !== undefined) {
      if (profile === null) {
        // Profile não existe no banco, redirecionar para completar
        navigate('/complete-profile')
      } else if (profile.profileCompleted === false) {
        // Profile existe mas não está completo
        navigate('/complete-profile')
      } else if (profile.profileCompleted === true) {
        // Profile completo, redirecionar para home ou página armazenada
        const redirectPath = localStorage.getItem('redirectAfterLogin')
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin')
          navigate(redirectPath)
        } else {
          navigate('/')
        }
      } else {
        // profileCompleted não definido, assumir que precisa completar
        navigate('/complete-profile')
      }
    }
  }, [user, profile, isAdmin, navigate])

  const signInWithGoogleHandler = async () => {
    try {
      // Garantir que não haja sessão admin em localStorage antes do login cliente
      localStorage.removeItem('adminProfile')
      await signInWithGoogle()
      setMessage('Login com Google realizado com sucesso')
      // O redirecionamento será feito pelo useEffect acima
    } catch (err: any) {
      setMessage(err.message || 'Erro no login com Google')
    }
  }

  const signInEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Garantir que não haja sessão admin em localStorage antes do login cliente
      localStorage.removeItem('adminProfile')
      await signInWithEmail(email, password)
      setMessage('Login realizado com sucesso')
      // O redirecionamento será feito pelo useEffect acima
    } catch (err: any) {
      setMessage(err.message || 'Erro no login por email')
    }
  }

  const register = async () => {
    try {
      // Garantir que não haja sessão admin em localStorage antes do registro/ login cliente
      localStorage.removeItem('adminProfile')
      await registerWithEmail(email, password)
      setMessage('Conta criada com sucesso. Complete o cadastro após o login.')
    } catch (err: any) {
      setMessage(err.message || 'Erro ao criar conta')
    }
  }

  return (
    <div className="max-w-md mx-auto bg-gray-900 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Entrar — GET Meats</h2>

      <button onClick={signInWithGoogleHandler} className="w-full bg-white text-black py-2 rounded mb-4">
        Entrar com Google
      </button>

      <form onSubmit={signInEmail} className="space-y-3">
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        <input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 rounded bg-gray-800" />
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-brand text-white py-2 rounded">Entrar</button>
          <button type="button" onClick={register} className="flex-1 border border-gray-700 text-gray-200 py-2 rounded">Criar conta</button>
        </div>
      </form>

      {message && <p className="mt-4 text-sm text-gray-300">{message}</p>}

      {/* If user logged in and profile incomplete, show link to complete profile */}
      {user && profile && profile.profileCompleted === false && (
        <div className="mt-4 text-sm">
          <button onClick={() => navigate('/complete-profile')} className="text-brand underline">Completar cadastro</button>
        </div>
      )}
    </div>
  )
}
