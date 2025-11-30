import { ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

interface CollapsibleSectionProps {
  icon: LucideIcon
  title: string
  isExpanded: boolean
  onToggle: () => void
  iconColor?: string
  children: ReactNode
}

export function CollapsibleSection({
  icon: Icon,
  title,
  isExpanded,
  onToggle,
  iconColor = 'text-primary',
  children
}: CollapsibleSectionProps) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full mb-6 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <Icon size={24} className={iconColor} />
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        </div>
        <ChevronDown
          size={28}
          className="text-foreground transition-transform"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
      </button>
      {isExpanded && (
        <div className="rounded-xl border border-border bg-secondary overflow-hidden">
          <div className="divide-y divide-border">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
