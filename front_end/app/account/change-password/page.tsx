'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/dashboard-header'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    try {
      const { authApi } = await import('@/lib/api')
      await authApi.updatePassword(newPassword)
      router.push('/account')
    } catch (err: any) {
      alert(err.message || 'Failed to update password')
    }
  }

  return (
    <div style={{ backgroundColor: '#1a1625', minHeight: '100vh' }}>
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={() => router.push('/login')}
      />

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: '#ffffff' }}>
          Change Password
        </h1>

        <div
          className="rounded-lg p-8"
          style={{ backgroundColor: '#2d2238' }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#1a1625', borderColor: '#3d3647', color: '#ffffff' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#1a1625', borderColor: '#3d3647', color: '#ffffff' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#1a1625', borderColor: '#3d3647', color: '#ffffff' }}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: '#5B9BD5',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A7BA7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5B9BD5')}
              >
                Update Password
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 rounded-lg font-medium"
                style={{
                  backgroundColor: '#4A4A4A',
                  color: '#ffffff',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5A5A5A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4A4A4A')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
