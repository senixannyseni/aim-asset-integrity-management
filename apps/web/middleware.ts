import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AIM_AUTH_COOKIE, DEFAULT_AUTHENTICATED_PATH, buildLoginRedirectPath, isPublicPath } from './lib/auth-routing';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasAuthCookie = Boolean(request.cookies.get(AIM_AUTH_COOKIE)?.value);

  if (isPublicPath(pathname)) {
    if (pathname === '/login' && hasAuthCookie) {
      return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL(buildLoginRedirectPath(pathname, search), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|icon.png|apple-icon.png|apple-touch-icon.png).*)']
};
