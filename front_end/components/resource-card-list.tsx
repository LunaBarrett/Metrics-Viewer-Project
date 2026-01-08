'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronRight, Power, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'
import { ViewModeToggle } from '@/components/view-mode-toggle'
import { machineApi, type MachineDetail } from '@/lib/api'

interface ResourceCardListProps {
  resourceType: 'hvs' | 'vms'
  searchQuery: string
  machines: MachineDetail[]
}

// Convert bytes to GB
const bytesToGB = (bytes: number) => Math.round(bytes / (1024 ** 3))

// Derive status from machine (placeholder - backend doesn't have status yet)
const getStatus = (machine: MachineDetail): 'running' | 'stopped' | 'paused' => {
  // TODO: derive from metrics timestamp recency
  return 'running'
}

type ChartPoint = { time: string; value: number }

const formatTime = (isoTs: string) => {
  const d = new Date(isoTs)
  if (Number.isNaN(d.getTime())) return isoTs
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const historyToSeries = (
  metrics: Array<{ Timestamp: string; Current_CPU_Usage: number; Current_Memory_Usage: any; Current_Disk_Usage: any }>,
  kind: 'cpu' | 'memory' | 'storage',
): ChartPoint[] => {
  // Backend can return asc/desc; we request desc and flip to chronological for charts
  const chronological = metrics.slice().reverse()
  return chronological.map((m) => {
    let value = 0
    if (kind === 'cpu') {
      value = Number(m.Current_CPU_Usage ?? 0)
    } else if (kind === 'memory') {
      const used = m.Current_Memory_Usage?.used ?? 0
      value = bytesToGB(Number(used) || 0)
    } else {
      const used = m.Current_Disk_Usage?.[0]?.used ?? 0
      value = bytesToGB(Number(used) || 0)
    }
    return { time: formatTime(m.Timestamp), value }
  })
}

export default function ResourceCardList({ resourceType, searchQuery, machines }: ResourceCardListProps) {
  const router = useRouter()
  
  // Convert MachineDetail to Resource format for display
  const resources = machines.map(m => ({
    id: m.Hostname,
    name: m.Hostname,
    status: getStatus(m) as 'running' | 'stopped' | 'paused',
    cpu: m.Max_Cores || 0,
    memory: bytesToGB(m.Max_Memory || 0),
    storage: bytesToGB(m.Max_Disk || 0),
    type: m.Platform || 'Unknown',
    hostHV: m.Hosted_On_ID ? undefined : undefined, // TODO: resolve hostname from Hosted_On_ID
  }))
  
  const filtered = useMemo(
    () => resources.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [resourceType, searchQuery]
  )

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewModes, setViewModes] = useState<{ [key: string]: 'numbers' | 'graph' }>(() => {
    const initialModes: { [key: string]: 'numbers' | 'graph' } = {}
    filtered.forEach(resource => {
      initialModes[`${resource.id}-cpu`] = 'graph'
      initialModes[`${resource.id}-memory`] = 'graph'
      initialModes[`${resource.id}-storage`] = 'graph'
    })
    return initialModes
  })
  const [graphData, setGraphData] = useState<{ [key: string]: any[] }>({})
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)

  useEffect(() => {
    const load = async (hostname: string) => {
      const cpuKey = `${hostname}-cpu`
      const memKey = `${hostname}-memory`
      const diskKey = `${hostname}-storage`
      // Already loaded
      if (graphData[cpuKey] || graphData[memKey] || graphData[diskKey]) return

      setHistoryLoadingId(hostname)
      try {
        const res = await machineApi.getMachineMetricsHistory(hostname, { limit: 60, order: 'desc' })
        setGraphData((prev) => ({
          ...prev,
          [cpuKey]: historyToSeries(res.metrics, 'cpu'),
          [memKey]: historyToSeries(res.metrics, 'memory'),
          [diskKey]: historyToSeries(res.metrics, 'storage'),
        }))
      } catch (err) {
        console.error('Failed to load metrics history:', err)
        setGraphData((prev) => ({
          ...prev,
          [cpuKey]: [],
          [memKey]: [],
          [diskKey]: [],
        }))
      } finally {
        setHistoryLoadingId((cur) => (cur === hostname ? null : cur))
      }
    }

    if (expandedId) {
      void load(expandedId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedId])

  return (
    <div className="space-y-4">
      {filtered.map((resource) => (
        <div
          key={resource.id}
          className="rounded-xl p-6 border border-border bg-secondary transition-all hover:border-primary/50"
        >
          {/* Card Header - Always Visible */}
          <button
            onClick={() => setExpandedId(expandedId === resource.id ? null : resource.id)}
            className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-4 flex-1">
              {/* Expand Icon */}
              {expandedId === resource.id ? (
                <ChevronDown size={20} className="text-primary flex-shrink-0" />
              ) : (
                <ChevronRight size={20} className="text-primary flex-shrink-0" />
              )}

              {/* Resource Name and Info */}
              <div className="text-left">
                <p className="text-foreground font-semibold text-lg">{resource.name}</p>
                {resourceType === 'vms' && resource.hostHV && (
                  <p className="text-muted-foreground text-sm">{resource.hostHV}</p>
                )}
              </div>
            </div>

            {/* Status Power Icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(resource.status)}
            </div>
          </button>

          {/* Expanded Content */}
          {expandedId === resource.id && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* CPU Usage */}
                <div className="rounded-lg p-5 bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-foreground text-sm font-bold">CPU USAGE</p>
                    <ViewModeToggle
                      mode={viewModes[`${resource.id}-cpu`] || 'graph'}
                      onToggle={() => setViewModes(prev => ({
                        ...prev,
                        [`${resource.id}-cpu`]: prev[`${resource.id}-cpu`] === 'numbers' ? 'graph' : 'numbers'
                      }))}
                    />
                  </div>
                  {viewModes[`${resource.id}-cpu`] === 'numbers' ? (
                    <p className="text-foreground text-3xl font-bold">{resource.cpu}</p>
                  ) : (
                    historyLoadingId === resource.id ? (
                      <p className="text-muted-foreground text-sm">Loading history…</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={(graphData[`${resource.id}-cpu`] as ChartPoint[] | undefined) || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                          <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  )}
                </div>

                {/* Memory Usage */}
                <div className="rounded-lg p-5 bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-foreground text-sm font-bold">MEMORY USAGE</p>
                    <ViewModeToggle
                      mode={viewModes[`${resource.id}-memory`] || 'graph'}
                      onToggle={() => setViewModes(prev => ({
                        ...prev,
                        [`${resource.id}-memory`]: prev[`${resource.id}-memory`] === 'numbers' ? 'graph' : 'numbers'
                      }))}
                    />
                  </div>
                  {viewModes[`${resource.id}-memory`] === 'numbers' ? (
                    <p className="text-foreground text-3xl font-bold">{resource.memory}GB</p>
                  ) : (
                    historyLoadingId === resource.id ? (
                      <p className="text-muted-foreground text-sm">Loading history…</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={(graphData[`${resource.id}-memory`] as ChartPoint[] | undefined) || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                          <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  )}
                </div>

                {/* Disk Usage */}
                <div className="rounded-lg p-5 bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-foreground text-sm font-bold">DISK USAGE</p>
                    <ViewModeToggle
                      mode={viewModes[`${resource.id}-storage`] || 'graph'}
                      onToggle={() => setViewModes(prev => ({
                        ...prev,
                        [`${resource.id}-storage`]: prev[`${resource.id}-storage`] === 'numbers' ? 'graph' : 'numbers'
                      }))}
                    />
                  </div>
                  {viewModes[`${resource.id}-storage`] === 'numbers' ? (
                    <p className="text-foreground text-3xl font-bold">{resource.storage}GB</p>
                  ) : (
                    historyLoadingId === resource.id ? (
                      <p className="text-muted-foreground text-sm">Loading history…</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={(graphData[`${resource.id}-storage`] as ChartPoint[] | undefined) || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                          <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                          <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                {/* More Details button to navigate to resource detail page */}
                <button
                  onClick={() => router.push(resourceType === 'hvs' ? `/hv/${resource.id}` : `/vm/${resource.id}`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-primary border border-primary hover:bg-primary/10 transition-colors font-medium"
                >
                  <span className="text-sm">More Details</span>
                </button>
                <button 
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground border border-border hover:bg-primary/10 transition-colors font-medium opacity-50 cursor-not-allowed"
                  title="Power control not yet implemented"
                >
                  <Power size={16} />
                  <span className="text-sm">Power</span>
                </button>
                <button 
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground border border-border hover:bg-destructive/10 transition-colors font-medium opacity-50 cursor-not-allowed"
                  title="Delete not yet implemented"
                >
                  <Trash2 size={16} />
                  <span className="text-sm">Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-lg">
          No {resourceType === 'hvs' ? 'hypervisors' : 'virtual machines'} found matching your search.
        </div>
      )}
    </div>
  )
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
