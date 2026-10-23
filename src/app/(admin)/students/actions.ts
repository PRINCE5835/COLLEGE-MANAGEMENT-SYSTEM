"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const addStudentSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address"),
  enrollment_number: z
    .string()
    .trim()
    .min(3, "Enrollment number must be at least 3 characters")
    .toUpperCase(),
  course_id: z.string().min(1, "Please select an academic course"),
  admission_year: z.coerce
    .number()
    .int()
    .min(2000, "Admission year must be between 2000 and 2035")
    .max(2035, "Admission year must be between 2000 and 2035"),
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

  // 1. Verify uniqueness of enrollment number
  const { data: existingStudent } = (await (supabase.from("student_records") as any)
    .select("id")
    .eq("enrollment_number", enrollment_number)
    .maybeSingle()) as { data: { id: string } | null };

  if (existingStudent) {
    return { error: `Enrollment number "${enrollment_number}" is already registered.` };
  }

  // 2. Fetch course and associated department
  const { data: course, error: courseError } = (await (supabase.from("courses") as any)
    .select("id, department_id, name")
    .eq("id", course_id)
    .single()) as { data: { id: string; department_id: string; name: string } | null; error: any };

  if (courseError || !course) {
    return { error: "Selected academic course does not exist in the database." };
  }

  // 3. Find current/initial semester for this course if available
  const { data: semester } = (await (supabase.from("semesters") as any)
    .select("id")
    .eq("course_id", course.id)
    .order("semester_number", { ascending: true })
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };

  let userId: string | null = null;
  let isNewlyCreatedAuth = false;
  const tempPassword = `Student@${admission_year}!`;

  // 4. Provision Supabase Auth User
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
    const errorMsg = authError.message.toLowerCase();
    if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
      const { data: existingProfile } = (await (supabase.from("profiles") as any)
        .select("id")
        .eq("email", email)
        .maybeSingle()) as { data: { id: string } | null };

      if (existingProfile) {
        userId = existingProfile.id;
      } else {
        return { error: `User with email ${email} already exists in auth but has no profile.` };
      }
    } else {
      return { error: `Could not provision student account: ${authError.message}` };
    }
  } else if (authData?.user) {
    userId = authData.user.id;
    isNewlyCreatedAuth = true;
  }

  if (!userId) {
    return { error: "Failed to establish a valid user ID for this student." };
  }

  try {
    // 5. Upsert profile
    const { error: profileError } = await (adminClient.from("profiles") as any).upsert(
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

    if (profileError) {
      throw new Error(`Profile creation failed: ${profileError.message}`);
    }

    // 6. Insert student_records
    const admissionDate = `${admission_year}-08-01`;
    const { error: insertError } = await (adminClient.from("student_records") as any).insert({
      profile_id: userId,
      enrollment_number,
      department_id: course.department_id,
      course_id: course.id,
      current_semester_id: semester?.id || null,
      admission_date: admissionDate,
    });

    if (insertError) {
      throw new Error(`Student record insert failed: ${insertError.message}`);
    }

    revalidatePath("/admin/students");
    revalidatePath("/(admin)/students");

    return {
      success: true,
      message: `Student ${first_name} ${last_name} enrolled successfully! Initial password: ${tempPassword}`,
    };
  } catch (err: any) {
    // Compensating rollback for single creation if newly created in Auth
    if (isNewlyCreatedAuth && userId) {
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch {
        // Ignored
      }
    }
    return { error: err.message || "Failed to complete student registration." };
  }
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
    return { error: "No student records found in CSV payload." };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // 1. Fetch academic courses and map by code
  const { data: courses } = (await (supabase.from("courses") as any).select(
    "id, code, department_id"
  )) as {
    data: Array<{ id: string; code: string; department_id: string }> | null;
  };

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
    return { error: "No academic programs found in the database. Please create courses first." };
  }

  // 2. Fetch default semesters by course_id
  const { data: semesters } = (await (supabase.from("semesters") as any)
    .select("id, course_id, semester_number")
    .order("semester_number", { ascending: true })) as {
    data: Array<{ id: string; course_id: string; semester_number: number }> | null;
  };

  const semesterMap = new Map<string, string>();
  semesters?.forEach((sem) => {
    if (!semesterMap.has(sem.course_id)) {
      semesterMap.set(sem.course_id, sem.id);
    }
  });

  // 3. Pre-flight duplicate check within the payload itself
  const enrollmentSet = new Set<string>();
  const emailSet = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const enr = String(row.enrollment_number || "").trim().toUpperCase();
    const em = String(row.email || "").trim().toLowerCase();

    if (enrollmentSet.has(enr)) {
      return {
        error: `CSV contains duplicate enrollment number "${enr}" at row ${i + 1}.`,
      };
    }
    if (emailSet.has(em)) {
      return {
        error: `CSV contains duplicate email "${em}" at row ${i + 1}.`,
      };
    }
    enrollmentSet.add(enr);
    emailSet.add(em);
  }

  // 4. Pre-flight duplicate check against database
  const enrollmentsArray = Array.from(enrollmentSet);
  const { data: existingRecords } = (await (supabase.from("student_records") as any)
    .select("enrollment_number")
    .in("enrollment_number", enrollmentsArray)) as {
    data: Array<{ enrollment_number: string }> | null;
  };

  if (existingRecords && existingRecords.length > 0) {
    const existingList = existingRecords.map((r) => r.enrollment_number).join(", ");
    return {
      error: `The following enrollment number(s) are already registered in the system: ${existingList}. Batch upload aborted.`,
    };
  }

  // 5. Batch processing with TRANSACTION ROLLBACK ON ERROR
  // Track all provisioned IDs to rollback entirely if any row fails
  const createdStudentRecordIds: string[] = [];
  const createdAuthUserIds: string[] = [];
  const rollbackAll = async (errorMessage: string): Promise<ActionResult> => {
    // Delete any student_records inserted in this batch
    if (createdStudentRecordIds.length > 0) {
      await (adminClient.from("student_records") as any)
        .delete()
        .in("id", createdStudentRecordIds);
    }
    // Delete any profiles and auth users created in this batch
    for (const authId of createdAuthUserIds) {
      try {
        await (adminClient.from("profiles") as any).delete().eq("id", authId);
        await adminClient.auth.admin.deleteUser(authId);
      } catch {
        // Continue rollback
      }
    }
    return {
      error: `Transaction Rolled Back: ${errorMessage}. All ${createdStudentRecordIds.length} inserted record(s) have been cleanly removed.`,
    };
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    const first_name = String(row.first_name || "").trim();
    const last_name = String(row.last_name || "").trim();
    const email = String(row.email || "").trim().toLowerCase();
    const enrollment_number = String(row.enrollment_number || "").trim().toUpperCase();
    const admission_year = Number(row.admission_year) || new Date().getFullYear();

    if (!first_name || !last_name || !email || !enrollment_number) {
      return await rollbackAll(`Row ${rowNum} is missing mandatory student fields.`);
    }

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

    const tempPassword = `Student@${admission_year}!`;
    let userId: string | null = null;
    let isNewAuth = false;

    // Create Auth User
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
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        const { data: existingProfile } = (await (supabase.from("profiles") as any)
          .select("id")
          .eq("email", email)
          .maybeSingle()) as { data: { id: string } | null };

        if (existingProfile) {
          userId = existingProfile.id;
        } else {
          return await rollbackAll(
            `Row ${rowNum} (${email}) auth exists without profile: ${authError.message}`
          );
        }
      } else {
        return await rollbackAll(`Row ${rowNum} (${email}) auth creation failed: ${authError.message}`);
      }
    } else if (authData?.user) {
      userId = authData.user.id;
      isNewAuth = true;
      createdAuthUserIds.push(userId);
    }

    if (!userId) {
      return await rollbackAll(`Row ${rowNum} failed to acquire user identifier.`);
    }

    // Upsert Profile
    const { error: profError } = await (adminClient.from("profiles") as any).upsert(
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

    if (profError) {
      return await rollbackAll(`Row ${rowNum} profile upsert failed: ${profError.message}`);
    }

    // Insert Student Record
    const admissionDate = `${admission_year}-08-01`;
    const semId = semesterMap.get(targetCourseId) || null;

    const { data: insertedRec, error: insErr } = (await (adminClient.from("student_records") as any)
      .insert({
        profile_id: userId,
        enrollment_number,
        department_id: targetDepartmentId,
        course_id: targetCourseId,
        current_semester_id: semId,
        admission_date: admissionDate,
      })
      .select("id")
      .single()) as { data: { id: string } | null; error: any };

    if (insErr || !insertedRec) {
      return await rollbackAll(
        `Row ${rowNum} (${enrollment_number}) database insert failed: ${
          insErr?.message || "Unknown DB error"
        }`
      );
    }

    createdStudentRecordIds.push(insertedRec.id);
  }

  revalidatePath("/admin/students");
  revalidatePath("/(admin)/students");

  return {
    success: true,
    insertedCount: createdStudentRecordIds.length,
    message: `Batch transaction complete: Successfully provisioned and enrolled ${createdStudentRecordIds.length} students.`,
  };
}

export async function deleteStudent(studentId: string): Promise<ActionResult> {
  const adminClient = createAdminClient();

  const { data: record } = (await (adminClient.from("student_records") as any)
    .select("profile_id")
    .eq("id", studentId)
    .single()) as { data: { profile_id: string } | null };

  if (record?.profile_id) {
    try {
      await adminClient.auth.admin.deleteUser(record.profile_id);
    } catch {
      // Ignored if user not found in auth
    }
  }

  const { error } = await (adminClient.from("student_records") as any)
    .delete()
    .eq("id", studentId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/students");
  revalidatePath("/(admin)/students");
  return { success: true, message: "Student record removed from institution roster." };
}
