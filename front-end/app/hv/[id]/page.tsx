'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, ChevronRight, Power, Trash2, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardHeader from '@/components/dashboard-header'
import { ViewModeToggle } from '@/components/view-mode-toggle'

interface Resource {
  id: string
  name: string
  status: 'running' | 'stopped' | 'paused'
  cpu: number
  memory: number
  storage: number
  type: string
}

interface VM extends Resource {
  hostHV: string
  owner: string
  os: string
  allocatedCpu: number
  allocatedMemory: number
  allocatedStorage: number
}

// Mock data
const mockHVs: Resource[] = [
  { id: '1', name: 'HV-Example-1', status: 'running', cpu: 128, memory: 512, storage: 2000, type: 'Proxmox' },
  { id: '2', name: 'HV-Example-2', status: 'stopped', cpu: 96, memory: 384, storage: 1500, type: 'ESXi' },
  { id: '3', name: 'HV-Example-3', status: 'running', cpu: 64, memory: 256, storage: 1000, type: 'KVM' },
]

const mockVMs: VM[] = [
  { id: 'v1', name: 'VM1', status: 'running', cpu: 4, memory: 8, storage: 100, type: 'Linux', hostHV: 'HV-Example-1', owner: 'John Doe', os: 'Ubuntu 22.04', allocatedCpu: 4, allocatedMemory: 8, allocatedStorage: 100 },
  { id: 'v2', name: 'VM2', status: 'stopped', cpu: 8, memory: 32, storage: 500, type: 'Linux', hostHV: 'HV-Example-1', owner: 'Jane Smith', os: 'CentOS 8', allocatedCpu: 8, allocatedMemory: 32, allocatedStorage: 500 },
  { id: 'v3', name: 'VM3', status: 'running', cpu: 2, memory: 4, storage: 50, type: 'Windows', hostHV: 'HV-Example-1', owner: 'Bob Wilson', os: 'Windows Server 2022', allocatedCpu: 2, allocatedMemory: 4, allocatedStorage: 50 },
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

export default function HVDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hvId = params.id as string
  const hv = mockHVs.find(h => h.id === hvId)
  const hostedVMs = mockVMs.filter(vm => vm.hostHV === hv?.name)

  const [hvStatus, setHvStatus] = useState<'running' | 'stopped' | 'paused'>(hv?.status || 'stopped')
  const [expandedVmId, setExpandedVmId] = useState<string | null>(null)
  const [viewModes, setViewModes] = useState<{ [key: string]: 'numbers' | 'graph' }>(() => {
    const initialModes: { [key: string]: 'numbers' | 'graph' } = {}
    if (hv) {
      initialModes[`${hv.id}-cpu`] = 'graph'
      initialModes[`${hv.id}-memory`] = 'graph'
      initialModes[`${hv.id}-storage`] = 'graph'
      hostedVMs.forEach(vm => {
        initialModes[`${vm.id}-cpu`] = 'graph'
        initialModes[`${vm.id}-memory`] = 'graph'
        initialModes[`${vm.id}-storage`] = 'graph'
      })
    }
    return initialModes
  })
  const [graphData, setGraphData] = useState<{ [key: string]: any[] }>({})
  const [searchQuery, setSearchQuery] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current && hv) {
      initializedRef.current = true
      const initialData: { [key: string]: any[] } = {}
      initialData[`${hv.id}-cpu`] = generateInitialGraphData(hv.cpu)
      initialData[`${hv.id}-memory`] = generateInitialGraphData(hv.memory)
      initialData[`${hv.id}-storage`] = generateInitialGraphData(hv.storage)
      hostedVMs.forEach(vm => {
        initialData[`${vm.id}-cpu`] = generateInitialGraphData(vm.allocatedCpu)
        initialData[`${vm.id}-memory`] = generateInitialGraphData(vm.allocatedMemory)
        initialData[`${vm.id}-storage`] = generateInitialGraphData(vm.allocatedStorage)
      })
      setGraphData(initialData)
    }
  }, [hv?.id])

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

  const handleLogout = () => {
    // TODO: Implement logout
  }

  const handlePowerToggle = () => {
    setHvStatus(prev => prev === 'running' ? 'stopped' : 'running')
  }

  if (!hv) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
        <DashboardHeader isAdmin={true} />
        <main className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Hypervisor not found</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
      <DashboardHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout} 
        isAdmin={true} 
      />
      
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
            <h1 className="text-4xl font-bold text-foreground">{hv.name}</h1>
            {getStatusIcon(hvStatus)}
          </div>
          <p className="text-muted-foreground text-sm mb-4">{hv.type}</p>
          
          <button
            onClick={handlePowerToggle}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              hvStatus === 'running'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Power size={18} />
            {hvStatus === 'running' ? 'Power Off' : 'Power On'}
          </button>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Hypervisor Resources</h2>
          
          <div className="mb-8 grid grid-cols-3 gap-6">
            <div className="rounded-xl p-6 bg-secondary border border-border">
              <p className="text-muted-foreground text-sm font-semibold mb-2">Total CPU Cores</p>
              <p className="text-foreground text-3xl font-bold">{hv.cpu}</p>
            </div>
            <div className="rounded-xl p-6 bg-secondary border border-border">
              <p className="text-muted-foreground text-sm font-semibold mb-2">Total Memory</p>
              <p className="text-foreground text-3xl font-bold">{hv.memory}GB</p>
            </div>
            <div className="rounded-xl p-6 bg-secondary border border-border">
              <p className="text-muted-foreground text-sm font-semibold mb-2">Total Disk Space</p>
              <p className="text-foreground text-3xl font-bold">{hv.storage}GB</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-4">Current Usage</h3>
          <div className="grid grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-bold">CPU USAGE</p>
                <ViewModeToggle
                  mode={viewModes[`${hv.id}-cpu`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.id}-cpu`]: prev[`${hv.id}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.id}-cpu`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{hv.cpu}</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.id}-cpu`] || []}>
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
                  mode={viewModes[`${hv.id}-memory`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.id}-memory`]: prev[`${hv.id}-memory`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.id}-memory`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{hv.memory}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.id}-memory`] || []}>
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
                  mode={viewModes[`${hv.id}-storage`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.id}-storage`]: prev[`${hv.id}-storage`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.id}-storage`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{hv.storage}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.id}-storage`] || []}>
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

        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Hosted Virtual Machines ({hostedVMs.length})</h2>
          <div className="space-y-4">
            {hostedVMs.map((vm) => (
              <div
                key={vm.id}
                className="rounded-xl p-6 border border-border bg-secondary"
              >
                <button
                  onClick={() => setExpandedVmId(prev => prev === vm.id ? null : vm.id)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {expandedVmId === vm.id ? (
                      <ChevronDown size={20} className="text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight size={20} className="text-primary flex-shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-foreground font-semibold text-lg">{vm.name}</p>
                      <p className="text-muted-foreground text-sm">{vm.owner}</p>
                    </div>
                  </div>
                  {getStatusIcon(vm.status)}
                </button>

                {expandedVmId === vm.id && (
                  <div className="mt-6 pt-6 border-t border-border space-y-6">
                    <button
                      onClick={() => router.push(`/vm/${vm.id}`)}
                      className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                      More Details
                    </button>

                    {/* Resource Allocation */}
                    <div className="rounded-xl p-6 bg-secondary border border-border">
                      <h3 className="text-sm font-bold text-foreground mb-4">Resource Allocation</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CPU Cores:</span>
                          <span className="text-foreground font-semibold">{vm.allocatedCpu} / {hv.cpu}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Memory:</span>
                          <span className="text-foreground font-semibold">{vm.allocatedMemory}GB / {hv.memory}GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Storage:</span>
                          <span className="text-foreground font-semibold">{vm.allocatedStorage}GB / {hv.storage}GB</span>
                        </div>
                      </div>
                    </div>

                    {/* VM Metrics */}
                    <div className="grid grid-cols-3 gap-6">
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
                          <p className="text-foreground text-3xl font-bold">{vm.allocatedCpu}</p>
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
                          <p className="text-foreground text-3xl font-bold">{vm.allocatedMemory}GB</p>
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
                          <p className="text-foreground text-3xl font-bold">{vm.allocatedStorage}GB</p>
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
                )}
              </div>
            ))}
            {hostedVMs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground rounded-xl border border-border bg-secondary">
                No virtual machines hosted on this hypervisor
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
