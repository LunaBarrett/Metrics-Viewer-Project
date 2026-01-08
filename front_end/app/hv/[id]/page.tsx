'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Power, Trash2, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardHeader from '@/components/dashboard-header'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { machineApi, removeToken, type MachineDetail, type MachineMetrics } from '@/lib/api'

// Convert bytes to GB
const bytesToGB = (bytes: number) => Math.round(bytes / (1024 ** 3))

type ChartPoint = { time: string; value: number }

const formatTime = (isoTs: string) => {
  const d = new Date(isoTs)
  if (Number.isNaN(d.getTime())) return isoTs
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  const hostname = params.id as string // Treating id param as hostname
  const [hv, setHv] = useState<MachineDetail | null>(null)
  const [hostedVMs, setHostedVMs] = useState<MachineDetail[]>([])
  const [metrics, setMetrics] = useState<MachineMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [hvStatus, setHvStatus] = useState<'running' | 'stopped' | 'paused'>('stopped')
  const [expandedVmId, setExpandedVmId] = useState<string | null>(null)
  const [viewModes, setViewModes] = useState<{ [key: string]: 'numbers' | 'graph' }>({})
  const [graphData, setGraphData] = useState<{ [key: string]: ChartPoint[] }>({})
  const [vmStatusByHostname, setVmStatusByHostname] = useState<Record<string, 'running' | 'stopped' | 'paused'>>({})
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadHVData()
  }, [hostname])

  const loadHVData = async () => {
    try {
      const hvData = await machineApi.getMachineInfo(hostname)
      if (!hvData.Is_Hypervisor) {
        router.push('/hvs')
        return
      }
      setHv(hvData)
      
      // Load hosted VMs (VMs where Hosted_On_ID matches this HV's Machine_ID)
      const allMachines = await machineApi.listMachines()
      const vms = allMachines.filter(m => m.Hosted_On_ID === hvData.Machine_ID)
      setHostedVMs(vms)
      
      // Load metrics
      try {
        const metricsData = await machineApi.getMachineMetrics(hostname)
        setMetrics(metricsData)
        // Derive status from metrics timestamp
        if (metricsData.Timestamp) {
          const timestamp = new Date(metricsData.Timestamp)
          const now = new Date()
          const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60)
          setHvStatus(diffMinutes < 5 ? 'running' : 'stopped')
        }
      } catch (err) {
        console.error('Failed to load metrics:', err)
      }

      // Load metrics history for HV charts (latest N points)
      try {
        const history = await machineApi.getMachineMetricsHistory(hostname, { limit: 60, order: 'desc' })
        const chronological = history.metrics.slice().reverse()
        setGraphData((prev) => ({
          ...prev,
          [`${hvData.Hostname}-cpu`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: Number(m.Current_CPU_Usage ?? 0),
          })),
          [`${hvData.Hostname}-memory`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Memory_Usage?.used ?? 0) || 0),
          })),
          [`${hvData.Hostname}-storage`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Disk_Usage?.[0]?.used ?? 0) || 0),
          })),
        }))
      } catch (err) {
        console.error('Failed to load metrics history:', err)
        setGraphData((prev) => ({
          ...prev,
          [`${hvData.Hostname}-cpu`]: [],
          [`${hvData.Hostname}-memory`]: [],
          [`${hvData.Hostname}-storage`]: [],
        }))
      }
      
      // Initialize view modes
      const initialModes: { [key: string]: 'numbers' | 'graph' } = {}
      initialModes[`${hvData.Hostname}-cpu`] = 'graph'
      initialModes[`${hvData.Hostname}-memory`] = 'graph'
      initialModes[`${hvData.Hostname}-storage`] = 'graph'
      vms.forEach(vm => {
        initialModes[`${vm.Hostname}-cpu`] = 'graph'
        initialModes[`${vm.Hostname}-memory`] = 'graph'
        initialModes[`${vm.Hostname}-storage`] = 'graph'
      })
      setViewModes(initialModes)
    } catch (err) {
      console.error('Failed to load HV data:', err)
      router.push('/hvs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadVmHistoryIfNeeded = async (vmHostname: string) => {
      const cpuKey = `${vmHostname}-cpu`
      if (graphData[cpuKey]) return

      try {
        const history = await machineApi.getMachineMetricsHistory(vmHostname, { limit: 60, order: 'desc' })
        const chronological = history.metrics.slice().reverse()
        setGraphData((prev) => ({
          ...prev,
          [cpuKey]: chronological.map((m) => ({ time: formatTime(m.Timestamp), value: Number(m.Current_CPU_Usage ?? 0) })),
          [`${vmHostname}-memory`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Memory_Usage?.used ?? 0) || 0),
          })),
          [`${vmHostname}-storage`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Disk_Usage?.[0]?.used ?? 0) || 0),
          })),
        }))

        const latestTs = chronological.length ? new Date(chronological[chronological.length - 1].Timestamp) : null
        if (latestTs && !Number.isNaN(latestTs.getTime())) {
          const diffMinutes = (Date.now() - latestTs.getTime()) / (1000 * 60)
          setVmStatusByHostname((prev) => ({ ...prev, [vmHostname]: diffMinutes < 5 ? 'running' : 'stopped' }))
        }
      } catch (err) {
        console.error('Failed to load VM metrics history:', err)
        setGraphData((prev) => ({
          ...prev,
          [cpuKey]: [],
          [`${vmHostname}-memory`]: [],
          [`${vmHostname}-storage`]: [],
        }))
      }
    }

    if (expandedVmId) {
      void loadVmHistoryIfNeeded(expandedVmId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedVmId])

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }

  const handlePowerToggle = () => {
    // TODO: Implement power toggle API call
    setHvStatus(prev => prev === 'running' ? 'stopped' : 'running')
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
        <DashboardHeader isAdmin={false} />
        <main className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Loading hypervisor...</p>
        </main>
      </div>
    )
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
            <h1 className="text-4xl font-bold text-foreground">{hv.Hostname}</h1>
            {getStatusIcon(hvStatus)}
          </div>
          <p className="text-muted-foreground text-sm mb-4">{hv.Platform || 'Unknown'}</p>
          
          <button
            onClick={handlePowerToggle}
            disabled
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors opacity-50 cursor-not-allowed bg-gray-500 text-white"
            title="Power control not yet implemented"
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
              <p className="text-foreground text-3xl font-bold">{hv.Max_Cores || 0}</p>
            </div>
            <div className="rounded-xl p-6 bg-secondary border border-border">
              <p className="text-muted-foreground text-sm font-semibold mb-2">Total Memory</p>
              <p className="text-foreground text-3xl font-bold">{bytesToGB(hv.Max_Memory || 0)}GB</p>
            </div>
            <div className="rounded-xl p-6 bg-secondary border border-border">
              <p className="text-muted-foreground text-sm font-semibold mb-2">Total Disk Space</p>
              <p className="text-foreground text-3xl font-bold">{bytesToGB(hv.Max_Disk || 0)}GB</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-foreground mb-4">Current Usage</h3>
          <div className="grid grid-cols-3 gap-6">
            {/* CPU Usage */}
            <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <p className="text-foreground text-sm font-bold">CPU USAGE</p>
                <ViewModeToggle
                  mode={viewModes[`${hv.Hostname}-cpu`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.Hostname}-cpu`]: prev[`${hv.Hostname}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.Hostname}-cpu`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_CPU_Usage?.toFixed(1) || hv.Max_Cores || 0}%</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.Hostname}-cpu`] || []}>
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
                  mode={viewModes[`${hv.Hostname}-memory`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.Hostname}-memory`]: prev[`${hv.Hostname}-memory`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.Hostname}-memory`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_Memory_Usage?.used ? bytesToGB(metrics.Current_Memory_Usage.used) : bytesToGB(hv.Max_Memory || 0)}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.Hostname}-memory`] || []}>
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
                  mode={viewModes[`${hv.Hostname}-storage`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${hv.Hostname}-storage`]: prev[`${hv.Hostname}-storage`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${hv.Hostname}-storage`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_Disk_Usage?.[0]?.used ? bytesToGB(metrics.Current_Disk_Usage[0].used) : bytesToGB(hv.Max_Disk || 0)}GB</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={graphData[`${hv.Hostname}-storage`] || []}>
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
                key={vm.Hostname}
                className="rounded-xl p-6 border border-border bg-secondary"
              >
                <button
                  onClick={() => setExpandedVmId(prev => prev === vm.Hostname ? null : vm.Hostname)}
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity text-left"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {expandedVmId === vm.Hostname ? (
                      <ChevronDown size={20} className="text-primary flex-shrink-0" />
                    ) : (
                      <ChevronRight size={20} className="text-primary flex-shrink-0" />
                    )}
                    <div className="text-left">
                      <p className="text-foreground font-semibold text-lg">{vm.Hostname}</p>
                      <p className="text-muted-foreground text-sm">{vm.Platform || 'Unknown'}</p>
                    </div>
                  </div>
                  {getStatusIcon(vmStatusByHostname[vm.Hostname] || 'stopped')}
                </button>

                {expandedVmId === vm.Hostname && (
                  <div className="mt-6 pt-6 border-t border-border space-y-6">
                    <button
                      onClick={() => router.push(`/vm/${vm.Hostname}`)}
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
                          <span className="text-foreground font-semibold">{vm.Max_Cores || 0} / {hv.Max_Cores || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Memory:</span>
                          <span className="text-foreground font-semibold">{bytesToGB(vm.Max_Memory || 0)}GB / {bytesToGB(hv.Max_Memory || 0)}GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Storage:</span>
                          <span className="text-foreground font-semibold">{bytesToGB(vm.Max_Disk || 0)}GB / {bytesToGB(hv.Max_Disk || 0)}GB</span>
                        </div>
                      </div>
                    </div>

                    {/* VM Metrics */}
                    <div className="grid grid-cols-3 gap-6">
                      <div className="rounded-xl p-6 bg-primary/10 border border-primary/20">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-foreground text-sm font-bold">CPU USAGE</p>
                          <ViewModeToggle
                            mode={viewModes[`${vm.Hostname}-cpu`] || 'graph'}
                            onToggle={() => setViewModes(prev => ({
                              ...prev,
                              [`${vm.Hostname}-cpu`]: prev[`${vm.Hostname}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                            }))}
                          />
                        </div>
                        {viewModes[`${vm.Hostname}-cpu`] === 'numbers' ? (
                          <p className="text-foreground text-3xl font-bold">{vm.Max_Cores || 0}</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={graphData[`${vm.Hostname}-cpu`] || []}>
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
                            mode={viewModes[`${vm.Hostname}-memory`] || 'graph'}
                            onToggle={() => setViewModes(prev => ({
                              ...prev,
                              [`${vm.Hostname}-memory`]: prev[`${vm.Hostname}-memory`] === 'numbers' ? 'graph' : 'numbers'
                            }))}
                          />
                        </div>
                        {viewModes[`${vm.Hostname}-memory`] === 'numbers' ? (
                          <p className="text-foreground text-3xl font-bold">{bytesToGB(vm.Max_Memory || 0)}GB</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={graphData[`${vm.Hostname}-memory`] || []}>
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
                            mode={viewModes[`${vm.Hostname}-storage`] || 'graph'}
                            onToggle={() => setViewModes(prev => ({
                              ...prev,
                              [`${vm.Hostname}-storage`]: prev[`${vm.Hostname}-storage`] === 'numbers' ? 'graph' : 'numbers'
                            }))}
                          />
                        </div>
                        {viewModes[`${vm.Hostname}-storage`] === 'numbers' ? (
                          <p className="text-foreground text-3xl font-bold">{bytesToGB(vm.Max_Disk || 0)}GB</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={graphData[`${vm.Hostname}-storage`] || []}>
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
