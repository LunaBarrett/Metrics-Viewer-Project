'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/dashboard-header'

export default function ChangeEmailPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle email change
    if (newEmail === confirmEmail) {
      // Logic to update email
      console.log('Email updated successfully')
      router.push('/account')
    } else {
      console.error('Emails do not match')
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
          Change Email Address
        </h1>

        <div
          className="rounded-lg p-8"
          style={{ backgroundColor: '#2d2238' }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                New Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#1a1625', borderColor: '#3d3647', color: '#ffffff' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                Confirm Email Address
              </label>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ backgroundColor: '#1a1625', borderColor: '#3d3647', color: '#ffffff' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                Current Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Update Email
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
