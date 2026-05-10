# Architecture deep-dives

Per-surface architecture notes — read the relevant one before working in
that surface. CLAUDE.md is the project conventions index; these are the
"how it actually works" companions.

| Doc | Read before touching |
|---|---|
| [pdf-reader.md](./pdf-reader.md) | `/dashboard/library/read/[bookId]`, react-pdf, the `--reader-*` CSS tokens |
| [session-viewer.md](./session-viewer.md) | `/dashboard/library/session/[sessionId]`, the video adapter, session-content admin |
| [booking-domain.md](./booking-domain.md) | `/booking`, `/dashboard/bookings`, `/admin/booking/*`, the Stripe webhook booking branches |
| [ask-dr-khaled.md](./ask-dr-khaled.md) | `/dashboard/ask`, `/admin/questions`, the answered-notification email |

If you add a new architectural surface (a phase, a domain), add a doc
here and link it from CLAUDE.md.
