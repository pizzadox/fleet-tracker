'use client'

import React, { useState, useEffect } from 'react'
import { Truck, ArrowLeft, User, X, CheckCircle2, Loader2 } from 'lucide-react'
import type { AppUserType, RoleKey } from '@/lib/types'
import { ROLE_LABELS, getInitials } from '@/lib/constants'

export function PinLoginScreen({ onLogin, users: allUsers, fetchUsers }: {
  onLogin: (user: AppUserType) => void
  users: AppUserType[]
  fetchUsers: () => void
}) {
  const [selectedUser, setSelectedUser] = useState<AppUserType | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usersList, setUsersList] = useState<AppUserType[]>(allUsers)

  useEffect(() => { setUsersList(allUsers) }, [allUsers])
  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Remember last login
  useEffect(() => {
    const lastUserId = localStorage.getItem('fleet_lastUserId')
    if (lastUserId && !selectedUser) {
      const last = usersList.find(u => u.id === lastUserId && u.isActive)
      if (last) setSelectedUser(last)
    }
  }, [usersList, selectedUser])

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
      setError('')
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleSubmit = async () => {
    if (!selectedUser || pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        localStorage.setItem('fleet_lastUserId', selectedUser.id)
        onLogin(data.user)
      } else {
        setError(data.error || 'Ошибка входа')
        setPin('')
      }
    } catch {
      setError('Ошибка подключения')
      setPin('')
    }
    setLoading(false)
  }

  // Auto-submit when PIN is 4+ digits
  useEffect(() => {
    if (pin.length >= 4 && selectedUser) {
      handleSubmit()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, selectedUser])

  const activeUsers = usersList.filter(u => u.isActive)

  if (!selectedUser) {
    // User selection screen
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
              <Truck className="size-8" />
            </div>
            <h1 className="text-2xl font-bold">Учёт техники</h1>
            <p className="text-muted-foreground text-sm mt-1">Выберите пользователя для входа</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {activeUsers.map(user => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); setPin(''); setError('') }}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-accent transition-colors group"
              >
                <div
                  className="size-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: user.avatar || '#6366f1' }}
                >
                  {getInitials(user.name)}
                </div>
                <span className="text-xs font-medium text-center leading-tight max-w-[80px] truncate">{user.name}</span>
                <span className="text-[9px] text-muted-foreground">{ROLE_LABELS[user.role as RoleKey] || user.role}</span>
              </button>
            ))}
          </div>
          {activeUsers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <User className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Нет активных пользователей</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // PIN entry screen
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs">
        <button
          onClick={() => { setSelectedUser(null); setPin(''); setError('') }}
          className="flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />Назад
        </button>

        <div className="text-center mb-6">
          <div
            className="size-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg mx-auto mb-3"
            style={{ backgroundColor: selectedUser.avatar || '#6366f1' }}
          >
            {getInitials(selectedUser.name)}
          </div>
          <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[selectedUser.role as RoleKey] || selectedUser.role}</p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`size-3 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-primary scale-125'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 mb-3 animate-pulse">{error}</p>
        )}

        {loading && (
          <div className="flex justify-center mb-3">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} />
            if (key === '⌫') {
              return (
                <button
                  key={i}
                  onClick={handleBackspace}
                  className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center active:scale-95 transition-transform text-lg"
                >
                  <X className="size-5" />
                </button>
              )
            }
            return (
              <button
                key={i}
                onClick={() => handlePinInput(key)}
                className="h-14 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center active:scale-95 transition-transform text-xl font-medium"
              >
                {key}
              </button>
            )
          })}
        </div>

        {/* Enter button for 5-6 digit PINs */}
        {pin.length >= 4 && !loading && (
          <button
            onClick={handleSubmit}
            className="w-full mt-4 h-12 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="size-5" />Войти
          </button>
        )}
      </div>
    </div>
  )
}
