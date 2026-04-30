/**
 * Admin segment loading boundary.
 *
 * Streams a low-key skeleton while a destination admin page resolves its
 * server data (queries, settings, session). The shared admin layout
 * (sidebar + chrome) stays mounted; only the inner content area swaps
 * to this placeholder.
 *
 * The global AppLoader overlay also fires on click, so this skeleton is
 * mostly visible during slow first-compile cycles in dev.
 */
export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="space-y-6 [animation:pulse_1.6s_var(--ease-editorial,ease-in-out)_infinite]"
    >
      {/* Title + subtitle skeleton */}
      <div className="space-y-3">
        <div className="h-7 w-[40%] max-w-[280px] rounded-md bg-bg-deep" />
        <div className="h-4 w-[60%] max-w-[420px] rounded-md bg-bg-deep" />
      </div>

      {/* Stat cards row */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[108px] rounded-md border border-border bg-bg-elevated"
          />
        ))}
      </div>

      {/* Content row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-[280px] rounded-md border border-border bg-bg-elevated" />
        <div className="h-[280px] rounded-md border border-border bg-bg-elevated" />
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
