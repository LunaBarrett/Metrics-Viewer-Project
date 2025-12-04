'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'

export default function AccountPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOwnedDropdownOpen, setIsOwnedDropdownOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Mock user data
  const user = {
    username: 'john_doe',
    email: 'john@example.com',
    accountType: 'admin',
    owned: [
      { id: 1, name: 'HV-Example-1', type: 'hypervisor' },
      { id: 2, name: 'HV-Example-2', type: 'hypervisor' },
      { id: 3, name: 'VM-Production-1', type: 'virtual machine' },
      { id: 4, name: 'VM-Dev-1', type: 'virtual machine' },
    ],
  }

  const handleLogout = () => {
    router.push('/login')
  }

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false)
    // Handle account deletion
    router.push('/login')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <div className="px-6 py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-12">Account Settings</h1>

        {/* Account Information Card */}
        <div
          className="rounded-xl p-8 mb-8 border border-border bg-secondary"
        >
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Account Information
          </h2>

          {/* Username */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-muted-foreground mb-3">
              Username
            </label>
            <div className="flex items-center justify-between">
              <p className="text-xl font-medium text-foreground">
                {user.username}
              </p>
              <button
                onClick={() => router.push('/account/change-username')}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-semibold"
              >
                Change Username
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-muted-foreground mb-3">
              Email Address
            </label>
            <div className="flex items-center justify-between">
              <p className="text-xl font-medium text-foreground">
                {user.email}
              </p>
              <button
                onClick={() => router.push('/account/change-email')}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-semibold"
              >
                Change Email
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="mb-0">
            <label className="block text-sm font-semibold text-muted-foreground mb-3">
              Password
            </label>
            <div className="flex items-center justify-between">
              <p className="text-xl font-medium text-muted-foreground">
                ••••••••
              </p>
              <button
                onClick={() => router.push('/account/change-password')}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-semibold"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Account Type and Owned Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Account Type */}
          <div
            className="rounded-xl p-8 border border-border bg-secondary"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Account Type
            </h2>
            <div
              className="inline-block px-4 py-2 rounded-lg font-bold"
              style={{
                backgroundColor: user.accountType === 'admin' ? '#3b82f6' : '#2d2535',
                color: user.accountType === 'admin' ? '#ffffff' : '#a0a0a0',
                textTransform: 'capitalize',
              }}
            >
              {user.accountType}
            </div>
          </div>

          {/* Owned Resources Dropdown */}
          <div
            className="rounded-xl p-8 border border-border bg-secondary"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Owned Resources
            </h2>
            <div className="relative">
              <button
                onClick={() => setIsOwnedDropdownOpen(!isOwnedDropdownOpen)}
                className="w-full px-4 py-3 rounded-lg flex items-center justify-between bg-input border border-border text-foreground hover:border-primary transition-colors font-medium"
              >
                <span>{user.owned.length} resources</span>
                <ChevronDown
                  size={20}
                  style={{
                    transform: isOwnedDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                  }}
                />
              </button>

              {isOwnedDropdownOpen && (
                <div
                  className="absolute top-12 left-0 right-0 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto bg-secondary border border-border"
                >
                  {user.owned.map((resource, index) => (
                    <button
                      key={resource.id}
                      onClick={() => {
                        const path = resource.type === 'hypervisor' ? `/hv/${resource.id}` : `/vm/${resource.id}`
                        router.push(path)
                      }}
                      className="w-full px-4 py-4 text-sm border-b last:border-b-0 border-border text-left hover:bg-primary/10 transition-colors"
                    >
                      <div className="text-foreground font-medium">{resource.name}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {resource.type}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div
          className="rounded-xl p-8 border border-destructive/30 bg-secondary"
        >
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Danger Zone
          </h2>
          <p className="text-muted-foreground mb-6">
            Deleting your account is permanent and cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 font-semibold transition-opacity"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        title="Are you sure?"
        message="This action cannot be undone. Your account and all associated data will be permanently deleted."
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
