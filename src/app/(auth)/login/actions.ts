"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
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

interface DemoConfig {
  email: string;
  pass: string;
  targetRole: UserRole;
  firstName: string;
  lastName: string;
}

const DEMO_CREDENTIALS: Record<"admin" | "faculty" | "student", DemoConfig> = {
  admin: {
    email: "admin@college.edu",
    pass: "AdminDemo123!",
    targetRole: "super_admin",
    firstName: "Super",
    lastName: "Administrator",
  },
  faculty: {
    email: "faculty@college.edu",
    pass: "FacultyDemo123!",
    targetRole: "faculty",
    firstName: "Rajesh",
    lastName: "Sharma",
  },
  student: {
    email: "student@college.edu",
    pass: "StudentDemo123!",
    targetRole: "student",
    firstName: "Aarav",
    lastName: "Sharma",
  },
};

export async function login(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim();
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
    return {
      error: error?.message || "Invalid credentials. Please verify your email and password.",
    };
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single()) as { data: { role?: UserRole; is_active?: boolean } | null };

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated. Please contact administration." };
  }

  const userRole = (profile?.role || (data.user.user_metadata?.role as UserRole) || "student") as UserRole;
  const destination = ROLE_REDIRECTS[userRole] || "/student/dashboard";

  redirect(destination);
}

export async function demoLogin(
  role: "admin" | "faculty" | "student"
): Promise<AuthState> {
  const credentials = DEMO_CREDENTIALS[role];
  if (!credentials) {
    return { error: "Invalid demo role selected." };
  }

  const supabase = await createClient();

  // 1. Attempt standard authentication first
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.pass,
  });

  if (error) {
    // 2. If user is not yet created or password mismatched, auto-provision via Admin API
    try {
      const adminClient = createAdminClient();
      const { data: userList } = await adminClient.auth.admin.listUsers();
      const existingUser = userList?.users.find((u) => u.email === credentials.email);

      let userId = existingUser?.id;

      if (!existingUser) {
        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email: credentials.email,
          password: credentials.pass,
          email_confirm: true,
          user_metadata: {
            role: credentials.targetRole,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
          },
        });

        if (createError) {
          return { error: `Demo account provisioning failed: ${createError.message}` };
        }
        userId = created.user?.id;
      } else {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: credentials.pass,
          email_confirm: true,
          user_metadata: {
            role: credentials.targetRole,
            first_name: credentials.firstName,
            last_name: credentials.lastName,
          },
        });
      }

      // Upsert profile in profiles table if table exists
      if (userId) {
        try {
          await (adminClient.from("profiles") as any).upsert(
            {
              id: userId,
              role: credentials.targetRole,
              first_name: credentials.firstName,
              last_name: credentials.lastName,
              email: credentials.email,
              is_active: true,
            },
            { onConflict: "id" }
          );
        } catch {
          // profiles table might not be migrated yet; fallback metadata handles role
        }
      }

      // Retry sign in with freshly provisioned credentials
      const retry = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.pass,
      });

      if (retry.error || !retry.data.user) {
        return { error: retry.error?.message || "Demo sign in failed. Please try again." };
      }

      redirect(ROLE_REDIRECTS[credentials.targetRole]);
    } catch (provisionErr: any) {
      if (provisionErr?.digest?.startsWith("NEXT_REDIRECT")) {
        throw provisionErr;
      }
      return { error: provisionErr?.message || "Failed to initialize demo persona." };
    }
  }

  if (data?.user) {
    redirect(ROLE_REDIRECTS[credentials.targetRole]);
  }

  return { error: "Unexpected authentication error." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
