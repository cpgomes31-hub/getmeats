import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import CompleteProfile from './pages/CompleteProfile'
import Purchase from './pages/Purchase'
import MyOrders from './pages/MyOrders'
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/Admin'
import AdminNewBox from './pages/AdminNewBox'
import AdminBoxDetails from './pages/AdminBoxDetails'
import AdminEditBox from './pages/AdminEditBox'
import AdminRoute from './components/AdminRoute'
import { useAuth } from './context/AuthContext'

// Importar função de teste do Mercado Pago para debug
import './mercadopago/test-token.js'

export default function App() {
  const { user, profile, logout } = useAuth()

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex flex-col items-center gap-0">
          <div className="text-white font-serif font-extrabold text-4xl tracking-wide" style={{fontWeight: 900}}>GET</div>
          <div className="font-script text-brand text-5xl font-bold px-2 logo-meats">Meats</div>
        </div>
        <nav className="space-x-4">
          <Link to="/" className="text-gray-300 hover:text-white">Caixas</Link>
          {user && profile?.role !== 'manager' && (
            <Link to="/my-orders" className="text-gray-300 hover:text-white">Meus Pedidos</Link>
          )}
          {profile?.role === 'manager' ? (
            <Link to="/admin" className="text-gray-300 hover:text-white">Admin</Link>
          ) : (
            <Link to="/admin-login" className="text-gray-300 hover:text-white">Admin</Link>
          )}
          {user ? (
            <button
              onClick={logout}
              className="text-gray-300 hover:text-white"
            >
              Sair
            </button>
          ) : (
            <Link to="/login" className="text-gray-300 hover:text-white">Entrar</Link>
          )}
        </nav>
      </header>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/purchase/:boxId" element={<Purchase />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/admin/new" element={<AdminRoute><AdminNewBox /></AdminRoute>} />
          <Route path="/admin/box/:boxId" element={<AdminRoute><AdminBoxDetails /></AdminRoute>} />
          <Route path="/admin/box/:boxId/edit" element={<AdminRoute><AdminEditBox /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  )
}
