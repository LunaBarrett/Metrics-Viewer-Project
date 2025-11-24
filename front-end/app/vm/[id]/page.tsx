'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Power, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardHeader from '@/components/dashboard-header'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { InfoCard } from '@/components/info-card'

interface VM {
  id: string
  name: string
  status: 'running' | 'stopped' | 'paused'
  cpu: number
  memory: number
  storage: number
  hostHV: string
  owner: string
  os: string
  allocatedCpu: number
  allocatedMemory: number
  allocatedStorage: number
  totalHostCpu: number
  totalHostMemory: number
  totalHostStorage: number
}

// Mock data
const mockVMs: VM[] = [
  { id: 'v1', name: 'VM1', status: 'running', cpu: 4, memory: 8, storage: 100, hostHV: 'HV-Example-1', owner: 'John Doe', os: 'Ubuntu 22.04', allocatedCpu: 4, allocatedMemory: 8, allocatedStorage: 100, totalHostCpu: 32, totalHostMemory: 128, totalHostStorage: 2000 },
  { id: 'v2', name: 'VM2', status: 'stopped', cpu: 8, memory: 32, storage: 500, hostHV: 'HV-Example-1', owner: 'Jane Smith', os: 'CentOS 8', allocatedCpu: 8, allocatedMemory: 32, allocatedStorage: 500, totalHostCpu: 32, totalHostMemory: 128, totalHostStorage: 2000 },
  { id: 'v3', name: 'VM3', status: 'running', cpu: 2, memory: 4, storage: 50, hostHV: 'HV-Example-1', owner: 'Bob Wilson', os: 'Windows Server 2022', allocatedCpu: 2, allocatedMemory: 4, allocatedStorage: 50, totalHostCpu: 32, totalHostMemory: 128, totalHostStorage: 2000 },
]

const generateInitialGraphData = (baseValue: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    time: i,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3),
  }))
}

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

export default function VMDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vmId = params.id as string
  const vm = mockVMs.find(v => v.id === vmId)

  const [viewModes, setViewModes] = useState<{ [key: string]: 'numbers' | 'graph' }>(() => {
    const initialModes: { [key: string]: 'numbers' | 'graph' } = {}
    if (vm) {
      initialModes[`${vm.id}-cpu`] = 'graph'
      initialModes[`${vm.id}-memory`] = 'graph'
      initialModes[`${vm.id}-storage`] = 'graph'
    }
    return initialModes
  })
  const [graphData, setGraphData] = useState<{ [key: string]: any[] }>({})
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current && vm) {
      initializedRef.current = true
      const initialData: { [key: string]: any[] } = {}
      initialData[`${vm.id}-cpu`] = generateInitialGraphData(vm.cpu)
      initialData[`${vm.id}-memory`] = generateInitialGraphData(vm.memory)
      initialData[`${vm.id}-storage`] = generateInitialGraphData(vm.storage)
      setGraphData(initialData)
    }
  }, [vm?.id])

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

  if (!vm) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
        <DashboardHeader isAdmin={true} />
        <main className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Virtual machine not found</p>
        </main>
      </div>
    )
  }

  const handleLogout = () => {
    // TODO: Implement logout
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader onLogout={handleLogout} isAdmin={true} />
      
      <main className="px-6 py-8 max-w-6xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-bold text-foreground">{vm.name}</h1>
            {getStatusIcon(vm.status)}
          </div>
          <p className="text-muted-foreground text-sm">{vm.os}</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <InfoCard
            label="Hosted On"
            value={vm.hostHV}
            onClick={() => router.push(`/hv/1`)}
          />
          <InfoCard label="Owner" value={vm.owner} />
          <InfoCard label="Operating System" value={vm.os} />
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Resource Allocation</h2>
          <div className="grid grid-cols-3 gap-6">
            <InfoCard label="CPU Cores" value={`${vm.allocatedCpu} / ${vm.totalHostCpu}`} />
            <InfoCard label="Memory" value={`${vm.allocatedMemory} / ${vm.totalHostMemory}GB`} />
            <InfoCard label="Disk Space" value={`${vm.allocatedStorage} / ${vm.totalHostStorage}GB`} />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Resource Usage</h2>
          <div className="grid grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-bold">CPU USAGE</p>
                <ViewModeToggle
                  mode={viewModes[`${vm.id}-cpu`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${vm.id}-cpu`]: prev[`${vm.id}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${vm.id}-cpu`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{vm.cpu}</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${vm.id}-cpu`] || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Memory Usage */}
            <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-bold">MEMORY USAGE</p>
                <ViewModeToggle
                  mode={viewModes[`${vm.id}-memory`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${vm.id}-memory`]: prev[`${vm.id}-memory`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${vm.id}-memory`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{vm.memory}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${vm.id}-memory`] || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Disk Usage */}
            <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-bold">DISK USAGE</p>
                <ViewModeToggle
                  mode={viewModes[`${vm.id}-storage`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${vm.id}-storage`]: prev[`${vm.id}-storage`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${vm.id}-storage`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{vm.storage}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${vm.id}-storage`] || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
