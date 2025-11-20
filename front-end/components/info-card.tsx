import { ReactNode } from 'react'

interface InfoCardProps {
  label: string
  value: string | number
  onClick?: () => void
  children?: ReactNode
}

export function InfoCard({ label, value, onClick, children }: InfoCardProps) {
  const baseClasses = "rounded-xl p-6 bg-secondary border border-border"
  const clickableClasses = onClick 
    ? "hover:border-primary/50 hover:bg-secondary/80 transition-all cursor-pointer"
    : ""

  return (
    <div
      onClick={onClick}
      className={`${baseClasses} ${clickableClasses} text-left`}
    >
      <p className="text-muted-foreground text-sm font-semibold mb-2">{label}</p>
      <p className="text-foreground font-semibold text-lg">{value}</p>
      {children}
    </div>
  )
}
