import { ReactNode } from 'react'
import { ViewModeToggle } from './view-mode-toggle'

interface StatsOverviewProps {
  title: string
  viewMode: 'numbers' | 'graph'
  onToggle: () => void
  children: ReactNode
}

export function StatsOverview({ title, viewMode, onToggle, children }: StatsOverviewProps) {
  return (
    <div className="rounded-xl p-6 bg-secondary border border-border mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <ViewModeToggle mode={viewMode} onToggle={onToggle} />
      </div>
      {children}
    </div>
  )
}
