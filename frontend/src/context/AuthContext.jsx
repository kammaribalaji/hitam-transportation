import React, { createContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('hitam_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('hitam_token'))
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      if (res.data?.user) {
        setUser(res.data.user)
        try {
          localStorage.setItem('hitam_user', JSON.stringify(res.data.user))
        } catch {}
      }
    } catch (err) {
      console.warn('[Auth] Session check background error, keeping local user state:', err?.message)
      // Only clear if 401 and explicitly unauthenticated with no local user
      if (err.response?.status === 401 && !localStorage.getItem('hitam_user')) {
        setUser(null)
        setToken(null)
        localStorage.removeItem('hitam_token')
        localStorage.removeItem('hitam_user')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchMe(token)
    else setLoading(false)
  }, [token, fetchMe])

  const login = async (rollNumber, password) => {
    const res = await api.post('/auth/login', { rollNumber, password })
    const { token: t, user: u } = res.data
    localStorage.setItem('hitam_token', t)
    localStorage.setItem('hitam_user', JSON.stringify(u))
    setToken(t)
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('hitam_token')
    localStorage.removeItem('hitam_user')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates }
      try {
        localStorage.setItem('hitam_user', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
