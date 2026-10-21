import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database, UserRole } from "@/types/database";

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  super_admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
  accountant: "/admin/dashboard",
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate user securely using getUser() (refreshes stale auth tokens)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/login");
  const isProtectedAdmin = pathname.startsWith("/admin");
  const isProtectedFaculty = pathname.startsWith("/faculty");
  const isProtectedStudent = pathname.startsWith("/student");
  const isProtectedRoute =
    isProtectedAdmin || isProtectedFaculty || isProtectedStudent;

  // Helper to carry updated cookies over to redirect responses
  const createRedirect = (destination: string) => {
    const redirectUrl = new URL(destination, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // Case 1: Unauthenticated user trying to access protected routes
  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return createRedirect(loginUrl.pathname + loginUrl.search);
  }

  // Case 2: Authenticated user checking role access or accessing login
  if (user) {
    // Read user role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const userRole = (profile?.role as UserRole) || "student";
    const userDashboard = ROLE_DASHBOARDS[userRole] || "/student/dashboard";

    // If user is deactivated, redirect to login with error
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return createRedirect("/login?error=account_deactivated");
    }

    // Redirect authenticated users away from /login to their role dashboard
    if (isAuthRoute) {
      return createRedirect(userDashboard);
    }

    // Role-based route authorization & cross-role protection
    if (isProtectedAdmin && userRole !== "super_admin") {
      return createRedirect(userDashboard);
    }

    if (isProtectedFaculty && userRole !== "faculty") {
      return createRedirect(userDashboard);
    }

    if (isProtectedStudent && userRole !== "student") {
      return createRedirect(userDashboard);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
