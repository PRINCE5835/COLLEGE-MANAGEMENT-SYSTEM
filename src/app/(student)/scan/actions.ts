"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { verifyAttendanceToken } from "@/lib/attendance/crypto";

export interface ScanResult {
  success?: boolean;
  error?: string;
  message?: string;
  sessionDetails?: {
    subjectName: string;
    subjectCode: string;
    sessionDate: string;
    markedAt: string;
  };
}

export interface MarkAttendanceParams {
  token: string;
  sessionId?: string;
}

/**
 * Server Action: Validates dynamic QR attendance token and registers student presence.
 * - Ensures session exists and is active.
 * - Verifies token timestamp has not expired (> 15 seconds).
 * - Verifies the logged-in student has not already marked attendance for this session.
 * - Inserts into attendance_records with status 'present'.
 */
export async function markAttendanceAction({
  token,
  sessionId: providedSessionId,
}: MarkAttendanceParams): Promise<ScanResult> {
  if (!token || typeof token !== "string") {
    return { error: "QR code payload is missing or invalid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required. Please log into your student account." };
  }

  // 1. Verify Token Cryptographic Signature & Expiry (< 15 seconds)
  const verification = verifyAttendanceToken(token, providedSessionId);
  if (!verification.valid || !verification.sessionId) {
    return { error: verification.error || "Invalid or expired QR token." };
  }

  const targetSessionId = verification.sessionId;

  // 2. Fetch logged-in student's institutional record
  const { data: studentRecord, error: studentError } = (await (supabase
    .from("student_records") as any)
    .select("id, profile_id, enrollment_number, course_id")
    .eq("profile_id", user.id)
    .single()) as {
    data: { id: string; profile_id: string; enrollment_number: string; course_id: string } | null;
    error: any;
  };

  if (studentError || !studentRecord) {
    return {
      error: "No active student registration found for this user profile. Please contact the administrator.",
    };
  }

  // 3. Ensure Session Exists and is Active
  const { data: sessionData, error: sessionError } = (await (supabase
    .from("attendance_sessions") as any)
    .select(`
      id,
      session_date,
      is_active,
      allocation:subject_allocations (
        subject:subjects (
          name,
          code
        )
      )
    `)
    .eq("id", targetSessionId)
    .single()) as { data: any | null; error: any };

  if (sessionError || !sessionData) {
    return { error: "Classroom attendance session not found." };
  }

  if (sessionData.is_active === false) {
    return { error: "This attendance session has already been closed by the faculty." };
  }

  // 4. Verify Student Has Not Already Marked Attendance
  const { data: existingRecord } = (await (supabase
    .from("attendance_records") as any)
    .select("id, status, marked_at")
    .eq("session_id", targetSessionId)
    .eq("student_id", studentRecord.id)
    .maybeSingle()) as { data: { id: string; status: string; marked_at: string } | null };

  if (existingRecord) {
    return {
      error: `Attendance already recorded as '${existingRecord.status}' at ${new Date(
        existingRecord.marked_at
      ).toLocaleTimeString()}.`,
    };
  }

  // 5. Insert into attendance_records with status 'present'
  const markedAt = new Date().toISOString();
  const { error: insertError } = await (supabase
    .from("attendance_records") as any)
    .insert({
      session_id: targetSessionId,
      student_id: studentRecord.id,
      status: "present",
      marked_at: markedAt,
    });

  if (insertError) {
    return {
      error: `Failed to record presence: ${insertError.message}`,
    };
  }

  revalidatePath("/student/dashboard");
  revalidatePath("/student/attendance");
  revalidatePath("/(student)/scan");

  const sessionObj = sessionData as any;
  const subjectName = sessionObj?.allocation?.subject?.name || "Class Session";
  const subjectCode = sessionObj?.allocation?.subject?.code || "SUBJ";

  return {
    success: true,
    message: "Attendance verified and recorded successfully!",
    sessionDetails: {
      subjectName,
      subjectCode,
      sessionDate: sessionData.session_date,
      markedAt,
    },
  };
}

// Wrapper for single string param backward compatibility
export async function markAttendanceFromQR(qrToken: string): Promise<ScanResult> {
  return markAttendanceAction({ token: qrToken });
}
