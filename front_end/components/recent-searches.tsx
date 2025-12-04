'use client'

import { useRouter } from 'next/navigation'

export default function RecentSearches() {
  const router = useRouter()
  const searches = ['Ubuntu-22.04', 'Database-Cluster', 'Web-Server', 'Backup-Job']

  const handleSearchClick = (search: string) => {
    router.push(`/search?q=${encodeURIComponent(search)}`)
  }

  return (
    <div className="rounded-xl p-8 bg-secondary border border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6">Recent Searches</h2>
      <div className="flex flex-col gap-2">
        {searches.map((search, idx) => (
          <button
            key={idx}
            onClick={() => handleSearchClick(search)}
            className="px-4 py-3 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors text-left font-medium"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  )
}
