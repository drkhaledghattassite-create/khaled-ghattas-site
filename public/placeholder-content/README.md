# /public/placeholder-content/

Working directory for the **mock storage adapter**
(`lib/storage/mock-adapter.ts`).

In dev, when no real storage provider is wired up, signed URLs returned by
the storage layer point at `/placeholder-content/<storageKey>`. Files in
this directory are **never committed** (see `.gitignore`) — only this
README is tracked so the directory exists.

You can drop sample PDFs / videos / audio here matching the `storageKey`
values seeded into the `books.digitalFile` and `session_items.storageKey`
columns to manually test the download / streaming flows before the real
storage adapter is wired up. Anything you put here is also served as a
static asset by Next.js, which is fine for a dev sandbox but **not** how
production delivery will work.

When the real adapter (Vercel Blob, R2, Cloudflare Stream, Bunny.net,
TBD) is chosen, swap `lib/storage/index.ts` to point at it. Nothing else
in the codebase needs to change.

## Why isn't this in `lib/`?

`public/` is the only directory Next.js serves as static assets without
extra routing. Putting placeholder files here lets `<a href={url} download>`
in the library card work end-to-end against the mock URL during development.
