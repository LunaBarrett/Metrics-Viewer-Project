'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, Server } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import RecentSearches from '@/components/recent-searches'
import DashboardHeader from '@/components/dashboard-header'
import { PageHeader } from '@/components/page-header'
import { StatsOverview } from '@/components/stats-overview'
import { CollapsibleSection } from '@/components/collapsible-section'
import { ResourceListItem } from '@/components/resource-list-item'

const generateInitialGraphData = (baseValue: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    time: i,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3),
  }))
}

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedHVs, setExpandedHVs] = useState(true)
  const [expandedVMs, setExpandedVMs] = useState(true)
  const [statsViewMode, setStatsViewMode] = useState<'numbers' | 'graph'>('numbers')
  const [graphData, setGraphData] = useState<{ [key: string]: any[] }>({})
  const initializedRef = useRef(false)

  const handleLogout = () => {
    router.push('/login')
  }

  const handleHVClick = (hvId: number) => {
    router.push(`/hv/${hvId}`)
  }

  const handleVMClick = (vmId: number) => {
    router.push(`/vm/${vmId}`)
  }

  const hypervisors = [
    { id: 1, name: 'HV-Example-1', status: 'on' },
    { id: 2, name: 'HV-Example-2', status: 'off' },
    { id: 3, name: 'HV-Example-3', status: 'on' },
  ]

  const virtualMachines = [
    { id: 1, name: 'VM1', status: 'on' },
    { id: 2, name: 'VM2', status: 'off' },
    { id: 3, name: 'VM3', status: 'on' },
  ]

  const totalHVs = hypervisors.length
  const activeHVs = hypervisors.filter(hv => hv.status === 'on').length
  const totalVMs = virtualMachines.length
  const activeVMs = virtualMachines.filter(vm => vm.status === 'on').length

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      const initialData: { [key: string]: any[] } = {}
      initialData['hv-stats'] = generateInitialGraphData(totalHVs)
      initialData['hv-active'] = generateInitialGraphData(activeHVs)
      initialData['vm-stats'] = generateInitialGraphData(totalVMs)
      initialData['vm-active'] = generateInitialGraphData(activeVMs)
      setGraphData(initialData)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setGraphData(prevData => {
        const newData = { ...prevData }
        Object.keys(newData).forEach(key => {
          if (newData[key] && newData[key].length > 0) {
            const lastValue = newData[key][newData[key].length - 1].value
            newData[key] = [
              ...newData[key].slice(1),
              {
                time: newData[key][newData[key].length - 1].time + 1,
                value: Math.max(0, lastValue + (Math.random() - 0.5) * lastValue * 0.2),
              },
            ]
          }
        })
        return newData
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hypervisors Graph */}
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-4">Hypervisors</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold text-foreground">{totalHVs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Active</p>
                    <p className="text-2xl font-bold text-primary">{activeHVs}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={graphData['hv-stats'] || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Virtual Machines Graph */}
              <div>
                <p className="text-muted-foreground text-sm font-semibold mb-4">Virtual Machines</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-bold text-foreground">{totalVMs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Active</p>
                    <p className="text-2xl font-bold text-accent">{activeVMs}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={graphData['vm-stats'] || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" dot={false} isAnimationActive={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
            {hypervisors.map((hv) => (
              <ResourceListItem
                key={hv.id}
                name={hv.name}
                status={hv.status}
                onClick={() => handleHVClick(hv.id)}
              />
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            icon={Server}
            title="Owned Virtual Machines"
            isExpanded={expandedVMs}
            onToggle={() => setExpandedVMs(!expandedVMs)}
            iconColor="text-accent"
          >
            {virtualMachines.map((vm) => (
              <ResourceListItem
                key={vm.id}
                name={vm.name}
                status={vm.status}
                onClick={() => handleVMClick(vm.id)}
              />
            ))}
          </CollapsibleSection>

          <RecentSearches />
        </div>
      </div>
    </div>
  )
}
