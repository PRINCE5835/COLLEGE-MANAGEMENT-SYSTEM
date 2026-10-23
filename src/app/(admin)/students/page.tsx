import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  StudentDataTable,
  StudentTableItem,
  DepartmentOption,
  CourseOption,
  SemesterOption,
} from "@/components/students/StudentDataTable";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
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
    .single()) as {
    data: {
      first_name?: string;
      last_name?: string;
      role?: string;
      avatar_url?: string;
    } | null;
  };

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Super",
    last_name: profile?.last_name || "Admin",
    role: (profile?.role as any) || "super_admin",
    avatar_url: profile?.avatar_url,
  };

  // 1. Fetch Departments
  const { data: departmentsData } = (await (supabase.from("departments") as any)
    .select("id, name, code")
    .order("name", { ascending: true })) as {
    data: Array<{ id: string; name: string; code: string }> | null;
  };

  const departments: DepartmentOption[] = (departmentsData || []).map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
  }));

  // 2. Fetch Courses
  const { data: coursesData } = (await (supabase.from("courses") as any)
    .select("id, name, code, department_id")
    .order("name", { ascending: true })) as {
    data: Array<{ id: string; name: string; code: string; department_id: string }> | null;
  };

  const courses: CourseOption[] = (coursesData || []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    department_id: c.department_id,
  }));

  // 3. Fetch Semesters
  const { data: semestersData } = (await (supabase.from("semesters") as any)
    .select("id, semester_number, academic_year, course_id")
    .order("semester_number", { ascending: true })) as {
    data: Array<{ id: string; semester_number: number; academic_year: string; course_id: string }> | null;
  };

  const semesters: SemesterOption[] = (semestersData || []).map((s) => ({
    id: s.id,
    semester_number: s.semester_number,
    academic_year: s.academic_year,
    course_id: s.course_id,
  }));

  // 4. Fetch Student Records joining Profiles, Departments, Courses, and Semesters
  const { data: studentRecords } = (await (supabase.from("student_records") as any)
    .select(`
      id,
      enrollment_number,
      admission_date,
      created_at,
      profile:profiles (first_name, last_name, email),
      department:departments (id, name, code),
      course:courses (id, name, code),
      current_semester:semesters (id, semester_number, academic_year)
    `)
    .order("created_at", { ascending: false })) as { data: any[] | null };

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
      department_id: s.department?.id || "",
      department_name: s.department?.name || "Academic Division",
      department_code: s.department?.code || "ACAD",
      semester_number: s.current_semester?.semester_number ?? null,
      semester_academic_year: s.current_semester?.academic_year ?? null,
      admission_date: s.admission_date || s.created_at,
      admission_year: admissionYear,
      created_at: s.created_at,
    };
  });

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold tracking-tight">Student Directory</h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {formattedStudents.length} Students
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Manage student admissions, filter across academic departments and semesters, and handle bulk enrollments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>{courses.length} Programs</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              <span>{departments.length} Depts</span>
            </div>
          </div>
        </div>

        {/* Student DataTable with Search, Department & Semester Filtering, and Pagination */}
        <StudentDataTable
          initialStudents={formattedStudents}
          departments={departments}
          courses={courses}
          semesters={semesters}
        />
      </div>
    </AppShell>
  );
}
