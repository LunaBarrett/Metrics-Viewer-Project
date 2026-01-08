import { Suspense } from 'react'
import SearchClient from './search-client'

// Search depends on URL query params; force dynamic rendering so Next does not try to prerender it at build time.
export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ backgroundColor: '#1a1625' }}>
          <main className="px-6 py-8">
            <p className="text-muted-foreground">Loading search…</p>
          </main>
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  )
}
