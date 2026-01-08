'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, User, Settings, Home, LogOut, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { authApi, removeToken, type UserProfile } from '@/lib/api'

interface DashboardHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onLogout: () => void
  activeTab?: 'hvs' | 'vms'
  isAdmin?: boolean
}

export default function DashboardHeader({
  searchQuery,
  onSearchChange,
  onLogout,
  activeTab,
  isAdmin: propIsAdmin = false,
}: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(propIsAdmin)
  const [user, setUser] = useState<UserProfile | null>(null)

  const isHome = pathname === '/'
  const isHVPage = pathname === '/hvs'
  const isVMPage = pathname === '/vms'

  useEffect(() => {
    // Load user profile to check admin status
    const loadUser = async () => {
      try {
        const profileResponse = await authApi.getProfile()
        if (profileResponse.data) {
          setUser(profileResponse.data)
          setIsAdmin(profileResponse.data.Admin_Status)
        }
      } catch (err) {
        // Not logged in or error - will be handled by auth redirect
      }
    }
    loadUser()
  }, [])

  const handleLogout = () => {
    setIsDropdownOpen(false)
    removeToken()
    if (onLogout) {
      onLogout()
    } else {
      router.push('/login')
    }
  }

  const handleNavigate = (path: string) => {
    setIsDropdownOpen(false)
    router.push(path)
  }

  return (
    <nav className="border-b bg-background" style={{ borderColor: '#2d2535' }}>
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        {/* Left: Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              isHome
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground border border-border hover:border-muted-foreground'
            }`}
            title="Home"
          >
            <Home size={18} />
          </button>
          <button
            onClick={() => router.push('/hvs')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'hvs' || (isHome && activeTab === 'hvs')
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground border border-border hover:border-muted-foreground'
            }`}
          >
            HVs
          </button>
          <button
            onClick={() => router.push('/vms')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              activeTab === 'vms' || (isHome && activeTab === 'vms')
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground border border-border hover:border-muted-foreground'
            }`}
          >
            VMs
          </button>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
              }
            }}
            className="pl-10 pr-4 py-2 rounded-lg bg-input text-foreground placeholder-muted-foreground border border-border focus:border-ring"
          />
        </div>

        {/* Right: Profile Menu */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:bg-accent transition-colors"
            >
              <User size={20} className="text-primary-foreground" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-secondary border border-border shadow-lg z-50">
                <button
                  onClick={() => handleNavigate('/account')}
                  className="w-full px-4 py-3 text-left text-foreground hover:bg-muted transition-colors flex items-center gap-2 rounded-t-lg"
                >
                  <User size={16} />
                  Account Settings
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleNavigate('/admin')}
                    className="w-full px-4 py-3 text-left text-foreground hover:bg-muted transition-colors flex items-center gap-2 border-t border-border"
                  >
                    <Lock size={16} />
                    Admin Panel
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 rounded-b-lg border-t border-border"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  )
}
