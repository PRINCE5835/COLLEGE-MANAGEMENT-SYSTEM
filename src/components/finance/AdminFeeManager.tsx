"use client";

import React, { useState, useMemo } from "react";
import {
  defineFeeStructure,
  generateSemesterInvoices,
  FeeStructureInput,
} from "@/app/(admin)/fees/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Building2,
  DollarSign,
  Calendar,
} from "lucide-react";

export interface CourseOption {
  id: string;
  name: string;
  code: string;
}

export interface SemesterOption {
  id: string;
  course_id: string;
  semester_number: number;
  academic_year: string;
}

export interface FeeStructureItem {
  id: string;
  course_id: string;
  semester_id: string;
  academic_year: string;
  tuition_fee: number;
  examination_fee: number;
  development_fee: number;
  library_fee: number;
  total_fee: number;
  course_name: string;
  course_code: string;
  semester_number: number;
}

export interface InvoiceTableItem {
  id: string;
  invoice_number: string;
  student_name: string;
  enrollment_number: string;
  course_code: string;
  amount_due: number;
  amount_paid: number;
  status: "pending" | "paid" | "overdue";
  due_date: string;
  paid_at: string | null;
  payment_reference: string | null;
}

interface AdminFeeManagerProps {
  courses: CourseOption[];
  semesters: SemesterOption[];
  initialFeeStructures: FeeStructureItem[];
  initialInvoices: InvoiceTableItem[];
}

export function AdminFeeManager({
  courses,
  semesters,
  initialFeeStructures,
  initialInvoices,
}: AdminFeeManagerProps) {
  const [activeTab, setActiveTab] = useState<"define" | "invoices">("define");

  // Form State for Fee Structure definition
  const currentYear = new Date().getFullYear();
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    semesters.find((s) => s.course_id === courses[0]?.id)?.id || semesters[0]?.id || ""
  );
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [tuitionFee, setTuitionFee] = useState<number>(2500);
  const [examFee, setExamFee] = useState<number>(150);
  const [developmentFee, setDevelopmentFee] = useState<number>(350);
  const [libraryFee, setLibraryFee] = useState<number>(100);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);

  const [isSubmittingFee, setIsSubmittingFee] = useState(false);
  const [generatingForId, setGeneratingForId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Invoices Table State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter semesters based on currently selected course in the form
  const filteredSemesters = useMemo(() => {
    const list = semesters.filter((s) => s.course_id === selectedCourseId);
    return list.length > 0 ? list : semesters;
  }, [semesters, selectedCourseId]);

  const totalFeeCalculated =
    Number(tuitionFee || 0) +
    Number(examFee || 0) +
    Number(developmentFee || 0) +
    Number(libraryFee || 0);

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amt);

  // Handle Defining / Updating a Fee Structure
  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFee(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    const payload: FeeStructureInput = {
      course_id: selectedCourseId,
      semester_id: selectedSemesterId,
      academic_year: academicYear,
      tuition_fee: Number(tuitionFee),
      examination_fee: Number(examFee),
      development_fee: Number(developmentFee),
      library_fee: Number(libraryFee),
      due_date: dueDate,
    };

    const res = await defineFeeStructure(payload);
    setIsSubmittingFee(false);

    if (res.error) {
      setActionErrorMsg(res.error);
    } else {
      setActionSuccessMsg(res.message || "Fee structure saved successfully.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // Handle 1-Click Batch Generation of Semester Invoices
  const handleTriggerInvoiceGeneration = async (
    courseId: string,
    semesterId: string,
    feeStructureKey: string
  ) => {
    setGeneratingForId(feeStructureKey);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    const res = await generateSemesterInvoices(courseId, semesterId, dueDate);
    setGeneratingForId(null);

    if (res.error) {
      setActionErrorMsg(res.error);
    } else {
      setActionSuccessMsg(res.message || "Semester invoices generated successfully.");
      setTimeout(() => setActionSuccessMsg(null), 5000);
    }
  };

  // Invoices list filter
  const filteredInvoices = useMemo(() => {
    return initialInvoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.student_name.toLowerCase().includes(q) ||
        inv.enrollment_number.toLowerCase().includes(q);

      const matchesStatus =
        selectedStatusFilter === "all" || inv.status === selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [initialInvoices, searchTerm, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Action Messages */}
      {actionSuccessMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed font-medium">{actionErrorMsg}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b pb-2">
        <Button
          variant={activeTab === "define" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("define")}
          className="gap-2 text-xs font-semibold"
        >
          <Layers className="h-3.5 w-3.5" /> Fee Structures &amp; Generation
        </Button>
        <Button
          variant={activeTab === "invoices" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("invoices")}
          className="gap-2 text-xs font-semibold"
        >
          <Receipt className="h-3.5 w-3.5" /> Institutional Invoices ({initialInvoices.length})
        </Button>
      </div>

      {activeTab === "define" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Fee Structure Definition Form */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-primary" /> Define Fee Structure
                </CardTitle>
                <CardDescription className="text-xs">
                  Configure tuition, examination fees, and due dates by academic course &amp; semester.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSaveFeeStructure}>
                <CardContent className="space-y-3.5 text-xs">
                  {/* Course & Semester Selection */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground/80">Degree Program *</label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        setSelectedCourseId(e.target.value);
                        const match = semesters.find((s) => s.course_id === e.target.value);
                        if (match) setSelectedSemesterId(match.id);
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Semester Term *</label>
                      <select
                        value={selectedSemesterId}
                        onChange={(e) => setSelectedSemesterId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {filteredSemesters.map((sem) => (
                          <option key={sem.id} value={sem.id}>
                            Semester {sem.semester_number} ({sem.academic_year})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Academic Year *</label>
                      <Input
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="2025-2026"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Fee Breakdown Inputs */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Tuition Fee ($) *</label>
                      <Input
                        type="number"
                        value={tuitionFee}
                        onChange={(e) => setTuitionFee(Number(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Exam Fee ($) *</label>
                      <Input
                        type="number"
                        value={examFee}
                        onChange={(e) => setExamFee(Number(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Campus Dev Fee ($)</label>
                      <Input
                        type="number"
                        value={developmentFee}
                        onChange={(e) => setDevelopmentFee(Number(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-foreground/80">Library Fee ($)</label>
                      <Input
                        type="number"
                        value={libraryFee}
                        onChange={(e) => setLibraryFee(Number(e.target.value))}
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-foreground/80">Payment Due Date *</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {/* Live Total Calculation */}
                  <div className="p-3 rounded-lg border bg-muted/40 flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Calculated Total Fee:</span>
                    <span className="font-extrabold text-base text-primary font-mono">
                      {formatCurrency(totalFeeCalculated)}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t flex justify-end">
                  <Button type="submit" disabled={isSubmittingFee} className="gap-2 text-xs h-9">
                    {isSubmittingFee ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Fee Structure"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Active Fee Structures & Batch Generator */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Active Fee Structures
                    </CardTitle>
                    <CardDescription className="text-xs">
                      1-click generate pending invoices for all enrolled students in the semester.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {initialFeeStructures.length} Configured
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {initialFeeStructures.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {initialFeeStructures.map((fee) => {
                      const isGenerating = generatingForId === fee.id;

                      return (
                        <div
                          key={fee.id}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs font-semibold">
                                {fee.course_code}
                              </Badge>
                              <Badge variant="secondary" className="text-xs font-mono">
                                Sem {fee.semester_number}
                              </Badge>
                              <span className="text-xs text-muted-foreground font-mono">
                                {fee.academic_year}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              Tuition: {formatCurrency(Number(fee.tuition_fee))} &bull; Exam:{" "}
                              {formatCurrency(Number(fee.examination_fee))}
                            </div>
                            <div className="text-sm font-bold text-foreground font-mono">
                              Total Assessment: {formatCurrency(Number(fee.total_fee))}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              handleTriggerInvoiceGeneration(fee.course_id, fee.semester_id, fee.id)
                            }
                            disabled={isGenerating}
                            className="gap-2 shrink-0 h-9 text-xs font-semibold shadow-sm"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Batch Invoicing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5" /> Generate Invoices
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">No fee structures defined yet</p>
                    <p>Use the form on the left to set up tuition and exam fees by course &amp; semester.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Institutional Invoices Master Ledger
                </CardTitle>
                <CardDescription className="text-xs">
                  Overview of all batch-generated student invoices, due dates, and settlement status.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice #, student, enrollment..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <select
                  value={selectedStatusFilter}
                  onChange={(e) => {
                    setSelectedStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-xs ring-offset-background"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {paginatedInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[140px]">Invoice #</TableHead>
                    <TableHead>Student Name &amp; Enrollment</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Settlement Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.map((inv) => {
                    const badgeVariant =
                      inv.status === "paid"
                        ? "success"
                        : inv.status === "overdue"
                        ? "destructive"
                        : "warning";

                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors text-xs">
                        <TableCell className="font-mono font-semibold text-primary">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{inv.student_name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {inv.enrollment_number}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {inv.course_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono font-bold">
                          {formatCurrency(inv.amount_due)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {new Date(inv.due_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant} className="text-[10px] uppercase font-semibold">
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                          {inv.payment_reference || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">No invoices match your query</p>
                <p>Generate semester invoices using the Fee Structures tab above.</p>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {filteredInvoices.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filteredInvoices.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredInvoices.length}</span>{" "}
                invoices
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 text-xs">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
