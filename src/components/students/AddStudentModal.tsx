"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addStudentSchema, AddStudentInput, createStudent } from "@/app/(admin)/students/actions";
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
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

interface AddStudentModalProps {
  courses: CourseOption[];
  onSuccess?: () => void;
}

export function AddStudentModal({ courses, onSuccess }: AddStudentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddStudentInput>({
    resolver: zodResolver(addStudentSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      enrollment_number: "",
      course_id: courses[0]?.id || "",
      admission_year: currentYear,
    },
  });

  const onSubmit = async (data: AddStudentInput) => {
    setServerError(null);
    setSuccessMessage(null);

    const res = await createStudent(data);

    if (res.error) {
      setServerError(res.error);
    } else {
      setSuccessMessage(res.message || "Student enrolled successfully!");
      reset();
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage(null);
        if (onSuccess) onSuccess();
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Student
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Single Student Enrollment
          </DialogTitle>
          <DialogDescription>
            Provision student credentials and bind them to an academic program.
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. John"
                {...register("first_name")}
                disabled={isSubmitting}
              />
              {errors.first_name && (
                <p className="text-[11px] text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Doe"
                {...register("last_name")}
                disabled={isSubmitting}
              />
              {errors.last_name && (
                <p className="text-[11px] text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Email & Enrollment */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="john.doe@college.edu"
                {...register("email")}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-[11px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Enrollment Number <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. STU2025001"
                {...register("enrollment_number")}
                disabled={isSubmitting}
              />
              {errors.enrollment_number && (
                <p className="text-[11px] text-destructive">
                  {errors.enrollment_number.message}
                </p>
              )}
            </div>
          </div>

          {/* Course & Admission Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Degree Course <span className="text-destructive">*</span>
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("course_id")}
                disabled={isSubmitting}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
              {errors.course_id && (
                <p className="text-[11px] text-destructive">{errors.course_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">
                Admission Year <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                placeholder={String(currentYear)}
                {...register("admission_year")}
                disabled={isSubmitting}
              />
              {errors.admission_year && (
                <p className="text-[11px] text-destructive">
                  {errors.admission_year.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enrolling...
                </>
              ) : (
                "Enroll Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
