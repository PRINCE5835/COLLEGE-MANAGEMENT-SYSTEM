import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { StudentDataTable, StudentTableItem } from "@/components/students/StudentDataTable";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const supabase = await createClient();

  // Validate session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Super",
    last_name: profile?.last_name || "Admin",
    role: (profile?.role as any) || "super_admin",
    avatar_url: profile?.avatar_url,
  };

  // Fetch all active courses for modal dropdowns & filtering
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code")
    .order("name", { ascending: true });

  const formattedCourses = (courses || []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  // Fetch all student records with relations
  const { data: studentRecords } = await supabase
    .from("student_records")
    .select(`
      id,
      enrollment_number,
      admission_date,
      created_at,
      profile:profiles (first_name, last_name, email),
      department:departments (name, code),
      course:courses (id, name, code)
    `)
    .order("created_at", { ascending: false });

  const formattedStudents: StudentTableItem[] = (studentRecords || []).map((s: any) => {
    const admissionYear = s.admission_date
      ? new Date(s.admission_date).getFullYear()
      : new Date(s.created_at).getFullYear();

    return {
      id: s.id,
      enrollment_number: s.enrollment_number,
      first_name: s.profile?.first_name || "Enrolled",
      last_name: s.profile?.last_name || "Student",
      email: s.profile?.email || "—",
      course_id: s.course?.id || "",
      course_name: s.course?.name || "General Program",
      course_code: s.course?.code || "GEN",
      department_name: s.department?.name || "Academic Division",
      admission_date: s.admission_date || s.created_at,
      admission_year: admissionYear,
      created_at: s.created_at,
    };
  });

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Student Directory</h1>
              <Badge variant="secondary" className="text-xs">
                {formattedStudents.length} Students
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Enroll individual students, perform bulk CSV imports, and manage academic programs.
            </p>
          </div>
        </div>

        {/* Interactive Data Table */}
        <StudentDataTable
          initialStudents={formattedStudents}
          courses={formattedCourses}
        />
      </div>
    </AppShell>
  );
}
