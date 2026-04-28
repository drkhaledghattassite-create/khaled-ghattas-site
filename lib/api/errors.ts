import { NextResponse } from 'next/server'
import { z } from 'zod'

export type ApiErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL'

type ErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string[] | undefined>
  }
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  INVALID_JSON: 400,
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  extras?: { fieldErrors?: Record<string, string[] | undefined>; status?: number },
): NextResponse<ErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(extras?.fieldErrors ? { fieldErrors: extras.fieldErrors } : {}),
      },
    },
    { status: extras?.status ?? STATUS_BY_CODE[code] },
  )
}

export const errInvalidJson = (message = 'Invalid JSON body.') =>
  apiError('INVALID_JSON', message)

export const errValidation = (
  fieldErrors: Record<string, string[] | undefined>,
  message = 'Validation failed.',
) => apiError('VALIDATION', message, { fieldErrors })

export const errUnauthorized = (message = 'Sign-in required.') =>
  apiError('UNAUTHORIZED', message)

export const errForbidden = (message = 'Forbidden.') =>
  apiError('FORBIDDEN', message)

export const errNotFound = (message = 'Not found.') =>
  apiError('NOT_FOUND', message)

export const errConflict = (message = 'Conflict.') =>
  apiError('CONFLICT', message)

export const errRateLimited = (message = 'Too many requests.') =>
  apiError('RATE_LIMITED', message)

export const errInternal = (message = 'Something went wrong.') =>
  apiError('INTERNAL', message)

/**
 * Parse a JSON body and validate it against a Zod schema. Returns either
 * { ok: true, data } or { ok: false, response } so callers can early-return.
 */
export async function parseJsonBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<
  | { ok: true; data: z.infer<T> }
  | { ok: false; response: NextResponse<ErrorBody> }
> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return { ok: false, response: errInvalidJson() }
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      response: errValidation(z.flattenError(parsed.error).fieldErrors),
    }
  }
  return { ok: true, data: parsed.data }
}
