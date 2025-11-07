import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { onAuthChanged, getUserProfile, logout as firebaseLogout } from '../firebase/auth'

type AuthContextValue = {
  user: User | null
  profile: any | null
  loading: boolean
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check for admin session in localStorage
    const adminProfile = localStorage.getItem('adminProfile')
    if (adminProfile) {
      try {
        const adminData = JSON.parse(adminProfile)
        setProfile(adminData)
        setIsAdmin(true)
        setLoading(false)
        return
      } catch (error) {
        console.error('Error parsing admin profile:', error)
        localStorage.removeItem('adminProfile')
      }
    }

    // Check Firebase auth for regular users
    const unsub = onAuthChanged(async u => {
      setUser(u)
      if (u) {
        // Clear admin session when Firebase user logs in
        localStorage.removeItem('adminProfile')
        setIsAdmin(false)

        const p = await getUserProfile(u.uid)
        setProfile(p)
      } else {
        setProfile(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    try {
      // Clear admin session if exists
      localStorage.removeItem('adminProfile')
      setIsAdmin(false)

      // Logout from Firebase if logged in
      await firebaseLogout()
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, logout: handleLogout, isAdmin }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
