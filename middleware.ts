import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database, UserRole } from "@/types/database";

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  super_admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
  accountant: "/admin/dashboard",
};

interface CookieToSet {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
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

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === "/login" || pathname.startsWith("/login/");
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isFacultyRoute = pathname === "/faculty" || pathname.startsWith("/faculty/");
  const isStudentRoute = pathname === "/student" || pathname.startsWith("/student/");
  const isProtectedRoute = isAdminRoute || isFacultyRoute || isStudentRoute;

  const createRedirect = (destination: string) => {
    const redirectUrl = new URL(destination, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // 1. Guard against unauthenticated users attempting to access protected routes
  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return createRedirect(loginUrl.pathname + loginUrl.search);
  }

  // 2. Role-based routing and cross-role protection for authenticated users
  if (user) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single()) as { data: { role?: UserRole; is_active?: boolean } | null };

    // If account has been explicitly deactivated, revoke access
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return createRedirect("/login?error=account_deactivated");
    }

    const userRole = (profile?.role || (user.user_metadata?.role as UserRole) || "student") as UserRole;
    const userDashboard = ROLE_DASHBOARDS[userRole] || "/student/dashboard";

    // Prevent authenticated users from visiting the login page
    if (isAuthRoute) {
      return createRedirect(userDashboard);
    }

    // Guard: /admin/** allowed ONLY for super_admin
    if (isAdminRoute && userRole !== "super_admin") {
      return createRedirect(userDashboard);
    }

    // Guard: /faculty/** allowed ONLY for faculty
    if (isFacultyRoute && userRole !== "faculty") {
      return createRedirect(userDashboard);
    }

    // Guard: /student/** allowed ONLY for student
    if (isStudentRoute && userRole !== "student") {
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
     * - public assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
