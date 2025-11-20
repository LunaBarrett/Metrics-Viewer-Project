import { Power } from 'lucide-react'

interface ResourceListItemProps {
  name: string
  status: 'on' | 'off'
  onClick: () => void
}

export function ResourceListItem({ name, status, onClick }: ResourceListItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between px-6 py-4 hover:bg-background/30 transition-colors cursor-pointer"
    >
      <span className="text-foreground font-medium">{name}</span>
      <Power
        size={20}
        className={status === 'on' ? 'text-green-500' : 'text-red-500'}
      />
    </div>
  )
}
