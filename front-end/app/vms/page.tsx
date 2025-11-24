'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Server } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardHeader from '@/components/dashboard-header'
import ResourceCardList from '@/components/resource-card-list'
import { PageHeader } from '@/components/page-header'
import { StatsOverview } from '@/components/stats-overview'

const generateInitialGraphData = (baseValue: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    time: i,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3),
  }))
}

export default function VMsPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statsViewMode, setStatsViewMode] = useState<'numbers' | 'graph'>('numbers')
  const [graphData, setGraphData] = useState<{ [key: string]: any[] }>({})
  const initializedRef = useRef(false)

  const handleLogout = () => {
    router.push('/login')
  }

  const totalVMs = 24
  const activeVMs = 18

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      const initialData: { [key: string]: any[] } = {}
      initialData['vm-total'] = generateInitialGraphData(totalVMs)
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
            <div>
              <p className="text-muted-foreground text-sm font-semibold mb-4">VM Count</p>
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
                <LineChart data={graphData['vm-total'] || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #8b5cf6' }} />
                  <Line type="monotone" dataKey="value" stroke="#8b5cf6" dot={false} isAnimationActive={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </StatsOverview>
        
        <ResourceCardList resourceType="vms" searchQuery={searchQuery} />
      </main>
    </div>
  )
}
