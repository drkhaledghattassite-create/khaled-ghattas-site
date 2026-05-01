import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason) => {
      const r = reason as { message?: string; stack?: string; name?: string }
      console.error('[unhandledRejection]', {
        name: r?.name,
        message: r?.message,
        stack: r?.stack,
        raw: reason,
      })
    })
    process.on('uncaughtException', (err) => {
      console.error('[uncaughtException]', {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      })
    })
  }
}

// Captures the full error + stack before Next.js redacts it in production
// builds. Without this, the only thing that surfaces in Netlify function
// logs is "An error occurred in the Server Components render" with a digest.
// Once the deploy goes green, remove this if you want — but it costs nothing.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const e = err as { message?: string; stack?: string; digest?: string }
  console.error('[onRequestError]', {
    digest: e.digest,
    message: e.message,
    stack: e.stack,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  })
}
