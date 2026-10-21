"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/database";

export interface AuthState {
  error?: string;
  success?: boolean;
}

const ROLE_REDIRECTS: Record<UserRole, string> = {
  super_admin: "/admin/dashboard",
  faculty: "/faculty/dashboard",
  student: "/student/dashboard",
  accountant: "/admin/dashboard",
};

// Standard login Server Action
export async function login(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid credentials. Please try again." };
  }

  // Fetch user role from profiles to route to the correct dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const userRole = (profile?.role as UserRole) || "student";
  const destination = ROLE_REDIRECTS[userRole] || "/student/dashboard";

  redirect(destination);
}

// Demo quick-login credentials configured for recruiters & instant testing
const DEMO_CREDENTIALS: Record<"admin" | "faculty" | "student", { email: string; pass: string; targetRole: UserRole }> = {
  admin: {
    email: "admin@college.edu",
    pass: "AdminDemo123!",
    targetRole: "super_admin",
  },
  faculty: {
    email: "faculty@college.edu",
    pass: "FacultyDemo123!",
    targetRole: "faculty",
  },
  student: {
    email: "student@college.edu",
    pass: "StudentDemo123!",
    targetRole: "student",
  },
};

export async function demoLogin(
  role: "admin" | "faculty" | "student"
): Promise<AuthState> {
  const credentials = DEMO_CREDENTIALS[role];
  if (!credentials) {
    return { error: "Invalid demo role selected." };
  }

  const supabase = await createClient();

  // Attempt login with demo account
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.pass,
  });

  if (error) {
    // If demo account does not exist in local development Supabase yet, attempt sign-up
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.pass,
        options: {
          data: {
            full_name: `${role.charAt(0).toUpperCase() + role.slice(1)} Demo User`,
            role: credentials.targetRole,
          },
        },
      });

      if (signupError) {
        return {
          error: `Demo account (${credentials.email}) could not be initialized: ${signupError.message}`,
        };
      }

      if (signupData.user) {
        redirect(ROLE_REDIRECTS[credentials.targetRole]);
      }
    }

    return { error: `Demo login failed: ${error.message}` };
  }

  if (data.user) {
    redirect(ROLE_REDIRECTS[credentials.targetRole]);
  }

  return { error: "Unexpected error during demo authentication." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
