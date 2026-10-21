"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Trash2,
  Loader2,
  Users,
} from "lucide-react";
import { AddStudentModal } from "./AddStudentModal";
import { BulkUploadModal } from "./BulkUploadModal";
import { deleteStudent } from "@/app/(admin)/students/actions";

export interface StudentTableItem {
  id: string;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  course_id: string;
  course_name: string;
  course_code: string;
  department_name: string;
  admission_date: string;
  admission_year: number | string;
  created_at: string;
}

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

interface StudentDataTableProps {
  initialStudents: StudentTableItem[];
  courses: CourseOption[];
}

export function StudentDataTable({ initialStudents, courses }: StudentDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter students based on search term & course filter
  const filteredStudents = useMemo(() => {
    return initialStudents.filter((student) => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const enrollment = student.enrollment_number.toLowerCase();
      const email = student.email.toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        query === "" ||
        fullName.includes(query) ||
        enrollment.includes(query) ||
        email.includes(query);

      const matchesCourse =
        selectedCourseFilter === "all" ||
        student.course_id === selectedCourseFilter ||
        student.course_code === selectedCourseFilter;

      return matchesSearch && matchesCourse;
    });
  }, [initialStudents, searchTerm, selectedCourseFilter]);

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the student roster?`)) {
      return;
    }

    setDeletingId(id);
    await deleteStudent(id);
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search, Course Filter, and Enrollment Modals */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2.5 max-w-xl">
          {/* Search bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or enrollment number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10"
            />
          </div>

          {/* Course Filter Dropdown */}
          <div className="w-full sm:w-56 shrink-0">
            <select
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">All Degree Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Modals */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <BulkUploadModal courses={courses} />
          <AddStudentModal courses={courses} />
        </div>
      </div>

      {/* Paginated Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Enrollment No.</TableHead>
              <TableHead>Student Name & Email</TableHead>
              <TableHead>Degree Course</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Admission Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`;

                return (
                  <TableRow key={student.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono font-semibold text-xs text-primary">
                      {student.enrollment_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">{fullName}</span>
                        <span className="text-xs text-muted-foreground">{student.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {student.course_code || "N/A"}
                      </Badge>
                      <span className="block text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                        {student.course_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {student.department_name}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-medium">
                      {student.admission_year}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student.id, fullName)}
                        disabled={deletingId === student.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Delete Student Record"
                      >
                        {deletingId === student.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Users className="h-8 w-8 stroke-[1.5]" />
                    <p className="text-sm font-medium">No students match your query</p>
                    <p className="text-xs">Try adjusting your search criteria or course filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{totalItems}</span> students
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
