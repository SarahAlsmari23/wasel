/**
 * PostgREST rejects a JWT whose time claims fail validation with HTTP 401 and
 * error code PGRST303. Right after sign-in this happens transiently when a
 * request reaches a PostgREST instance whose clock is slightly behind the
 * token's "issued at" time, while identical requests on other instances
 * succeed (observed in production: one HEAD 401 among three parallel reads
 * made with the same fresh token).
 *
 * The request is rejected before it reaches the database, so repeating it is
 * safe for every method. Only that exact error is retried, at most twice.
 */
export const JWT_CLAIMS_ERROR = 'PGRST303'
const RETRY_DELAYS_MS = [400, 900]

async function isJwtClaimsRejection(response: Response): Promise<boolean> {
  if (response.status !== 401) return false
  if ((response.headers.get('proxy-status') ?? '').includes(JWT_CLAIMS_ERROR)) return true
  try {
    const body = (await response.clone().json()) as { code?: unknown }
    return body?.code === JWT_CLAIMS_ERROR
  } catch {
    return false
  }
}

export function withClockSkewRetry(
  baseFetch: typeof fetch,
  delays: readonly number[] = RETRY_DELAYS_MS,
): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init)
    for (const delay of delays) {
      if (!(await isJwtClaimsRejection(response))) return response
      await new Promise((resolve) => setTimeout(resolve, delay))
      response = await baseFetch(input, init)
    }
    return response
  }
}
