'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronDown, ChevronRight, Power, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useRouter } from 'next/navigation'
import { ViewModeToggle } from '@/components/view-mode-toggle'

interface Resource {
  id: string
  name: string
  status: 'running' | 'stopped' | 'paused'
  cpu: number
  memory: number
  storage: number
  type: string
  hostHV?: string
}

interface ResourceCardListProps {
  resourceType: 'hvs' | 'vms'
  searchQuery: string
}

// Mock data
const mockHVs: Resource[] = [
  { id: '1', name: 'HV-Example-1', status: 'running', cpu: 128, memory: 512, storage: 2000, type: 'Proxmox' },
  { id: '2', name: 'HV-Example-2', status: 'stopped', cpu: 96, memory: 384, storage: 1500, type: 'ESXi' },
  { id: '3', name: 'HV-Example-3', status: 'running', cpu: 64, memory: 256, storage: 1000, type: 'KVM' },
]

const mockVMs: Resource[] = [
  { id: 'v1', name: 'VM1', status: 'running', cpu: 4, memory: 8, storage: 100, type: 'Linux', hostHV: 'HV: example1' },
  { id: 'v2', name: 'VM2', status: 'stopped', cpu: 8, memory: 32, storage: 500, type: 'Linux', hostHV: 'HV: example1' },
  { id: 'v3', name: 'VM3', status: 'running', cpu: 2, memory: 4, storage: 50, type: 'Windows', hostHV: 'HV: example1' },
]

const generateInitialGraphData = (baseValue: number) => {
  return Array.from({ length: 12 }, (_, i) => ({
    time: i,
    value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3),
  }))
}

export default function ResourceCardList({ resourceType, searchQuery }: ResourceCardListProps) {
  const router = useRouter()
  const resources = resourceType === 'hvs' ? mockHVs : mockVMs
  
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
  
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!initializedRef.current && filtered.length > 0) {
      initializedRef.current = true
      const initialData: { [key: string]: any[] } = {}
      filtered.forEach(resource => {
        initialData[`${resource.id}-cpu`] = generateInitialGraphData(resource.cpu)
        initialData[`${resource.id}-memory`] = generateInitialGraphData(resource.memory)
        initialData[`${resource.id}-storage`] = generateInitialGraphData(resource.storage)
      })
      setGraphData(initialData)
    }
  }, [filtered.map(r => r.id).join(',')])

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

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100)
  }

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
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={graphData[`${resource.id}-cpu`] || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                        <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={graphData[`${resource.id}-memory`] || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                        <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height={100}>
                      <LineChart data={graphData[`${resource.id}-storage`] || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,256,0.1)" />
                        <XAxis dataKey="time" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1a1628', border: '1px solid #3b82f6' }} />
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
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
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-primary border border-primary hover:bg-primary/10 transition-colors font-medium">
                  <Power size={16} />
                  <span className="text-sm">Power</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-destructive border border-destructive hover:bg-destructive/10 transition-colors font-medium">
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
