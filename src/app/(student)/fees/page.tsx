import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { PaymentModal } from "@/components/finance/PaymentModal";
import { ReceiptModal, InvoiceReceiptData } from "@/components/finance/ReceiptModal";
import { generateSemesterInvoices } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentFeesPage() {
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
    .single()) as { data: { first_name?: string; last_name?: string; avatar_url?: string } | null };

  const { data: studentRecord } = (await (supabase.from("student_records") as any)
    .select(`
      id,
      enrollment_number,
      course_id,
      department_id,
      current_semester_id,
      course:courses (id, name, code),
      department:departments (name)
    `)
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: any | null };

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Student",
    last_name: profile?.last_name || "",
    role: "student" as const,
    avatar_url: profile?.avatar_url,
  };

  const studentName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : "Enrolled Student";

  const studentRecordId = studentRecord?.id;
  let invoices: any[] = [];

  if (studentRecordId) {
    const { data: invData } = (await (supabase.from("student_invoices") as any)
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
        fee_structure:fee_structures (
          tuition_fee,
          development_fee,
          examination_fee,
          library_fee,
          total_fee,
          academic_year
        )
      `)
      .eq("student_id", studentRecordId)
      .order("created_at", { ascending: false })) as { data: any[] | null };

    invoices = invData || [];
  }

  const totalBilled = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount_due || 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount_paid || 0),
    0
  );
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + Number(inv.balance_amount || 0),
    0
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);

  const handleGenerateSampleInvoice = async () => {
    "use server";
    if (studentRecord?.course_id) {
      const supabase = await createClient();
      const { data: sem } = (await (supabase.from("semesters") as any)
        .select("id")
        .eq("course_id", studentRecord.course_id)
        .limit(1)
        .maybeSingle()) as { data: { id: string } | null };

      const semesterId = sem?.id || studentRecord.current_semester_id || "00000000-0000-0000-0000-000000000000";
      await generateSemesterInvoices(studentRecord.course_id, semesterId);
    }
  };

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-tight">Tuition &amp; Fees Ledger</h1>
              <Badge variant="outline" className="text-xs font-mono">
                {invoices.length} Invoices
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Review institutional fee obligations, settle semester invoices, and download official receipts.
            </p>
          </div>

          {invoices.length === 0 && studentRecord?.course_id && (
            <form action={handleGenerateSampleInvoice}>
              <Button size="sm" variant="outline" className="gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Generate Semester Invoice
              </Button>
            </form>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Billed Fees
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(totalBilled)}</div>
              <p className="text-xs text-muted-foreground mt-1.5">Total institutional assessments</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Settled &amp; Paid
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Confirmed payment transactions</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Outstanding Balance
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(totalOutstanding)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Due across active semesters</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Fee Invoices &amp; Payment History</CardTitle>
            <CardDescription>
              Detailed breakdown of academic billing, payment status, and official receipts.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {invoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Term / Session</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    const isOverdue =
                      inv.status === "overdue" ||
                      (!isPaid && new Date(inv.due_date) < new Date());

                    const badgeVariant = isPaid
                      ? "success"
                      : isOverdue
                      ? "destructive"
                      : "warning";

                    const badgeLabel = isPaid
                      ? "Paid"
                      : isOverdue
                      ? "Overdue"
                      : "Pending";

                    const receiptData: InvoiceReceiptData = {
                      id: inv.id,
                      invoice_number: inv.invoice_number,
                      due_date: inv.due_date,
                      paid_at: inv.paid_at,
                      payment_reference: inv.payment_reference,
                      amount_due: Number(inv.amount_due),
                      amount_paid: Number(inv.amount_paid),
                      status: inv.status,
                      student: {
                        enrollment_number: studentRecord?.enrollment_number || "—",
                        student_name: studentName,
                        email: user.email || "",
                        course_name: (studentRecord as any)?.course?.name || "Program",
                        course_code: (studentRecord as any)?.course?.code || "COURSE",
                        department_name: (studentRecord as any)?.department?.name || "Academic Department",
                      },
                      fee_breakdown: {
                        tuition_fee: Number(inv.fee_structure?.tuition_fee || 2500),
                        development_fee: Number(inv.fee_structure?.development_fee || 350),
                        examination_fee: Number(inv.fee_structure?.examination_fee || 150),
                        library_fee: Number(inv.fee_structure?.library_fee || 100),
                        total_fee: Number(inv.amount_due),
                        academic_year: inv.fee_structure?.academic_year || "2025-2026",
                      },
                    };

                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-mono font-semibold text-xs text-primary">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {inv.fee_structure?.academic_year || "Current Session"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(inv.due_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm font-semibold font-mono">
                          {formatCurrency(Number(inv.amount_due))}
                        </TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">
                          {formatCurrency(Number(inv.amount_paid))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant} className="text-[10px] uppercase font-semibold">
                            {badgeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPaid ? (
                            <ReceiptModal invoice={receiptData} />
                          ) : (
                            <PaymentModal
                              invoiceId={inv.id}
                              invoiceNumber={inv.invoice_number}
                              amountDue={Number(inv.balance_amount || inv.amount_due)}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Receipt className="h-6 w-6" />
                </div>
                <div className="text-sm font-medium text-foreground">No Invoices Issued</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  There are currently no active fee invoices on file for your account. Semester billing generated by the bursar will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
