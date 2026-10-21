"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const addStudentSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  enrollment_number: z
    .string()
    .min(3, "Enrollment number must be at least 3 characters")
    .toUpperCase(),
  course_id: z.string().uuid("Please select a valid course"),
  admission_year: z.coerce
    .number()
    .int()
    .min(2000, "Invalid admission year")
    .max(2035, "Invalid admission year"),
});

export type AddStudentInput = z.infer<typeof addStudentSchema>;

export interface ActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  insertedCount?: number;
  failedRecords?: { row: number; error: string }[];
}

export async function createStudent(data: AddStudentInput): Promise<ActionResult> {
  const parsed = addStudentSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const { first_name, last_name, email, enrollment_number, course_id, admission_year } =
    parsed.data;

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // 1. Verify that enrollment number is unique
  const { data: existingStudent } = await supabase
    .from("student_records")
    .select("id")
    .eq("enrollment_number", enrollment_number)
    .maybeSingle();

  if (existingStudent) {
    return { error: `Enrollment number "${enrollment_number}" is already assigned.` };
  }

  // 2. Fetch course to derive the corresponding department_id
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, department_id, name")
    .eq("id", course_id)
    .single();

  if (courseError || !course) {
    return { error: "Selected academic course does not exist." };
  }

  // 3. Create or resolve Auth User
  let userId: string | null = null;
  const tempPassword = `Student@${admission_year}!`;

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        role: "student",
      },
    });

  if (authError) {
    // If user already exists in auth, find existing profile
    if (authError.message.toLowerCase().includes("already registered") || authError.message.toLowerCase().includes("already exists")) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        return { error: `Auth registration failed: ${authError.message}` };
      }
    } else {
      return { error: `Could not provision user credentials: ${authError.message}` };
    }
  } else if (authData?.user) {
    userId = authData.user.id;
  }

  if (!userId) {
    return { error: "Failed to establish user identifier." };
  }

  // 4. Ensure profile record exists
  await adminClient.from("profiles").upsert(
    {
      id: userId,
      role: "student",
      first_name,
      last_name,
      email,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // 5. Insert into student_records
  const admissionDate = `${admission_year}-08-01`;

  const { error: insertError } = await adminClient.from("student_records").insert({
    profile_id: userId,
    enrollment_number,
    department_id: course.department_id,
    course_id: course.id,
    admission_date: admissionDate,
  });

  if (insertError) {
    return { error: `Database insert failed: ${insertError.message}` };
  }

  revalidatePath("/admin/students");
  revalidatePath("/(admin)/students");
  return {
    success: true,
    message: `Student ${first_name} ${last_name} enrolled successfully! Initial password: ${tempPassword}`,
  };
}

export interface BulkStudentRow {
  first_name: string;
  last_name: string;
  email: string;
  enrollment_number: string;
  admission_year: number | string;
  course_id?: string;
  course_code?: string;
}

export async function bulkUploadStudents(
  rows: BulkStudentRow[],
  defaultCourseId?: string
): Promise<ActionResult> {
  if (!rows || rows.length === 0) {
    return { error: "No records found in CSV payload." };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // Fetch all courses for code-to-id resolution
  const { data: courses } = await supabase.from("courses").select("id, code, department_id");
  const courseMap = new Map<string, { id: string; department_id: string }>();
  courses?.forEach((c) => {
    courseMap.set(c.code.toUpperCase(), { id: c.id, department_id: c.department_id });
  });

  let defaultCourse = courses && courses.length > 0 ? courses[0] : null;
  if (defaultCourseId) {
    const matched = courses?.find((c) => c.id === defaultCourseId);
    if (matched) defaultCourse = matched;
  }

  if (!defaultCourse) {
    return { error: "No academic courses available. Please create courses first." };
  }

  let insertedCount = 0;
  const failedRecords: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      const first_name = String(row.first_name || "").trim();
      const last_name = String(row.last_name || "").trim();
      const email = String(row.email || "").trim().toLowerCase();
      const enrollment_number = String(row.enrollment_number || "").trim().toUpperCase();
      const admission_year = Number(row.admission_year) || new Date().getFullYear();

      if (!first_name || !last_name || !email || !enrollment_number) {
        failedRecords.push({ row: rowNum, error: "Missing required fields" });
        continue;
      }

      // Resolve course
      let targetCourseId = defaultCourse.id;
      let targetDepartmentId = defaultCourse.department_id;

      if (row.course_code && courseMap.has(row.course_code.toUpperCase())) {
        const mapped = courseMap.get(row.course_code.toUpperCase())!;
        targetCourseId = mapped.id;
        targetDepartmentId = mapped.department_id;
      } else if (row.course_id) {
        const found = courses?.find((c) => c.id === row.course_id);
        if (found) {
          targetCourseId = found.id;
          targetDepartmentId = found.department_id;
        }
      }

      // Check enrollment duplicate
      const { data: dup } = await supabase
        .from("student_records")
        .select("id")
        .eq("enrollment_number", enrollment_number)
        .maybeSingle();

      if (dup) {
        failedRecords.push({ row: rowNum, error: `Duplicate enrollment "${enrollment_number}"` });
        continue;
      }

      // Provision user
      const tempPassword = `Student@${admission_year}!`;
      let userId: string | null = null;

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          full_name: `${first_name} ${last_name}`,
          role: "student",
        },
      });

      if (authError) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingProfile) {
          userId = existingProfile.id;
        } else {
          failedRecords.push({ row: rowNum, error: authError.message });
          continue;
        }
      } else {
        userId = authData?.user?.id || null;
      }

      if (!userId) {
        failedRecords.push({ row: rowNum, error: "Failed to establish user id" });
        continue;
      }

      // Ensure profile
      await adminClient.from("profiles").upsert(
        {
          id: userId,
          role: "student",
          first_name,
          last_name,
          email,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      // Insert student record
      const admissionDate = `${admission_year}-08-01`;
      const { error: insErr } = await adminClient.from("student_records").insert({
        profile_id: userId,
        enrollment_number,
        department_id: targetDepartmentId,
        course_id: targetCourseId,
        admission_date: admissionDate,
      });

      if (insErr) {
        failedRecords.push({ row: rowNum, error: insErr.message });
      } else {
        insertedCount++;
      }
    } catch (err: any) {
      failedRecords.push({ row: rowNum, error: err.message || "Unknown error" });
    }
  }

  revalidatePath("/admin/students");
  revalidatePath("/(admin)/students");

  return {
    success: insertedCount > 0,
    insertedCount,
    failedRecords,
    message: `Batch processed: ${insertedCount} students imported successfully.${
      failedRecords.length > 0 ? ` (${failedRecords.length} records skipped due to errors)` : ""
    }`,
  };
}

export async function deleteStudent(studentId: string): Promise<ActionResult> {
  const adminClient = createAdminClient();

  // Find profile_id first to delete auth user and cascades
  const { data: record } = await adminClient
    .from("student_records")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  if (record?.profile_id) {
    await adminClient.auth.admin.deleteUser(record.profile_id);
  }

  const { error } = await adminClient.from("student_records").delete().eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  revalidatePath("/(admin)/students");
  return { success: true, message: "Student record removed." };
}
