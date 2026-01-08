'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Server } from 'lucide-react'
import DashboardHeader from '@/components/dashboard-header'
import ResourceCardList from '@/components/resource-card-list'
import { PageHeader } from '@/components/page-header'
import { StatsOverview } from '@/components/stats-overview'
import { machineApi, removeToken, type MachineDetail } from '@/lib/api'

export default function VMsPage() {
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
      const vms = allMachines.filter(m => !m.Is_Hypervisor)
      setMachines(vms)
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

  const totalVMs = machines.length
  const activeVMs = machines.length // TODO: derive from metrics when status is available

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
        activeTab="vms"
        isAdmin={true}
      />

      <main className="px-6 py-12 max-w-6xl mx-auto">
        <PageHeader
          icon={Server}
          title="Virtual Machines"
          description="Manage all your virtual machines"
          iconColor="text-accent"
        />

        <StatsOverview
          title="Virtual Machine Statistics"
          viewMode={statsViewMode}
          onToggle={() => setStatsViewMode(prev => prev === 'numbers' ? 'graph' : 'numbers')}
        >
          {statsViewMode === 'numbers' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Total VMs</p>
                <p className="text-3xl font-bold text-foreground">{totalVMs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-2">Active VMs</p>
                <p className="text-3xl font-bold text-accent">{activeVMs}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Time-series charts for VM counts aren’t available yet (no historical snapshot data for aggregates).
              For real charts, open a VM and use the new metrics history-backed graphs there.
            </div>
          )}
        </StatsOverview>
        
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading virtual machines...</div>
        ) : (
          <ResourceCardList resourceType="vms" searchQuery={searchQuery} machines={machines} />
        )}
      </main>
    </div>
  )
}
