"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { generateAttendanceToken } from "@/lib/attendance/crypto";

export interface AttendanceActionResult {
  success?: boolean;
  error?: string;
  session?: {
    id: string;
    allocation_id: string;
    session_date: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    is_active: boolean;
  };
  tokenData?: {
    token: string;
    sessionId: string;
    timestamp: number;
    salt: string;
    expiresInSeconds: number;
  };
}

export async function createAttendanceSession(
  allocationId: string,
  topic?: string
): Promise<AttendanceActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required to initiate classroom session." };
  }

  // Verify subject allocation
  const { data: allocation, error: allocError } = (await (supabase
    .from("subject_allocations") as any)
    .select("id, subject_id, section, faculty_id")
    .eq("id", allocationId)
    .single()) as {
    data: { id: string; subject_id: string; section: string; faculty_id: string } | null;
    error: any;
  };

  if (allocError || !allocation) {
    return { error: "Allocated subject could not be verified." };
  }

  if (allocation.faculty_id !== user.id) {
    const { data: profile } = (await (supabase.from("profiles") as any)
      .select("role")
      .eq("id", user.id)
      .single()) as { data: { role?: string } | null };

    if (profile?.role !== "super_admin") {
      return { error: "You are not authorized to create attendance sessions for this subject." };
    }
  }

  const now = new Date();
  const startTime = now.toTimeString().split(" ")[0];
  const end = new Date(now.getTime() + 60 * 60 * 1000);
  const endTime = end.toTimeString().split(" ")[0];
  const sessionDate = now.toISOString().split("T")[0];

  // Insert session with is_active: true
  const { data: session, error: insertError } = (await (supabase
    .from("attendance_sessions") as any)
    .insert({
      allocation_id: allocation.id,
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      topic: topic?.trim() || "Class Attendance Check-in",
      is_active: true,
      created_by: user.id,
    })
    .select()
    .single()) as {
    data: {
      id: string;
      allocation_id: string;
      session_date: string;
      start_time: string;
      end_time: string;
      topic: string | null;
      is_active: boolean;
    } | null;
    error: any;
  };

  if (insertError || !session) {
    return { error: `Failed to start session: ${insertError?.message || "DB insert failed"}` };
  }

  const tokenData = generateAttendanceToken(session.id);

  revalidatePath("/faculty/attendance");
  revalidatePath("/(faculty)/attendance");

  return {
    success: true,
    session,
    tokenData,
  };
}

export async function getFreshQRToken(
  sessionId: string
): Promise<AttendanceActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized." };
  }

  const { data: session, error } = (await (supabase
    .from("attendance_sessions") as any)
    .select("id, is_active, created_by")
    .eq("id", sessionId)
    .single()) as { data: { id: string; is_active: boolean; created_by: string } | null; error: any };

  if (error || !session) {
    return { error: "Session not found." };
  }

  if (session.is_active === false) {
    return { error: "This attendance session has already been closed." };
  }

  const tokenData = generateAttendanceToken(session.id);

  return {
    success: true,
    tokenData,
  };
}

export async function endAttendanceSession(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized." };
  }

  const { error } = await (supabase.from("attendance_sessions") as any)
    .update({ is_active: false })
    .eq("id", sessionId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/faculty/attendance");
  revalidatePath("/(faculty)/attendance");

  return { success: true };
}
