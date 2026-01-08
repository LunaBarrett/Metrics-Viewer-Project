'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { ChevronRight, Power } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'
import { machineApi, removeToken, type MachineDetail } from '@/lib/api'

function getStatusIcon(status: string) {
  const iconProps = { size: 24, strokeWidth: 2 }
  switch (status) {
    case 'running':
      return <Power {...iconProps} className="text-green-500" />
    case 'stopped':
      return <Power {...iconProps} className="text-red-500" />
    case 'paused':
      return <Power {...iconProps} className="text-yellow-500" />
    default:
      return <Power {...iconProps} className="text-gray-500" />
  }
}

export default function SearchClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(query)
  const [machines, setMachines] = useState<MachineDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMachines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMachines = async () => {
    try {
      const allMachines = await machineApi.listMachines()
      setMachines(allMachines)
    } catch (err) {
      console.error('Failed to load machines:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(
    () =>
      machines.filter((m) => {
        const queryLower = searchQuery.toLowerCase()
        const nameMatch = m.Hostname.toLowerCase().includes(queryLower)
        const platformMatch = m.Platform?.toLowerCase().includes(queryLower)
        return nameMatch || platformMatch
      }),
    [searchQuery, machines]
  )

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  const handleResultClick = (machine: MachineDetail) => {
    if (machine.Is_Hypervisor) {
      router.push(`/hv/${machine.Hostname}`)
    } else {
      router.push(`/vm/${machine.Hostname}`)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        isAdmin={true}
      />

      <main className="px-6 py-8">
        {searchQuery.trim() && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Search Results
            </h1>
            <p className="text-muted-foreground">
              Found{' '}
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>{' '}
              result{filtered.length !== 1 ? 's' : ''} for &quot;{searchQuery}
              &quot;
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Search by resource name, owner, or operating system
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : searchQuery.trim() ? (
          filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((machine) => (
                <button
                  key={machine.Machine_ID}
                  onClick={() => handleResultClick(machine)}
                  className="w-full text-left rounded-xl p-6 border border-border bg-secondary transition-all hover:border-primary/50 hover:bg-secondary/80"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <ChevronRight
                        size={20}
                        className="text-primary flex-shrink-0"
                      />
                      <div>
                        <p className="text-foreground font-semibold text-lg">
                          {machine.Hostname}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="px-2 py-1 rounded-full text-xs bg-muted">
                            {machine.Is_Hypervisor
                              ? 'Hypervisor'
                              : 'Virtual Machine'}
                          </span>
                          {machine.Platform && <span>{machine.Platform}</span>}
                        </div>
                      </div>
                    </div>
                    {getStatusIcon('running')} {/* TODO: derive from metrics */}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">
                No results found
              </p>
              <p className="text-muted-foreground">
                Try searching by name or platform
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-2">
              Enter a search query to begin
            </p>
            <p className="text-muted-foreground">
              Search by resource name or platform
            </p>
          </div>
        )}
      </main>
    </div>
  )
}


