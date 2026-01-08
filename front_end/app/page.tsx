'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, Server } from 'lucide-react'
import RecentSearches from '@/components/recent-searches'
import DashboardHeader from '@/components/dashboard-header'
import { PageHeader } from '@/components/page-header'
import { StatsOverview } from '@/components/stats-overview'
import { CollapsibleSection } from '@/components/collapsible-section'
import { ResourceListItem } from '@/components/resource-list-item'
import { machineApi, removeToken, type MachineDetail } from '@/lib/api'

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedHVs, setExpandedHVs] = useState(true)
  const [expandedVMs, setExpandedVMs] = useState(true)
  const [statsViewMode, setStatsViewMode] = useState<'numbers' | 'graph'>('numbers')
  const [machines, setMachines] = useState<MachineDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMachines()
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

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  const handleHVClick = (hostname: string) => {
    router.push(`/hv/${hostname}`)
  }

  const handleVMClick = (hostname: string) => {
    router.push(`/vm/${hostname}`)
  }

  const hypervisors = machines.filter(m => m.Is_Hypervisor)
  const virtualMachines = machines.filter(m => !m.Is_Hypervisor)

  const totalHVs = hypervisors.length
  const activeHVs = hypervisors.length // TODO: derive from metrics when status is available
  const totalVMs = virtualMachines.length
  const activeVMs = virtualMachines.length // TODO: derive from metrics when status is available

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        isAdmin={true}
      />

      <div className="px-6 py-12 max-w-6xl mx-auto">
        <PageHeader
          icon={Cloud}
          title="CloudVault"
          description="Manage your infrastructure with ease"
        />

        <StatsOverview
          title="Infrastructure Overview"
          viewMode={statsViewMode}
          onToggle={() => setStatsViewMode(prev => prev === 'numbers' ? 'graph' : 'numbers')}
        >
          {statsViewMode === 'numbers' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Total Hypervisors</p>
                <p className="text-3xl font-bold text-foreground">{totalHVs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Active Hypervisors</p>
                <p className="text-3xl font-bold text-primary">{activeHVs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Total Virtual Machines</p>
                <p className="text-3xl font-bold text-foreground">{totalVMs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Active Virtual Machines</p>
                <p className="text-3xl font-bold text-accent">{activeVMs}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Time-series charts for “total/active” counts aren’t available yet (we don’t store historical snapshots for these aggregates).
              Machine-level charts now use real metric history on the HV/VM detail pages.
            </div>
          )}
        </StatsOverview>

        <div className="space-y-12">
          <CollapsibleSection
            icon={Server}
            title="Owned Hypervisors"
            isExpanded={expandedHVs}
            onToggle={() => setExpandedHVs(!expandedHVs)}
          >
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : hypervisors.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No hypervisors found</div>
            ) : (
              hypervisors.map((hv) => (
                <ResourceListItem
                  key={hv.Machine_ID}
                  name={hv.Hostname}
                  status="on" // TODO: derive from metrics
                  onClick={() => handleHVClick(hv.Hostname)}
                />
              ))
            )}
          </CollapsibleSection>

          <CollapsibleSection
            icon={Server}
            title="Owned Virtual Machines"
            isExpanded={expandedVMs}
            onToggle={() => setExpandedVMs(!expandedVMs)}
            iconColor="text-accent"
          >
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : virtualMachines.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No virtual machines found</div>
            ) : (
              virtualMachines.map((vm) => (
                <ResourceListItem
                  key={vm.Machine_ID}
                  name={vm.Hostname}
                  status="on" // TODO: derive from metrics
                  onClick={() => handleVMClick(vm.Hostname)}
                />
              ))
            )}
          </CollapsibleSection>

          <RecentSearches />
        </div>
      </div>
    </div>
  )
}
