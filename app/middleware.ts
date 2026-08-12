import {
  NextRequest,
  NextResponse,
} from 'next/server'

const REQUISITION_HOST =
  'requisitionnuku.fenuaprobartender.com'

export function middleware(
  request: NextRequest
) {
  const host =
    request.headers
      .get('host')
      ?.split(':')[0] || ''

  if (
    host !==
    REQUISITION_HOST
  ) {
    return NextResponse.next()
  }

  const pathname =
    request.nextUrl.pathname

  if (
    pathname.startsWith(
      '/_next'
    ) ||
    pathname.startsWith(
      '/images'
    ) ||
    pathname ===
      '/favicon.ico' ||
    pathname ===
      '/manifest.webmanifest'
  ) {
    return NextResponse.next()
  }

  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname ===
      '/requisition' ||
    pathname.startsWith(
      '/requisition/'
    )
  ) {
    return NextResponse.next()
  }

  const url =
    request.nextUrl.clone()

  url.pathname =
    '/requisition'

  return NextResponse.rewrite(
    url
  )
}

export const config = {
  matcher: [
    '/((?!api).*)',
  ],
}