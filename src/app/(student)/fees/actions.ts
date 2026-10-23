"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/utils/supabase/server";

export interface InvoiceGenerationResult {
  success?: boolean;
  error?: string;
  message?: string;
  generatedCount?: number;
}

export interface PaymentResult {
  success?: boolean;
  error?: string;
  message?: string;
  transactionRef?: string;
}

export async function generateSemesterInvoices(
  courseId: string,
  semesterId: string,
  dueDateStr?: string
): Promise<InvoiceGenerationResult> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to generate invoices." };
  }

  let { data: feeStructure } = (await (supabase
    .from("fee_structures") as any)
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
        error: `Could not initialize fee structure: ${createFeeError?.message || "Unknown error"}`,
      };
    }
    feeStructure = createdFee;
  }

  const { data: students, error: studentError } = (await (supabase
    .from("student_records") as any)
    .select("id, enrollment_number, profile_id")
    .eq("course_id", courseId)) as {
    data: Array<{ id: string; enrollment_number: string; profile_id: string }> | null;
    error: any;
  };

  if (studentError) {
    return { error: `Failed to query student roster: ${studentError.message}` };
  }

  if (!students || students.length === 0) {
    return {
      error: "No students are currently enrolled in this degree program.",
    };
  }

  const dueDate =
    dueDateStr ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  let generatedCount = 0;

  for (const student of students) {
    const { data: existing } = (await (supabase
      .from("student_invoices") as any)
      .select("id")
      .eq("student_id", student.id)
      .eq("fee_structure_id", feeStructure!.id)
      .maybeSingle()) as { data: { id: string } | null };

    if (!existing) {
      const year = new Date().getFullYear();
      const rand = Math.floor(100000 + Math.random() * 900000);
      const invoiceNumber = `INV-${year}-${rand}`;

      const totalFee = feeStructure!.total_fee ?? (
        Number(feeStructure!.tuition_fee || 0) +
        Number(feeStructure!.development_fee || 0) +
        Number(feeStructure!.examination_fee || 0) +
        Number(feeStructure!.library_fee || 0)
      );

      const { error: insError } = await (adminClient
        .from("student_invoices") as any)
        .insert({
          invoice_number: invoiceNumber,
          student_id: student.id,
          fee_structure_id: feeStructure!.id,
          amount_due: Number(totalFee),
          amount_paid: 0.0,
          status: "pending",
          due_date: dueDate,
        });

      if (!insError) {
        generatedCount++;
      }
    }
  }

  revalidatePath("/student/fees");
  revalidatePath("/student/invoices");
  revalidatePath("/admin/invoices");

  return {
    success: true,
    generatedCount,
    message: `Generated ${generatedCount} semester invoice(s) successfully.`,
  };
}

export async function payInvoice(
  invoiceId: string,
  paymentMethod: string = "Credit Card",
  customReference?: string
): Promise<PaymentResult> {
  const adminClient = createAdminClient();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to make a payment." };
  }

  const { data: invoice, error: invError } = (await (supabase
    .from("student_invoices") as any)
    .select("*, student:student_records(profile_id)")
    .eq("id", invoiceId)
    .single()) as { data: any | null; error: any };

  if (invError || !invoice) {
    return { error: "Invoice not found." };
  }

  if (invoice.status === "paid") {
    return { error: "This invoice has already been fully settled." };
  }

  const transactionRef =
    customReference ||
    `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const paidAt = new Date().toISOString();

  const { error: updateError } = await (adminClient
    .from("student_invoices") as any)
    .update({
      amount_paid: invoice.amount_due,
      status: "paid",
      paid_at: paidAt,
      payment_reference: `${paymentMethod} - ${transactionRef}`,
      updated_at: paidAt,
    })
    .eq("id", invoiceId);

  if (updateError) {
    return { error: `Payment failed: ${updateError.message}` };
  }

  revalidatePath("/student/fees");
  revalidatePath("/student/invoices");
  revalidatePath("/admin/invoices");

  return {
    success: true,
    transactionRef,
    message: "Payment confirmed successfully! Invoice marked as paid.",
  };
}
