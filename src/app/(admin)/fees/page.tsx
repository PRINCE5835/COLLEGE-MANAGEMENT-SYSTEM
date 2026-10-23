import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  AdminFeeManager,
  CourseOption,
  SemesterOption,
  FeeStructureItem,
  InvoiceTableItem,
} from "@/components/finance/AdminFeeManager";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Receipt, DollarSign, CheckCircle2, Clock, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminFeesPage() {
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

  // 1. Fetch Courses
  const { data: coursesData } = (await (supabase.from("courses") as any)
    .select("id, name, code")
    .order("name", { ascending: true })) as {
    data: Array<{ id: string; name: string; code: string }> | null;
  };

  const courses: CourseOption[] = (coursesData || []).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }));

  // 2. Fetch Semesters
  const { data: semestersData } = (await (supabase.from("semesters") as any)
    .select("id, course_id, semester_number, academic_year")
    .order("semester_number", { ascending: true })) as {
    data: Array<{ id: string; course_id: string; semester_number: number; academic_year: string }> | null;
  };

  const semesters: SemesterOption[] = (semestersData || []).map((s) => ({
    id: s.id,
    course_id: s.course_id,
    semester_number: s.semester_number,
    academic_year: s.academic_year,
  }));

  // 3. Fetch Fee Structures
  const { data: feeStructuresData } = (await (supabase.from("fee_structures") as any)
    .select(`
      id,
      course_id,
      semester_id,
      academic_year,
      tuition_fee,
      examination_fee,
      development_fee,
      library_fee,
      total_fee,
      course:courses (name, code),
      semester:semesters (semester_number)
    `)
    .order("created_at", { ascending: false })) as { data: any[] | null };

  const feeStructures: FeeStructureItem[] = (feeStructuresData || []).map((f: any) => ({
    id: f.id,
    course_id: f.course_id,
    semester_id: f.semester_id,
    academic_year: f.academic_year,
    tuition_fee: Number(f.tuition_fee || 0),
    examination_fee: Number(f.examination_fee || 0),
    development_fee: Number(f.development_fee || 0),
    library_fee: Number(f.library_fee || 0),
    total_fee:
      f.total_fee ??
      Number(f.tuition_fee || 0) +
        Number(f.examination_fee || 0) +
        Number(f.development_fee || 0) +
        Number(f.library_fee || 0),
    course_name: f.course?.name || "Program",
    course_code: f.course?.code || "COURSE",
    semester_number: f.semester?.semester_number || 1,
  }));

  // 4. Fetch All Institutional Invoices
  const { data: rawInvoices } = (await (supabase.from("student_invoices") as any)
    .select(`
      id,
      invoice_number,
      amount_due,
      amount_paid,
      balance_amount,
      status,
      due_date,
      paid_at,
      payment_reference,
      student:student_records (
        enrollment_number,
        course:courses (code),
        profile:profiles (first_name, last_name)
      )
    `)
    .order("created_at", { ascending: false })) as { data: any[] | null };

  const formattedInvoices: InvoiceTableItem[] = (rawInvoices || []).map((inv: any) => {
    const student = inv.student;
    const profile = student?.profile;
    const studentName = profile
      ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      : "Enrolled Student";

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      student_name: studentName,
      enrollment_number: student?.enrollment_number || "—",
      course_code: student?.course?.code || "GEN",
      amount_due: Number(inv.amount_due || 0),
      amount_paid: Number(inv.amount_paid || 0),
      status: inv.status || "pending",
      due_date: inv.due_date,
      paid_at: inv.paid_at,
      payment_reference: inv.payment_reference,
    };
  });

  const totalAssessed = formattedInvoices.reduce((sum, i) => sum + i.amount_due, 0);
  const totalCollected = formattedInvoices.reduce((sum, i) => sum + i.amount_paid, 0);
  const totalPending = totalAssessed - totalCollected;

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amt);

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Fee &amp; Invoicing Administration
              </h1>
              <Badge variant="secondary" className="text-xs font-semibold">
                {formattedInvoices.length} Invoices Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Configure academic tuition rates, batch-generate semester student invoices, and monitor revenue ledgers.
            </p>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Invoiced
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-mono text-foreground">
                {formatCurrency(totalAssessed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Across {formattedInvoices.length} student invoice assessments
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Collected Revenue
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalCollected)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Confirmed electronic &amp; campus payments</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Receivables
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                {formatCurrency(totalPending)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Pending and overdue semester dues</p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Fee Management Component */}
        <AdminFeeManager
          courses={courses}
          semesters={semesters}
          initialFeeStructures={feeStructures}
          initialInvoices={formattedInvoices}
        />
      </div>
    </AppShell>
  );
}
