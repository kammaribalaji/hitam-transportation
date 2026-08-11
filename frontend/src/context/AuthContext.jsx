import React, { createContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('hitam_token'))
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await api.get('/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      setUser(res.data.user)
    } catch {
      setUser(null)
      setToken(null)
      localStorage.removeItem('hitam_token')
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
    setToken(t)
    setUser(u)
    return u
  }

  const logout = () => {
    localStorage.removeItem('hitam_token')
    setToken(null)
    setUser(null)
  }

  const updateUser = (updates) => setUser((prev) => ({ ...prev, ...updates }))

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}
