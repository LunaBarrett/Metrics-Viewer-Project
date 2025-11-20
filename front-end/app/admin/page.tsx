'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Shield, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import DashboardHeader from '@/components/dashboard-header'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'

export default function AdminPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Mock admin check - in production, this would verify user role
  const isAdmin = true

  // Mock accounts data
  const [accounts, setAccounts] = useState([
    { id: 1, username: 'john_doe', status: 'active', accountType: 'admin' },
    { id: 2, username: 'jane_smith', status: 'active', accountType: 'standard' },
    { id: 3, username: 'mike_wilson', status: 'active', accountType: 'standard' },
    { id: 4, username: 'sarah_johnson', status: 'inactive', accountType: 'standard' },
    { id: 5, username: 'alex_brown', status: 'active', accountType: 'standard' },
  ])

  const filteredAccounts = accounts.filter(account =>
    account.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = () => {
    router.push('/login')
  }

  const handleDeleteAccount = (accountId: string) => {
    setAccounts(accounts.filter(a => a.id.toString() !== accountId))
    setDeleteConfirm(null)
  }

  // Admin-only protection
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1625' }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to access this page.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-accent transition-colors font-semibold"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <div className="px-6 py-12 max-w-6xl mx-auto">
        <PageHeader
          icon={Shield}
          title="Admin Panel"
          description=""
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Total Accounts" value={accounts.length} />
          <StatCard 
            label="Active Accounts" 
            value={accounts.filter(a => a.status === 'active').length}
            valueColor="text-primary"
          />
          <StatCard 
            label="Admin Accounts" 
            value={accounts.filter(a => a.accountType === 'admin').length}
            valueColor="text-accent"
          />
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <Input
            type="text"
            placeholder="Search accounts by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder-muted-foreground border border-border focus:border-ring"
          />
        </div>

        {/* Accounts Table */}
        <div className="rounded-xl border border-border bg-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Account Type</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-border hover:bg-background/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{account.username}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: account.accountType === 'admin' ? '#3b82f6' : '#2d2535',
                          color: account.accountType === 'admin' ? '#ffffff' : '#a0a0a0',
                        }}
                      >
                        {account.accountType === 'admin' ? 'Admin' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm(account.id.toString())}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Delete account"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAccounts.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground">No accounts found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={!!deleteConfirm}
        title="Delete Account?"
        message="This action will permanently delete the account and cannot be undone. All associated data will be lost."
        onConfirm={() => deleteConfirm && handleDeleteAccount(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
