'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function ChangeUsernamePage() {
  const router = useRouter()
  const [newUsername, setNewUsername] = useState('')
  const [confirmUsername, setConfirmUsername] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newUsername || !confirmUsername) {
      setError('Please fill in all fields')
      return
    }

    if (newUsername !== confirmUsername) {
      setError('Usernames do not match')
      return
    }

    if (newUsername.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setIsLoading(true)
    try {
      const { authApi } = await import('@/lib/api')
      await authApi.updateUsername(newUsername)
      router.push('/account')
    } catch (err: any) {
      setError(err.message || 'Failed to update username')
      setIsLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#1a1625', minHeight: '100vh' }}>
      <div className="px-6 py-8 max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-8 transition-colors"
          style={{ color: '#5B9BD5' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#4A7BA7')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#5B9BD5')}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Page Title */}
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#ffffff' }}>
          Change Username
        </h1>
        <p className="mb-8" style={{ color: '#b0b0b0' }}>
          Enter your new username below
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div
            className="rounded-lg p-6 mb-6"
            style={{ backgroundColor: '#2d2238', borderLeft: '4px solid #5B9BD5' }}
          >
            {/* New Username */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                New Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: '#1a1625',
                  borderColor: '#3d3647',
                  color: '#ffffff',
                }}
                placeholder="Enter new username"
              />
            </div>

            {/* Confirm Username */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#b0b0b0' }}>
                Confirm Username
              </label>
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{
                  backgroundColor: '#1a1625',
                  borderColor: '#3d3647',
                  color: '#ffffff',
                }}
                placeholder="Confirm new username"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-3 rounded-lg mb-6"
                style={{ backgroundColor: '#5B2C2C', color: '#FF6B6B' }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: '#5B9BD5',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#4A7BA7')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#5B9BD5')}
          >
            {isLoading ? 'Updating...' : 'Update Username'}
          </button>
        </form>
      </div>
    </div>
  )
}
