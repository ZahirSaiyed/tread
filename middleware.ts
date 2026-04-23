import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isPublicRoute, defaultRedirectForRole } from '@/lib/auth/roles'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import type { Role } from '@/types/enums'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always refresh session so it doesn't expire mid-session
  const { supabaseResponse, user } = await updateSession(request)

  // Public routes — skip auth checks
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // No session — redirect page requests, 401 API requests
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Fetch the user's role from the public.users table
  // We use a lightweight separate client here since updateSession already ran
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  )

  const { data: profile } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  // User is authenticated via Supabase Auth but has no profile row yet
  // (edge case: incomplete onboarding). Redirect to login.
  if (!profile) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const role = profile.role as Role

  // Role-based redirect: tech routes are for field techs only
  if (role === 'operator' && (pathname === '/jobs' || pathname.startsWith('/jobs/'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (role === 'tech' && (pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) {
    return NextResponse.redirect(new URL('/jobs', request.url))
  }

  // Admin-only routes
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL(defaultRedirectForRole(role), request.url))
  }

  // Operator-only routes
  const operatorOnlyPaths = ['/pricing', '/team', '/settings', '/analytics', '/messages', '/sops/edit']
  if (operatorOnlyPaths.some((p) => pathname.startsWith(p)) && role !== 'operator' && role !== 'admin') {
    return NextResponse.redirect(new URL(defaultRedirectForRole(role), request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder files (fonts, images)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|fonts/|images/).*)',
  ],
}
