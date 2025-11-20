import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  iconColor?: string
}

export function PageHeader({ icon: Icon, title, description, iconColor = 'text-primary' }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <Icon size={32} className={iconColor} />
      <div>
        <h1 className="text-4xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  )
}
