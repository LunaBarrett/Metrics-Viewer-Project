'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Power, ArrowLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardHeader from '@/components/dashboard-header'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { InfoCard } from '@/components/info-card'
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

export default function VMDetailPage() {
  const params = useParams()
  const router = useRouter()
  const hostname = params.id as string // Treating id param as hostname
  const [vm, setVm] = useState<MachineDetail | null>(null)
  const [hostHV, setHostHV] = useState<MachineDetail | null>(null)
  const [metrics, setMetrics] = useState<MachineMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewModes, setViewModes] = useState<{ [key: string]: 'numbers' | 'graph' }>({})
  const [graphData, setGraphData] = useState<{ [key: string]: ChartPoint[] }>({})

  useEffect(() => {
    loadVMData()
  }, [hostname])

  const loadVMData = async () => {
    try {
      const vmData = await machineApi.getMachineInfo(hostname)
      if (vmData.Is_Hypervisor) {
        router.push('/vms')
        return
      }
      setVm(vmData)
      
      // Load host HV if Hosted_On_ID is set
      if (vmData.Hosted_On_ID) {
        try {
          const allMachines = await machineApi.listMachines()
          const hv = allMachines.find(m => m.Machine_ID === vmData.Hosted_On_ID && m.Is_Hypervisor)
          if (hv) {
            setHostHV(hv)
          }
        } catch (err) {
          console.error('Failed to load host HV:', err)
        }
      }
      
      // Load metrics
      try {
        const metricsData = await machineApi.getMachineMetrics(hostname)
        setMetrics(metricsData)
      } catch (err) {
        console.error('Failed to load metrics:', err)
      }

      // Load metrics history for real charts (latest N points)
      try {
        const history = await machineApi.getMachineMetricsHistory(hostname, { limit: 60, order: 'desc' })
        const chronological = history.metrics.slice().reverse()
        setGraphData({
          [`${vmData.Hostname}-cpu`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: Number(m.Current_CPU_Usage ?? 0),
          })),
          [`${vmData.Hostname}-memory`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Memory_Usage?.used ?? 0) || 0),
          })),
          [`${vmData.Hostname}-storage`]: chronological.map((m) => ({
            time: formatTime(m.Timestamp),
            value: bytesToGB(Number(m.Current_Disk_Usage?.[0]?.used ?? 0) || 0),
          })),
        })
      } catch (err) {
        console.error('Failed to load metrics history:', err)
        setGraphData({
          [`${vmData.Hostname}-cpu`]: [],
          [`${vmData.Hostname}-memory`]: [],
          [`${vmData.Hostname}-storage`]: [],
        })
      }
      
      // Initialize view modes
      const initialModes: { [key: string]: 'numbers' | 'graph' } = {}
      initialModes[`${vmData.Hostname}-cpu`] = 'graph'
      initialModes[`${vmData.Hostname}-memory`] = 'graph'
      initialModes[`${vmData.Hostname}-storage`] = 'graph'
      setViewModes(initialModes)
    } catch (err) {
      console.error('Failed to load VM data:', err)
      router.push('/vms')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
        <DashboardHeader isAdmin={false} />
        <main className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Loading virtual machine...</p>
        </main>
      </div>
    )
  }

  if (!vm) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
        <DashboardHeader isAdmin={false} />
        <main className="px-6 py-8 text-center">
          <p className="text-muted-foreground">Virtual machine not found</p>
        </main>
      </div>
    )
  }

  const handleLogout = () => {
    removeToken()
    router.push('/login')
  }
  
  const vmStatus = metrics?.Timestamp ? 
    (new Date().getTime() - new Date(metrics.Timestamp).getTime() < 5 * 60 * 1000 ? 'running' : 'stopped') 
    : 'stopped'

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
            <h1 className="text-4xl font-bold text-foreground">{vm.Hostname}</h1>
            {getStatusIcon(vmStatus)}
          </div>
          <p className="text-muted-foreground text-sm">{vm.Platform || 'Unknown'}</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <InfoCard
            label="Hosted On"
            value={hostHV?.Hostname || 'Unknown'}
            onClick={hostHV ? () => router.push(`/hv/${hostHV.Hostname}`) : undefined}
          />
          <InfoCard label="Platform" value={vm.Platform || 'Unknown'} />
          <InfoCard label="Status" value={vmStatus} />
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Resource Allocation</h2>
          <div className="grid grid-cols-3 gap-6">
            <InfoCard label="CPU Cores" value={`${vm.Max_Cores || 0} / ${hostHV?.Max_Cores || 0}`} />
            <InfoCard label="Memory" value={`${bytesToGB(vm.Max_Memory || 0)} / ${bytesToGB(hostHV?.Max_Memory || 0)}GB`} />
            <InfoCard label="Disk Space" value={`${bytesToGB(vm.Max_Disk || 0)} / ${bytesToGB(hostHV?.Max_Disk || 0)}GB`} />
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
                  mode={viewModes[`${vm.Hostname}-cpu`] || 'graph'}
                  onToggle={() => setViewModes(prev => ({
                    ...prev,
                    [`${vm.Hostname}-cpu`]: prev[`${vm.Hostname}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                  }))}
                />
              </div>
              {viewModes[`${vm.Hostname}-cpu`] === 'numbers' ? (
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_CPU_Usage?.toFixed(1) || vm.Max_Cores || 0}%</p>
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

            {/* Memory Usage */}
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
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_Memory_Usage?.used ? bytesToGB(metrics.Current_Memory_Usage.used) : bytesToGB(vm.Max_Memory || 0)}GB</p>
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

            {/* Disk Usage */}
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
                <p className="text-foreground text-3xl font-bold">{metrics?.Current_Disk_Usage?.[0]?.used ? bytesToGB(metrics.Current_Disk_Usage[0].used) : bytesToGB(vm.Max_Disk || 0)}GB</p>
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
      </main>
    </div>
  )
}
