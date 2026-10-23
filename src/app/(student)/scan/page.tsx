import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { StudentQRScanner } from "@/components/attendance/StudentQRScanner";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function StudentScanPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = (await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single()) as { data: { first_name?: string; last_name?: string; role?: string; avatar_url?: string } | null };

  const { data: studentRecord } = (await (supabase.from("student_records") as any)
    .select("enrollment_number")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { enrollment_number: string } | null };

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Student",
    last_name: profile?.last_name || "",
    role: (profile?.role as any) || "student",
    avatar_url: profile?.avatar_url,
  };

  const studentName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Student";
  const enrollmentNumber = studentRecord?.enrollment_number || "STU-PENDING";

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        <div className="text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Classroom Attendance Check-in
            </h1>
            <Badge variant="success" className="text-xs w-fit">
              Mobile Scanner
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Point your device camera at the active dynamic QR code projected on the faculty screen.
          </p>
        </div>

        <StudentQRScanner
          studentName={studentName}
          enrollmentNumber={enrollmentNumber}
        />
      </div>
    </AppShell>
  );
}
