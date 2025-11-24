'use client'

interface ViewModeToggleProps {
  mode: 'numbers' | 'graph'
  onToggle: () => void
}

export function ViewModeToggle({ mode, onToggle }: ViewModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full transition-colors ${
        mode === 'graph' ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-foreground rounded-full transition-transform ${
          mode === 'graph' ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
