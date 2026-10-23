"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export const feeStructureSchema = z.object({
  course_id: z.string().min(1, "Please select an academic course"),
  semester_id: z.string().min(1, "Please select a semester"),
  academic_year: z.string().min(4, "Academic year is required (e.g. 2025-2026)"),
  tuition_fee: z.coerce.number().min(0, "Tuition fee must be non-negative"),
  examination_fee: z.coerce.number().min(0, "Examination fee must be non-negative"),
  development_fee: z.coerce.number().min(0, "Development fee must be non-negative").default(0),
  library_fee: z.coerce.number().min(0, "Library fee must be non-negative").default(0),
  due_date: z.string().min(1, "Due date is required"),
});

export type FeeStructureInput = z.infer<typeof feeStructureSchema>;

export interface FeeActionResult {
  success?: boolean;
  error?: string;
  message?: string;
  data?: any;
}

export interface InvoiceGenerationResult {
  success?: boolean;
  error?: string;
  message?: string;
  generatedCount?: number;
  skippedCount?: number;
  totalBilled?: number;
}

/**
 * Defines or updates a fee structure for a specific Course and Semester.
 */
export async function defineFeeStructure(input: FeeStructureInput): Promise<FeeActionResult> {
  const parsed = feeStructureSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Validation failed" };
  }

  const {
    course_id,
    semester_id,
    academic_year,
    tuition_fee,
    examination_fee,
    development_fee,
    library_fee,
  } = parsed.data;

  const adminClient = createAdminClient();

  const totalFee = tuition_fee + examination_fee + development_fee + library_fee;

  const { data: record, error } = (await (adminClient.from("fee_structures") as any)
    .upsert(
      {
        course_id,
        semester_id,
        academic_year,
        tuition_fee,
        examination_fee,
        development_fee,
        library_fee,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id, semester_id, academic_year" }
    )
    .select()
    .single()) as { data: any | null; error: any };

  if (error || !record) {
    return { error: `Failed to define fee structure: ${error?.message || "Unknown error"}` };
  }

  revalidatePath("/admin/fees");
  revalidatePath("/admin/invoices");
  revalidatePath("/student/fees");

  return {
    success: true,
    message: `Fee structure for ${academic_year} saved successfully. Total semester fee: $${totalFee.toFixed(2)}.`,
    data: record,
  };
}

/**
 * Server Action: generateSemesterInvoices(courseId, semesterId, dueDate)
 * - Queries all enrolled students in that semester / course.
 * - Batch-generates student_invoices with unique invoice numbers (e.g. INV-2026-XXXX).
 * - Sets default status to 'pending'.
 */
export async function generateSemesterInvoices(
  courseId: string,
  semesterId: string,
  dueDateStr?: string
): Promise<InvoiceGenerationResult> {
  if (!courseId) {
    return { error: "Course ID is required." };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to generate invoices." };
  }

  // 1. Fetch or create default Fee Structure for this Course & Semester
  let { data: feeStructure } = (await (supabase.from("fee_structures") as any)
    .select("*")
    .eq("course_id", courseId)
    .eq("semester_id", semesterId)
    .maybeSingle()) as { data: any | null };

  if (!feeStructure) {
    const currentYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const { data: createdFee, error: createFeeError } = (await (adminClient
      .from("fee_structures") as any)
      .insert({
        course_id: courseId,
        semester_id: semesterId,
        academic_year: currentYear,
        tuition_fee: 2500.0,
        development_fee: 350.0,
        examination_fee: 150.0,
        library_fee: 100.0,
      })
      .select()
      .single()) as { data: any | null; error: any };

    if (createFeeError || !createdFee) {
      return {
        error: `Could not initialize fee structure: ${createFeeError?.message || "Unknown DB error"}`,
      };
    }
    feeStructure = createdFee;
  }

  // 2. Query all enrolled students in that course / semester
  let { data: students, error: studentError } = (await (supabase
    .from("student_records") as any)
    .select("id, enrollment_number, profile_id, course_id, current_semester_id")
    .eq("course_id", courseId)) as {
    data: Array<{
      id: string;
      enrollment_number: string;
      profile_id: string;
      course_id: string;
      current_semester_id: string | null;
    }> | null;
    error: any;
  };

  if (studentError) {
    return { error: `Failed to query student roster: ${studentError.message}` };
  }

  if (!students || students.length === 0) {
    return {
      error: "No enrolled students found for the selected academic program.",
    };
  }

  // Filter for students assigned to this semester if explicitly allocated
  const semesterMatchedStudents = students.filter(
    (s) => !s.current_semester_id || s.current_semester_id === semesterId
  );
  const targetStudents = semesterMatchedStudents.length > 0 ? semesterMatchedStudents : students;

  const currentYearNum = new Date().getFullYear();
  const dueDate =
    dueDateStr ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const totalFeeAmount =
    feeStructure.total_fee ??
    (Number(feeStructure.tuition_fee || 0) +
      Number(feeStructure.development_fee || 0) +
      Number(feeStructure.examination_fee || 0) +
      Number(feeStructure.library_fee || 0));

  let generatedCount = 0;
  let skippedCount = 0;

  // 3. Batch generate unique invoices with status 'pending'
  for (const student of targetStudents) {
    // Check if an invoice for this student and fee structure already exists
    const { data: existing } = (await (supabase.from("student_invoices") as any)
      .select("id")
      .eq("student_id", student.id)
      .eq("fee_structure_id", feeStructure.id)
      .maybeSingle()) as { data: { id: string } | null };

    if (existing) {
      skippedCount++;
      continue;
    }

    // Unique invoice number e.g. INV-2026-104928
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${currentYearNum}-${randSuffix}${String(student.enrollment_number.slice(-3))}`;

    const { error: insError } = await (adminClient.from("student_invoices") as any).insert({
      invoice_number: invoiceNumber,
      student_id: student.id,
      fee_structure_id: feeStructure.id,
      amount_due: Number(totalFeeAmount),
      amount_paid: 0.0,
      status: "pending",
      due_date: dueDate,
    });

    if (!insError) {
      generatedCount++;
    }
  }

  revalidatePath("/admin/fees");
  revalidatePath("/admin/invoices");
  revalidatePath("/student/fees");
  revalidatePath("/student/invoices");

  const totalBilled = generatedCount * Number(totalFeeAmount);

  return {
    success: true,
    generatedCount,
    skippedCount,
    totalBilled,
    message: `Batch generation complete: ${generatedCount} invoice(s) generated at $${totalFeeAmount.toFixed(
      2
    )} each (${skippedCount} student(s) already had existing invoices).`,
  };
}
