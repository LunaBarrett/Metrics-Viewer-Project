'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Server } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'
import ResourceCardList from '@/components/resource-card-list'
import { PageHeader } from '@/components/page-header'
import { StatsOverview } from '@/components/stats-overview'
import { machineApi, removeToken, type MachineDetail } from '@/lib/api'

export default function HVsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statsViewMode, setStatsViewMode] = useState<'numbers' | 'graph'>('numbers')
  const [machines, setMachines] = useState<MachineDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMachines()
  }, [])

  const loadMachines = async () => {
    try {
      const allMachines = await machineApi.listMachines()
      const hvs = allMachines.filter(m => m.Is_Hypervisor)
      setMachines(hvs)
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

  const totalHVs = machines.length
  const activeHVs = machines.length // TODO: derive from metrics when status is available

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        activeTab="hvs"
        isAdmin={true}
      />

      <main className="px-6 py-12 max-w-6xl mx-auto">
        <PageHeader
          icon={Server}
          title="Hypervisors"
          description="Manage all your hypervisors"
        />

        <StatsOverview
          title="Hypervisor Statistics"
          viewMode={statsViewMode}
          onToggle={() => setStatsViewMode(prev => prev === 'numbers' ? 'graph' : 'numbers')}
        >
          {statsViewMode === 'numbers' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Total Hypervisors</p>
                <p className="text-3xl font-bold text-foreground">{totalHVs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Active Hypervisors</p>
                <p className="text-3xl font-bold text-primary">{activeHVs}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Time-series charts for hypervisor counts aren’t available yet (no historical snapshot data for aggregates).
              For real charts, open an HV/VM and use the new metrics history-backed graphs there.
            </div>
          )}
        </StatsOverview>
        
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading hypervisors...</div>
        ) : (
          <ResourceCardList resourceType="hvs" searchQuery={searchQuery} machines={machines} />
        )}
      </main>
    </div>
  )
}
