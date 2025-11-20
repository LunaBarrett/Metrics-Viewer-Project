interface StatCardProps {
  label: string
  value: string | number
  valueColor?: string
}

export function StatCard({ label, value, valueColor = 'text-foreground' }: StatCardProps) {
  return (
    <div className="rounded-xl p-6 bg-secondary border border-border">
      <p className="text-muted-foreground text-sm font-semibold mb-2">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}
