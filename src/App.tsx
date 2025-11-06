import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import CompleteProfile from './pages/CompleteProfile'
import Purchase from './pages/Purchase'
import AdminPage from './pages/Admin'
import AdminNewBox from './pages/AdminNewBox'
import AdminBoxDetails from './pages/AdminBoxDetails'
import AdminEditBox from './pages/AdminEditBox'
import AdminRoute from './components/AdminRoute'

// Importar função de teste do Mercado Pago para debug
import './mercadopago/test-token.js'

export default function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex flex-col items-center gap-0">
          <div className="text-white font-serif font-extrabold text-4xl tracking-wide" style={{fontWeight: 900}}>GET</div>
          <div className="font-script text-brand text-5xl font-bold px-2 logo-meats">Meats</div>
        </div>
        <nav className="space-x-4">
          <Link to="/" className="text-gray-300 hover:text-white">Caixas</Link>
          <Link to="/admin" className="text-gray-300 hover:text-white">Admin</Link>
          <Link to="/login" className="text-gray-300 hover:text-white">Entrar</Link>
        </nav>
      </header>

      <main className="p-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/purchase/:boxId" element={<Purchase />} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/admin/new" element={<AdminRoute><AdminNewBox /></AdminRoute>} />
          <Route path="/admin/box/:boxId" element={<AdminRoute><AdminBoxDetails /></AdminRoute>} />
          <Route path="/admin/box/:boxId/edit" element={<AdminRoute><AdminEditBox /></AdminRoute>} />
        </Routes>
      </main>
    </div>
  )
}
