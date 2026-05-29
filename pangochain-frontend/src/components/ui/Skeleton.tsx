/**
 * Skeleton loaders. Prefer these over spinners on data-dense pages — they
 * communicate the shape of the content that is about to arrive, which reads as
 * faster and less "broken" than a spinning circle.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} aria-hidden="true" />
}

/** Matches the dashboard StatCard footprint. */
export function StatCardSkeleton() {
  return <Skeleton className="h-24 w-full rounded-xl" />
}

/** A single table row placeholder. */
export function TableRowSkeleton() {
  return <Skeleton className="h-10 w-full" />
}

/** Matches a case/list card footprint. */
export function CaseCardSkeleton() {
  return <Skeleton className="h-20 w-full rounded-lg" />
}

/**
 * Generic page skeleton: a header line plus a grid of card placeholders.
 * Drop into `if (isLoading) return <PageSkeleton />` on list pages.
 */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: cards }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
