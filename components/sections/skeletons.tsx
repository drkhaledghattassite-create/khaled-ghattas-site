import { Skeleton } from '@/components/ui/skeleton'

export function StoreShowcaseSkeleton() {
  return (
    <section
      className="relative z-[2] bg-paper-soft px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-5 w-80" />
        </div>
        <div className="grid grid-cols-12 gap-4 md:gap-5">
          {(['md:col-span-4', 'md:col-span-4', 'md:col-span-4', 'md:col-span-3', 'md:col-span-3', 'md:col-span-6', 'md:col-span-4', 'md:col-span-8'] as const).map((span, i) => (
            <div key={i} className={`col-span-12 ${span}`}>
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-2 h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ArticlesListSkeleton() {
  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-48" />
        </div>
        <ul className="space-y-1">
          <li className="py-10">
            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <Skeleton className="h-[200px] w-full" />
            </div>
          </li>
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_72px] items-center gap-5 py-6">
              <Skeleton className="h-4 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-7 w-3/4" />
              </div>
              <Skeleton className="h-16 w-16" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function InterviewRotatorSkeleton() {
  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-10 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-14 w-56" />
        </div>
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <Skeleton className="aspect-video w-full" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="mt-4 h-10 w-36 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  )
}
