import 'server-only'

const MAX_JSON_BYTES = 16_384

export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'RequestValidationError'
  }
}

export function assertSameOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  const fetchSite = request.headers.get('sec-fetch-site')

  if (!origin) {
    if (fetchSite === 'cross-site') {
      throw new RequestValidationError('Cross-site request blocked', 403)
    }
    return
  }

  let requestOrigin: string
  try {
    requestOrigin = new URL(origin).origin
  } catch {
    throw new RequestValidationError('Invalid request origin', 403)
  }

  if (requestOrigin !== new URL(request.url).origin) {
    throw new RequestValidationError('Cross-site request blocked', 403)
  }
}

export async function readSmallJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new RequestValidationError('JSON content type required', 415)
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0')
  if (
    !Number.isFinite(declaredLength)
    || declaredLength < 0
    || declaredLength > MAX_JSON_BYTES
  ) {
    throw new RequestValidationError('Payload too large', 413)
  }

  const body = Buffer.from(await request.arrayBuffer())
  if (body.byteLength > MAX_JSON_BYTES) {
    throw new RequestValidationError('Payload too large', 413)
  }

  try {
    const parsed = JSON.parse(body.toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected a JSON object')
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new RequestValidationError('Invalid JSON body', 400)
  }
}

export function requestValidationResponse(error: unknown): Response | null {
  if (!(error instanceof RequestValidationError)) return null

  console.warn('Blocked unsafe request:', {
    reason: error.message,
    status: error.status,
  })
  return Response.json({ error: error.message }, { status: error.status })
}
