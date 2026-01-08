'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Shield, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import DashboardHeader from '@/components/dashboard-header'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'
import { authApi, adminApi, removeToken } from '@/lib/api'

interface User {
  User_ID: number
  Username: string
  Admin_Status: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [accounts, setAccounts] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdminAndLoadUsers()
  }, [])

  const checkAdminAndLoadUsers = async () => {
    try {
      const profileResponse = await authApi.getProfile()
      if (profileResponse.data) {
        const adminStatus = profileResponse.data.Admin_Status
        setIsAdmin(adminStatus)
        
        if (adminStatus) {
          const usersResponse = await adminApi.listUsers()
          if (usersResponse.users) {
            setAccounts(usersResponse.users)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter(account =>
    account.Username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  const handleDeleteAccount = async (userId: number) => {
    try {
      await adminApi.deleteUser(userId)
      setAccounts(accounts.filter(a => a.User_ID !== userId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete user:', err)
      setDeleteConfirm(null)
    }
  }

  // Admin-only protection
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1625' }}>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

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
            label="Total Accounts" 
            value={accounts.length}
            valueColor="text-primary"
          />
          <StatCard 
            label="Admin Accounts" 
            value={accounts.filter(a => a.Admin_Status).length}
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
                  <tr key={account.User_ID} className="border-b border-border hover:bg-background/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{account.Username}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: account.Admin_Status ? '#3b82f6' : '#2d2535',
                          color: account.Admin_Status ? '#ffffff' : '#a0a0a0',
                        }}
                      >
                        {account.Admin_Status ? 'Admin' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteConfirm(account.User_ID)}
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
        onConfirm={() => deleteConfirm !== null && handleDeleteAccount(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
