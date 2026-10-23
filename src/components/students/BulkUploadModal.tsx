"use client";

import React, { useState, useRef } from "react";
import { z } from "zod";
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
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import { bulkUploadStudents, BulkStudentRow } from "@/app/(admin)/students/actions";

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

interface BulkUploadModalProps {
  courses: CourseOption[];
  onSuccess?: () => void;
}

const REQUIRED_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "enrollment_number",
  "admission_year",
] as const;

// Client-side Zod Schema for Row Data Integrity
export const csvRowZodSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email format"),
  enrollment_number: z
    .string()
    .trim()
    .min(3, "Enrollment number must be at least 3 characters")
    .toUpperCase(),
  admission_year: z.coerce
    .number()
    .int()
    .min(2000, "Admission year must be >= 2000")
    .max(2035, "Admission year must be <= 2035"),
  course_code: z.string().trim().optional(),
});

interface RowValidationResult {
  rowNumber: number;
  data: BulkStudentRow;
  isValid: boolean;
  errors: string[];
}

export function BulkUploadModal({ courses, onSuccess }: BulkUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [validatedRows, setValidatedRows] = useState<RowValidationResult[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setFileName(null);
    setHeaderError(null);
    setValidatedRows([]);
    setServerError(null);
    setServerMessage(null);
    setShowOnlyInvalid(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validRows = validatedRows.filter((r) => r.isValid).map((r) => r.data);
  const invalidRows = validatedRows.filter((r) => !r.isValid);

  const parseCSVContent = (csvText: string) => {
    resetState();

    const rawLines = csvText
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length < 2) {
      setHeaderError("The CSV file must contain a column header row followed by at least one student row.");
      return;
    }

    // 1. Validate Header Row
    const headers = rawLines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

    const missingHeaders = REQUIRED_HEADERS.filter((req) => !headers.includes(req));
    if (missingHeaders.length > 0) {
      setHeaderError(
        `Zod Header Validation Error: Missing required column(s): ${missingHeaders.join(", ")}. Please include all standard headers.`
      );
      return;
    }

    const headerIndices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      headerIndices[h] = idx;
    });

    // 2. Validate Row Data Integrity with Zod
    const results: RowValidationResult[] = [];
    const seenEnrollments = new Set<string>();
    const seenEmails = new Set<string>();

    for (let i = 1; i < rawLines.length; i++) {
      const line = rawLines[i];
      // Basic CSV field parser supporting simple quoted strings
      const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      if (values.length < REQUIRED_HEADERS.length && values.every((v) => v === "")) {
        continue;
      }

      const rawRow = {
        first_name: values[headerIndices["first_name"]] || "",
        last_name: values[headerIndices["last_name"]] || "",
        email: values[headerIndices["email"]] || "",
        enrollment_number: values[headerIndices["enrollment_number"]] || "",
        admission_year: values[headerIndices["admission_year"]] || "",
        course_code:
          headerIndices["course_code"] !== undefined ? values[headerIndices["course_code"]] : undefined,
      };

      const parseResult = csvRowZodSchema.safeParse(rawRow);
      const rowErrors: string[] = [];

      if (!parseResult.success) {
        parseResult.error.issues.forEach((err) => {
          rowErrors.push(`${err.path.join(".")}: ${err.message}`);
        });
      }

      const enr = rawRow.enrollment_number.trim().toUpperCase();
      const em = rawRow.email.trim().toLowerCase();

      if (enr && seenEnrollments.has(enr)) {
        rowErrors.push(`Duplicate enrollment number within CSV: ${enr}`);
      } else if (enr) {
        seenEnrollments.add(enr);
      }

      if (em && seenEmails.has(em)) {
        rowErrors.push(`Duplicate email within CSV: ${em}`);
      } else if (em) {
        seenEmails.add(em);
      }

      results.push({
        rowNumber: i + 1,
        data: rawRow,
        isValid: rowErrors.length === 0,
        errors: rowErrors,
      });
    }

    if (results.length === 0) {
      setHeaderError("No valid data rows found in uploaded CSV.");
      return;
    }

    setValidatedRows(results);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setHeaderError("Only .csv files are supported. Please select a valid CSV.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSVContent(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setHeaderError("Only .csv files are supported. Please select a valid CSV.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSVContent(content);
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    setServerError(null);
    setServerMessage(null);

    const res = await bulkUploadStudents(validRows, selectedCourseId);

    setIsSubmitting(false);

    if (res.error) {
      setServerError(res.error);
    } else {
      setServerMessage(res.message || "Bulk import processed successfully!");
      setTimeout(() => {
        setIsOpen(false);
        resetState();
        if (onSuccess) onSuccess();
      }, 1800);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "first_name,last_name,email,enrollment_number,admission_year,course_code\n" +
      "Alice,Johnson,alice.johnson@college.edu,STU20250091,2025,BTECH-CSE\n" +
      "Bob,Smith,bob.smith@college.edu,STU20250092,2025,BTECH-ME\n" +
      "Charlie,Davis,charlie.davis@college.edu,STU20250093,2025,BTECH-CSE\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_bulk_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 shadow-sm font-medium">
          <UploadCloud className="h-4 w-4" /> Bulk CSV Upload
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UploadCloud className="h-5 w-5 text-primary" /> Batch Student Ingestion
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCSV}
              className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" /> Sample CSV
            </Button>
          </div>
          <DialogDescription>
            Import multiple students via CSV with client-side Zod validation and transaction rollback safety.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
          {/* Default Course Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80">
              Default Degree Program
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isSubmitting}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Applied automatically if an individual CSV row omits a specific <code className="font-mono">course_code</code>.
            </p>
          </div>

          {/* Header Error Alert */}
          {headerError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{headerError}</span>
            </div>
          )}

          {/* Server Error Alert (Transaction Rollback Notice) */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Batch Insertion Aborted:</span>
                <span className="leading-relaxed block">{serverError}</span>
              </div>
            </div>
          )}

          {/* Server Success Banner */}
          {serverMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{serverMessage}</span>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/10 scale-[0.99]"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Click to browse or drop CSV file here
              </div>
              <p className="text-xs text-muted-foreground">
                Required columns:{" "}
                <span className="font-mono text-foreground font-medium">
                  first_name, last_name, email, enrollment_number, admission_year
                </span>
              </p>
            </div>
          </div>

          {/* Uploaded File Bar */}
          {fileName && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-mono font-medium truncate">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px] font-mono">
                  {validatedRows.length} Rows
                </Badge>
                <button
                  type="button"
                  onClick={resetState}
                  className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Zod Validation Summary & Table Preview */}
          {validatedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Validation Integrity:</span>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {validRows.length} Valid
                  </Badge>
                  {invalidRows.length > 0 && (
                    <Badge variant="destructive" className="text-[11px]">
                      {invalidRows.length} Invalid
                    </Badge>
                  )}
                </div>

                {invalidRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyInvalid(!showOnlyInvalid)}
                    className="text-primary hover:underline text-xs"
                  >
                    {showOnlyInvalid ? "Show all rows" : `Filter ${invalidRows.length} errors`}
                  </button>
                )}
              </div>

              {/* Invalid Rows Warning Box */}
              {invalidRows.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="flex items-center gap-1.5 font-semibold text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Zod Validation Errors ({invalidRows.length} row(s) cannot be uploaded):</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                    {invalidRows.map((inv) => (
                      <li key={inv.rowNumber}>
                        <span className="font-mono text-foreground font-semibold">Row {inv.rowNumber}</span>:{" "}
                        {inv.errors.join("; ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-b flex justify-between items-center">
                  <span>Student Preview ({showOnlyInvalid ? invalidRows.length : validatedRows.length} records)</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> Transaction rollback active on batch failure
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto text-xs divide-y">
                  {(showOnlyInvalid ? invalidRows : validatedRows).map((row) => (
                    <div
                      key={row.rowNumber}
                      className={`p-2.5 flex items-center justify-between gap-3 text-xs font-mono ${
                        row.isValid ? "hover:bg-muted/30" : "bg-destructive/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] text-muted-foreground w-6">#{row.rowNumber}</span>
                        <span className="font-semibold text-foreground truncate">
                          {row.data.first_name} {row.data.last_name}
                        </span>
                      </div>
                      <span className="text-primary font-medium truncate">{row.data.enrollment_number}</span>
                      <span className="text-muted-foreground truncate hidden sm:inline">{row.data.email}</span>
                      <div>
                        {row.isValid ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
                            Invalid
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUploadSubmit}
            disabled={isSubmitting || validRows.length === 0}
            className="gap-2 min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Batch Processing...
              </>
            ) : (
              `Import ${validRows.length} Student${validRows.length === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
