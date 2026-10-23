import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { FacultySessionManager, SubjectAllocationOption } from "@/components/attendance/FacultySessionManager";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function FacultyAttendancePage() {
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

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Faculty",
    last_name: profile?.last_name || "Member",
    role: (profile?.role as any) || "faculty",
    avatar_url: profile?.avatar_url,
  };

  const { data: rawAllocations } = (await (supabase
    .from("subject_allocations") as any)
    .select(`
      id,
      subject_id,
      section,
      academic_year,
      subject:subjects (
        id,
        name,
        code,
        course:courses (name)
      )
    `)
    .eq("faculty_id", user.id)) as { data: any[] | null };

  const formattedAllocations: SubjectAllocationOption[] = (rawAllocations || []).map((item: any) => ({
    id: item.id,
    subject_id: item.subject_id,
    subject_name: item.subject?.name || "Subject",
    subject_code: item.subject?.code || "SUBJ",
    course_name: item.subject?.course?.name || "Academic Program",
    section: item.section || "A",
    academic_year: item.academic_year || "Current",
  }));

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Attendance Session Control
            </h1>
            <Badge variant="info" className="text-xs">
              Live QR Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Launch classroom check-ins with 15-second dynamic QR code refreshing and real-time attendance syncing.
          </p>
        </div>

        <FacultySessionManager allocations={formattedAllocations} />
      </div>
    </AppShell>
  );
}
