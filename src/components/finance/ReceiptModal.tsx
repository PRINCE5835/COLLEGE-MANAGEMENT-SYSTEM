"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Download,
  GraduationCap,
  CheckCircle2,
  Receipt,
  Building2,
} from "lucide-react";

export interface InvoiceReceiptData {
  id: string;
  invoice_number: string;
  due_date: string;
  paid_at: string | null;
  payment_reference: string | null;
  amount_due: number;
  amount_paid: number;
  status: string;
  student: {
    enrollment_number: string;
    student_name: string;
    email: string;
    course_name: string;
    course_code: string;
    department_name: string;
  };
  fee_breakdown: {
    tuition_fee: number;
    development_fee: number;
    examination_fee: number;
    library_fee: number;
    total_fee: number;
    academic_year: string;
  };
}

interface ReceiptModalProps {
  invoice: InvoiceReceiptData;
}

export function ReceiptModal({ invoice }: ReceiptModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-semibold">
          <Download className="h-3.5 w-3.5" /> Download Receipt
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-none print:m-0 print:p-0">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-primary" /> Official Payment Receipt
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-8"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </Button>
          </div>
          <DialogDescription className="text-xs">
            Official voucher for tuition and campus fee settlement.
          </DialogDescription>
        </DialogHeader>

        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              background: white !important;
              color: black !important;
            }
            #printable-receipt {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
          }
        `}</style>

        <div id="printable-receipt" className="p-6 border rounded-xl bg-card text-card-foreground space-y-6 print:border-none print:p-0">
          <div className="flex items-start justify-between border-b pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground uppercase">
                  AcademiaCore Institute of Technology
                </h2>
                <p className="text-xs text-muted-foreground">
                  Office of the Bursar & Academic Financial Affairs &bull; Campus Central
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  Tax Registration: ACMS-FED-992019
                </p>
              </div>
            </div>

            <div className="border-2 border-emerald-500 rounded-lg px-3 py-1 text-center rotate-[-4deg] bg-emerald-500/10">
              <span className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                PAID &amp; SETTLED
              </span>
              <span className="block text-[10px] font-mono text-emerald-600/80">
                {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : "CONFIRMED"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Billed Student
              </span>
              <p className="font-bold text-sm text-foreground">{invoice.student.student_name}</p>
              <p className="font-mono text-muted-foreground">ID: {invoice.student.enrollment_number}</p>
              <p className="text-muted-foreground">{invoice.student.email}</p>
              <p className="text-muted-foreground">
                {invoice.student.course_name} ({invoice.student.course_code})
              </p>
            </div>

            <div className="space-y-1.5 text-right font-mono">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Voucher Details
              </span>
              <p className="font-bold text-sm text-primary">{invoice.invoice_number}</p>
              <p className="text-muted-foreground">
                Term: {invoice.fee_breakdown.academic_year || "Academic Year 2025"}
              </p>
              <p className="text-muted-foreground">
                Settled Date: {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : "—"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Ref: {invoice.payment_reference || "CAMPUS-DIRECT-PAY"}
              </p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/60 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="text-left p-3">Fee Item Description</th>
                  <th className="text-center p-3">Category</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="p-3 font-medium">Academic Program Tuition Fee</td>
                  <td className="p-3 text-center text-muted-foreground">Instruction</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(invoice.fee_breakdown.tuition_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Campus Infrastructure & Lab Development</td>
                  <td className="p-3 text-center text-muted-foreground">Facilities</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(invoice.fee_breakdown.development_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Semester Examination & Assessment Fee</td>
                  <td className="p-3 text-center text-muted-foreground">Evaluation</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(invoice.fee_breakdown.examination_fee)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Digital Library & Technical Resources</td>
                  <td className="p-3 text-center text-muted-foreground">Resources</td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(invoice.fee_breakdown.library_fee)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-muted/40 font-bold border-t">
                <tr>
                  <td colSpan={2} className="p-3 text-sm">
                    Total Settled Amount
                  </td>
                  <td className="p-3 text-right text-base text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatCurrency(invoice.amount_paid || invoice.amount_due)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-[11px] text-muted-foreground gap-2">
            <p>
              This is an electronically validated institutional receipt generated via AcademiaCore CMS.
            </p>
            <div className="text-right font-mono">
              <span>Authorized Signature: Bursar Office</span>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden pt-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
