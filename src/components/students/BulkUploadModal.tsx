"use client";

import React, { useState, useRef } from "react";
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
];

export function BulkUploadModal({ courses, onSuccess }: BulkUploadModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkStudentRow[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setFileName(null);
    setParsedRows([]);
    setValidationError(null);
    setServerMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText
      .split(/\r\n|\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      setValidationError("The uploaded CSV must contain a header row and at least one student record.");
      return;
    }

    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    // Validate headers
    const missingHeaders = REQUIRED_HEADERS.filter((req) => !headers.includes(req));
    if (missingHeaders.length > 0) {
      setValidationError(
        `Missing required CSV column headers: ${missingHeaders.join(", ")}. Please check your file format.`
      );
      return;
    }

    const headerIndices: Record<string, number> = {};
    headers.forEach((h, idx) => {
      headerIndices[h] = idx;
    });

    const parsed: BulkStudentRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
      if (values.length < REQUIRED_HEADERS.length) continue;

      parsed.push({
        first_name: values[headerIndices["first_name"]],
        last_name: values[headerIndices["last_name"]],
        email: values[headerIndices["email"]],
        enrollment_number: values[headerIndices["enrollment_number"]],
        admission_year: values[headerIndices["admission_year"]],
        course_code: headerIndices["course_code"] !== undefined ? values[headerIndices["course_code"]] : undefined,
      });
    }

    if (parsed.length === 0) {
      setValidationError("No valid student rows could be parsed from the CSV.");
      return;
    }

    setParsedRows(parsed);
    setValidationError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setValidationError("Please upload a valid .csv file.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setValidationError("Please upload a valid .csv file.");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    setValidationError(null);
    setServerMessage(null);

    const res = await bulkUploadStudents(parsedRows, selectedCourseId);

    setIsSubmitting(false);

    if (res.error) {
      setValidationError(res.error);
    } else {
      setServerMessage(res.message || "Bulk import completed!");
      setTimeout(() => {
        setIsOpen(false);
        resetState();
        if (onSuccess) onSuccess();
      }, 2000);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent =
      "first_name,last_name,email,enrollment_number,admission_year,course_code\n" +
      "Alice,Smith,alice.smith@college.edu,STU2025001,2025,BTECH-CS\n" +
      "Bob,Johnson,bob.j@college.edu,STU2025002,2025,BTECH-CS\n" +
      "Charlie,Brown,charlie.b@college.edu,STU2025003,2025,BTECH-CS";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_bulk_template.csv");
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
        <Button variant="outline" className="gap-2">
          <UploadCloud className="h-4 w-4" /> Bulk Upload CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Batch Student Enrollment
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={downloadSampleCSV}
              className="text-xs text-primary gap-1.5 h-8"
            >
              <Download className="h-3.5 w-3.5" /> Sample CSV
            </Button>
          </div>
          <DialogDescription>
            Import multiple students simultaneously via CSV format.
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {serverMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverMessage}</span>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Target Course Select */}
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
              Used if student rows do not specify an individual <code className="font-mono">course_code</code>.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-primary/50 hover:bg-muted/30"
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
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Click to browse or drag & drop CSV file
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                Headers required: <span className="font-mono text-foreground font-semibold">first_name, last_name, email, enrollment_number, admission_year</span>
              </p>
            </div>
          </div>

          {/* Parsed Preview File Details */}
          {fileName && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-mono truncate">{fileName}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {parsedRows.length} Records Found
                </Badge>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="text-muted-foreground hover:text-foreground p-1"
                title="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Preview Table for first 3 rows */}
          {parsedRows.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b flex justify-between">
                <span>Data Sample Preview</span>
                <span>Showing first {Math.min(parsedRows.length, 3)} of {parsedRows.length} rows</span>
              </div>
              <div className="max-h-32 overflow-y-auto text-xs divide-y">
                {parsedRows.slice(0, 3).map((row, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between gap-4 font-mono">
                    <span className="font-semibold text-foreground truncate">
                      {row.first_name} {row.last_name}
                    </span>
                    <span className="text-primary truncate">{row.enrollment_number}</span>
                    <span className="text-muted-foreground truncate">{row.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
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
            disabled={isSubmitting || parsedRows.length === 0}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Batch Processing...
              </>
            ) : (
              `Import ${parsedRows.length > 0 ? `${parsedRows.length} Students` : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
