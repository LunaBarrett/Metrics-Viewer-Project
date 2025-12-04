'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Power } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'

interface Resource {
  id: string
  name: string
  status: 'running' | 'stopped' | 'paused'
  cpu: number
  memory: number
  storage: number
  type: string
  resourceType: 'hv' | 'vm'
  hostHV?: string
  owner?: string
  operatingSystem?: string
}

// Mock data
const mockHVs = [
  { id: '1', name: 'HV-Example-1', status: 'running' as const, cpu: 128, memory: 512, storage: 2000, type: 'Proxmox', resourceType: 'hv' as const, owner: 'John Doe' },
  { id: '2', name: 'HV-Example-2', status: 'stopped' as const, cpu: 96, memory: 384, storage: 1500, type: 'ESXi', resourceType: 'hv' as const, owner: 'Jane Smith' },
  { id: '3', name: 'HV-Example-3', status: 'running' as const, cpu: 64, memory: 256, storage: 1000, type: 'KVM', resourceType: 'hv' as const, owner: 'John Doe' },
]

const mockVMs = [
  { id: 'v1', name: 'VM1', status: 'running' as const, cpu: 4, memory: 8, storage: 100, type: 'Linux', hostHV: 'HV-Example-1', resourceType: 'vm' as const, owner: 'John Doe', operatingSystem: 'Ubuntu 22.04' },
  { id: 'v2', name: 'VM2', status: 'stopped' as const, cpu: 8, memory: 32, storage: 500, type: 'Linux', hostHV: 'HV-Example-1', resourceType: 'vm' as const, owner: 'Jane Smith', operatingSystem: 'CentOS 8' },
  { id: 'v3', name: 'VM3', status: 'running' as const, cpu: 2, memory: 4, storage: 50, type: 'Windows', hostHV: 'HV-Example-1', resourceType: 'vm' as const, owner: 'John Doe', operatingSystem: 'Windows Server 2022' },
]

const allResources: Resource[] = [...mockHVs, ...mockVMs]

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

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(query)

  const filtered = useMemo(
    () => allResources.filter(r => {
      const queryLower = searchQuery.toLowerCase()
      const nameMatch = r.name.toLowerCase().includes(queryLower)
      const ownerMatch = r.owner?.toLowerCase().includes(queryLower)
      const osMatch = r.operatingSystem?.toLowerCase().includes(queryLower)
      return nameMatch || ownerMatch || osMatch
    }),
    [searchQuery]
  )

  const handleLogout = () => {
    // TODO: Implement logout
  }

  const handleResultClick = (resource: Resource) => {
    if (resource.resourceType === 'hv') {
      router.push(`/hv/${resource.id}`)
    } else {
      router.push(`/vm/${resource.id}`)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} onLogout={handleLogout} isAdmin={true} />
      
      <main className="px-6 py-8">
        {searchQuery.trim() && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Search Results</h1>
            <p className="text-muted-foreground">
              Found <span className="font-semibold text-foreground">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''} for "{searchQuery}"
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Search by resource name, owner, or operating system
            </p>
          </div>
        )}

        {searchQuery.trim() ? (
          filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => handleResultClick(resource)}
                  className="w-full text-left rounded-xl p-6 border border-border bg-secondary transition-all hover:border-primary/50 hover:bg-secondary/80"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <ChevronRight size={20} className="text-primary flex-shrink-0" />
                      <div>
                        <p className="text-foreground font-semibold text-lg">{resource.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span className="px-2 py-1 rounded-full text-xs bg-muted">
                            {resource.resourceType === 'hv' ? 'Hypervisor' : 'Virtual Machine'}
                          </span>
                          {resource.owner && <span>Owner: {resource.owner}</span>}
                          {resource.operatingSystem && <span>{resource.operatingSystem}</span>}
                          {resource.hostHV && resource.resourceType === 'vm' && <span>{resource.hostHV}</span>}
                        </div>
                      </div>
                    </div>
                    {getStatusIcon(resource.status)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">No results found</p>
              <p className="text-muted-foreground">Try searching by name, owner, or operating system</p>
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-2">Enter a search query to begin</p>
            <p className="text-muted-foreground">Search by resource name, owner, or operating system</p>
          </div>
        )}
      </main>
    </div>
  )
}
