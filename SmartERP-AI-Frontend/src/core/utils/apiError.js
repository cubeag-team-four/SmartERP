/**
 * Normalises an axios error from the backend. Errors are RFC 7807 ProblemDetail
 * bodies: { status, title, detail, code?, tenants? }. Older endpoints may still
 * send `message`, so that is used as a fallback.
 */
export const getApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  const response = error?.response
  if (!response) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Check your connection and try again.',
      data: null,
    }
  }
  const data = response.data && typeof response.data === 'object' ? response.data : {}
  return {
    status: response.status,
    code: data.code || null,
    message: data.detail || data.message || fallback,
    data,
  }
}
