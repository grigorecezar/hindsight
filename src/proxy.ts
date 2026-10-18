import { NextResponse, type NextRequest } from 'next/server'

/**
 * Basic auth over the whole app when APP_PASSWORD is set (any username).
 * The health check and the run and sync endpoints (which check their own
 * tokens) stay open.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD
  if (!password) {
    return NextResponse.next()
  }

  const header = request.headers.get('authorization') ?? ''
  const [scheme, encoded] = header.split(' ')
  const supplied =
    scheme === 'Basic' && encoded
      ? atob(encoded).split(':').slice(1).join(':')
      : null
  if (supplied === password) {
    return NextResponse.next()
  }

  return new NextResponse('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Hindsight", charset="UTF-8"' },
  })
}

export const config = {
  matcher: [
    '/((?!api/health|api/runs|api/sync|_next/static|_next/image|icon.svg|apple-icon.png).*)',
  ],
}
