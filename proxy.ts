import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ['/login'];
  const isPublicPath = publicPaths.includes(pathname);

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Prevent visual glitch for superadmin on the dashboard by redirecting on the server
  if (isLoggedIn && pathname === '/') {
    const role = (req.auth?.user as any)?.role;
    if (role === 'superadmin') {
      return NextResponse.redirect(new URL('/branches', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
