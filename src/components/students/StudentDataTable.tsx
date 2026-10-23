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
  Trash2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Users,
  Loader2,
  RotateCcw,
  Building2,
  BookOpen,
  Calendar,
  Layers,
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
  department_id: string;
  department_name: string;
  department_code: string;
  semester_number: number | null;
  semester_academic_year?: string | null;
  admission_date: string;
  admission_year: number;
  created_at: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

export interface CourseOption {
  id: string;
  name: string;
  code: string;
  department_id?: string;
}

export interface SemesterOption {
  id: string;
  semester_number: number;
  academic_year: string;
  course_id?: string;
}

interface StudentDataTableProps {
  initialStudents: StudentTableItem[];
  departments: DepartmentOption[];
  courses: CourseOption[];
  semesters?: SemesterOption[];
}

export function StudentDataTable({
  initialStudents,
  departments,
  courses,
  semesters = [],
}: StudentDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("all");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Available unique semester numbers from data or 1..8
  const availableSemesterNumbers = useMemo(() => {
    const semSet = new Set<number>();
    semesters.forEach((s) => semSet.add(s.semester_number));
    initialStudents.forEach((st) => {
      if (st.semester_number) semSet.add(st.semester_number);
    });
    if (semSet.size === 0) {
      return [1, 2, 3, 4, 5, 6, 7, 8];
    }
    return Array.from(semSet).sort((a, b) => a - b);
  }, [semesters, initialStudents]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedDepartmentFilter !== "all" ||
    selectedSemesterFilter !== "all" ||
    selectedCourseFilter !== "all";

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedDepartmentFilter("all");
    setSelectedSemesterFilter("all");
    setSelectedCourseFilter("all");
    setCurrentPage(1);
  };

  // Filter students based on search (name, enrollment, email) and department/semester/course
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

      const matchesDepartment =
        selectedDepartmentFilter === "all" ||
        student.department_id === selectedDepartmentFilter ||
        student.department_code.toLowerCase() === selectedDepartmentFilter.toLowerCase();

      const matchesSemester =
        selectedSemesterFilter === "all" ||
        student.semester_number === Number(selectedSemesterFilter);

      const matchesCourse =
        selectedCourseFilter === "all" ||
        student.course_id === selectedCourseFilter ||
        student.course_code.toLowerCase() === selectedCourseFilter.toLowerCase();

      return matchesSearch && matchesDepartment && matchesSemester && matchesCourse;
    });
  }, [
    initialStudents,
    searchTerm,
    selectedDepartmentFilter,
    selectedSemesterFilter,
    selectedCourseFilter,
  ]);

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
      {/* Search and Filters Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search by Name or Enrollment Number */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name, enrollment no, email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-10 shadow-sm"
            />
          </div>

          {/* Department Filter */}
          <div className="w-full sm:w-44 shrink-0">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => {
                setSelectedDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
              title="Filter by Department"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} - {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="w-full sm:w-36 shrink-0">
            <select
              value={selectedSemesterFilter}
              onChange={(e) => {
                setSelectedSemesterFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
              title="Filter by Semester"
            >
              <option value="all">All Semesters</option>
              {availableSemesterNumbers.map((semNum) => (
                <option key={semNum} value={semNum}>
                  Semester {semNum}
                </option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="w-full sm:w-40 shrink-0">
            <select
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shadow-sm"
              title="Filter by Degree Course"
            >
              <option value="all">All Programs</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllFilters}
              className="h-10 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear Filters
            </Button>
          )}
        </div>

        {/* Action Buttons: Bulk CSV Upload & Add Student */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          <BulkUploadModal courses={courses} />
          <AddStudentModal courses={courses} />
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground py-0.5">
          <span>Active criteria:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1 font-normal">
              Query: &quot;{searchTerm}&quot;
            </Badge>
          )}
          {selectedDepartmentFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Building2 className="h-3 w-3" />
              Dept: {departments.find((d) => d.id === selectedDepartmentFilter)?.code || selectedDepartmentFilter}
            </Badge>
          )}
          {selectedSemesterFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Layers className="h-3 w-3" />
              Sem {selectedSemesterFilter}
            </Badge>
          )}
          {selectedCourseFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <BookOpen className="h-3 w-3" />
              Course: {courses.find((c) => c.id === selectedCourseFilter)?.code || selectedCourseFilter}
            </Badge>
          )}
          <span className="text-[11px] font-medium text-foreground ml-1">
            ({filteredStudents.length} match{filteredStudents.length === 1 ? "" : "es"})
          </span>
        </div>
      )}

      {/* DataTable Container */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[160px]">Enrollment No.</TableHead>
              <TableHead>Student Details</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Program / Course</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Admitted</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`;

                return (
                  <TableRow key={student.id} className="hover:bg-muted/40 transition-colors">
                    {/* Enrollment Number */}
                    <TableCell className="font-mono font-semibold text-xs text-primary">
                      {student.enrollment_number}
                    </TableCell>

                    {/* Student Name & Email */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-sm leading-tight">
                          {fullName}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">{student.email}</span>
                      </div>
                    </TableCell>

                    {/* Department */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {student.department_name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {student.department_code}
                        </span>
                      </div>
                    </TableCell>

                    {/* Program / Course */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono text-[11px] font-semibold">
                          {student.course_code || "N/A"}
                        </Badge>
                      </div>
                      <span className="block text-xs text-muted-foreground mt-1 truncate max-w-[210px]">
                        {student.course_name}
                      </span>
                    </TableCell>

                    {/* Semester */}
                    <TableCell>
                      {student.semester_number ? (
                        <Badge variant="secondary" className="text-xs font-medium font-mono">
                          Sem {student.semester_number}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">Sem 1 (Init)</span>
                      )}
                    </TableCell>

                    {/* Admission Year */}
                    <TableCell className="text-xs font-mono font-medium text-muted-foreground">
                      {student.admission_year}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student.id, fullName)}
                        disabled={deletingId === student.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove Student Record"
                      >
                        {deletingId === student.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
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
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2.5 text-muted-foreground py-6">
                    <Users className="h-9 w-9 stroke-[1.5] text-muted-foreground/60" />
                    <p className="text-sm font-semibold text-foreground">No students found</p>
                    <p className="text-xs max-w-sm">
                      {hasActiveFilters
                        ? "No student records match the active search criteria or filters. Try clearing your filters."
                        : "No students are currently registered in the database. Use 'Add Student' or 'Bulk CSV Upload' to get started."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetAllFilters}
                        className="mt-2 text-xs h-8"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
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

            <div className="flex items-center gap-1.5 pl-2 border-l border-border">
              <span className="text-[11px] text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 rounded border border-input bg-background px-1.5 text-xs text-foreground focus-visible:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Numbered page pills if <= 5 pages */}
              {totalPages <= 5 &&
                Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <Button
                      key={pNum}
                      variant={currentPage === pNum ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs font-mono"
                      onClick={() => setCurrentPage(pNum)}
                    >
                      {pNum}
                    </Button>
                  );
                })}

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                title="Next Page"
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
