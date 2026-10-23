"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/utils/supabase/client";
import {
  createAttendanceSession,
  getFreshQRToken,
  endAttendanceSession,
} from "@/app/(faculty)/attendance/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  StopCircle,
  Radio,
  Volume2,
} from "lucide-react";

export interface SubjectAllocationOption {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  course_name: string;
  section: string;
  academic_year: string;
}

export interface LiveAttendee {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  marked_at: string;
  status: string;
}

interface FacultySessionManagerProps {
  allocations: SubjectAllocationOption[];
}

export function FacultySessionManager({ allocations }: FacultySessionManagerProps) {
  const [selectedAllocationId, setSelectedAllocationId] = useState(
    allocations[0]?.id || ""
  );
  const [topic, setTopic] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<{
    id: string;
    topic: string | null;
    subjectName: string;
    section: string;
  } | null>(null);

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(15);
  const [attendees, setAttendees] = useState<LiveAttendee[]>([]);
  const [lastScanAlert, setLastScanAlert] = useState<string | null>(null);

  const supabase = createClient();
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeSessionRef = useRef<{ id: string } | null>(null);

  activeSessionRef.current = activeSession;

  const fetchNewToken = useCallback(async (sessionId: string) => {
    const res = await getFreshQRToken(sessionId);
    if (res.tokenData) {
      setQrToken(res.tokenData.token);
      setCountdown(15);
    }
  }, []);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAllocationId) return;

    setIsStarting(true);
    setErrorMsg(null);

    const alloc = allocations.find((a) => a.id === selectedAllocationId);
    const res = await createAttendanceSession(selectedAllocationId, topic);

    setIsStarting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.session && res.tokenData) {
      setActiveSession({
        id: res.session.id,
        topic: res.session.topic,
        subjectName: alloc?.subject_name || "Class Session",
        section: alloc?.section || "A",
      });
      setQrToken(res.tokenData.token);
      setCountdown(15);
      setAttendees([]);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!confirm("Are you sure you want to end this attendance session? Students will no longer be able to check in.")) {
      return;
    }

    const sessionId = activeSession.id;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setActiveSession(null);
    setQrToken(null);
    setAttendees([]);
    await endAttendanceSession(sessionId);
  };

  // 15-Second Countdown and Regenerating Salted Cryptographic QR Payload
  useEffect(() => {
    if (!activeSession) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    const sessionId = activeSession.id;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken(sessionId);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [activeSession, fetchNewToken]);

  // Realtime Live Attendee Feed via supabase.channel('public:attendance_records')
  useEffect(() => {
    if (!activeSession) return;

    const currentSessionId = activeSession.id;

    // Load initial attendees for this session
    const loadExistingAttendees = async () => {
      const { data: records } = (await (supabase.from("attendance_records") as any)
        .select(`
          id,
          student_id,
          status,
          marked_at,
          student:student_records (
            enrollment_number,
            profile:profiles (first_name, last_name)
          )
        `)
        .eq("session_id", currentSessionId)
        .order("marked_at", { ascending: false })) as { data: any[] | null };

      if (records) {
        const formatted: LiveAttendee[] = records.map((r: any) => {
          const profile = r.student?.profile;
          const name = profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
            : "Student";
          return {
            id: r.id,
            student_id: r.student_id,
            student_name: name || "Student",
            enrollment_number: r.student?.enrollment_number || "—",
            marked_at: r.marked_at,
            status: r.status,
          };
        });
        setAttendees(formatted);
      }
    };

    loadExistingAttendees();

    // Subscribe to public:attendance_records channel as requested
    const channel = supabase
      .channel("public:attendance_records")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_records",
          filter: `session_id=eq.${currentSessionId}`,
        },
        async (payload) => {
          const newRecord = payload.new as {
            id: string;
            student_id: string;
            status: string;
            marked_at: string;
          };

          // Fetch student name & enrollment for display
          const { data: student } = (await (supabase
            .from("student_records") as any)
            .select(`
              id,
              enrollment_number,
              profile:profiles (first_name, last_name)
            `)
            .eq("id", newRecord.student_id)
            .single()) as { data: any | null };

          const studentData = student as any;
          const studentName = studentData?.profile
            ? `${studentData.profile.first_name || ""} ${studentData.profile.last_name || ""}`.trim()
            : "Student";

          const newAttendee: LiveAttendee = {
            id: newRecord.id,
            student_id: newRecord.student_id,
            student_name: studentName,
            enrollment_number: studentData?.enrollment_number || "—",
            marked_at: newRecord.marked_at,
            status: newRecord.status,
          };

          setAttendees((prev) => {
            // Avoid duplicate additions
            if (prev.some((a) => a.id === newAttendee.id)) return prev;
            return [newAttendee, ...prev];
          });

          setLastScanAlert(`${studentName} marked attendance!`);
          setTimeout(() => setLastScanAlert(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession, supabase]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {!activeSession ? (
        <Card className="max-w-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Start Attendance Session
            </CardTitle>
            <CardDescription>
              Select your assigned subject to generate dynamic, anti-proxy QR codes with cryptographic 15-second rotation.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleStartSession}>
            <CardContent className="space-y-4">
              {allocations.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted text-center text-xs text-muted-foreground">
                  No subject allocations found for your profile. Please check with the administrator.
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Assigned Subject & Section <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={selectedAllocationId}
                      onChange={(e) => setSelectedAllocationId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {allocations.map((alloc) => (
                        <option key={alloc.id} value={alloc.id}>
                          {alloc.subject_code} - {alloc.subject_name} (Sec {alloc.section} &bull; {alloc.course_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground/80">
                      Topic / Lesson Objective (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Lecture 04: Relational Algebra & SQL Normalization"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="pt-2 border-t flex justify-end">
              <Button
                type="submit"
                disabled={isStarting || allocations.length === 0}
                className="gap-2 min-w-[170px]"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Launching...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4" /> Start Active Session
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Dynamic Anti-Proxy QR Code Display */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-2 border-primary/20 shadow-lg text-center overflow-hidden">
              <CardHeader className="pb-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Badge variant="success" className="gap-1.5 text-[11px] py-0.5">
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    Live Session Active
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEndSession}
                    className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2.5 gap-1"
                  >
                    <StopCircle className="h-3.5 w-3.5" /> End Session
                  </Button>
                </div>

                <CardTitle className="text-lg mt-2 font-bold text-foreground">
                  {activeSession.subjectName}
                </CardTitle>
                <CardDescription className="text-xs">
                  Section {activeSession.section} &bull; {activeSession.topic || "Classroom Check-in"}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 pb-4 flex flex-col items-center">
                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200">
                  {qrToken ? (
                    <QRCodeSVG
                      value={qrToken}
                      size={240}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="h-60 w-60 flex items-center justify-center text-xs text-slate-400">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </div>

                {/* 15-Second Countdown and Progress Bar */}
                <div className="w-full max-w-xs mt-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Token expires in:
                    </span>
                    <span className="font-bold text-primary font-mono text-sm">
                      {countdown}s
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        countdown <= 3 ? "bg-amber-500" : "bg-primary"
                      }`}
                      style={{ width: `${(countdown / 15) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground mt-4 max-w-xs leading-relaxed">
                  Cryptographically regenerates with salted HMAC every 15s to neutralize proxy attendance and screenshot forwarding.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Realtime Live Attendee Feed */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border shadow-sm flex flex-col h-[520px]">
              <CardHeader className="border-b pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> Live Attendee Feed
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Synchronized via Supabase Realtime channel (public:attendance_records)
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-semibold">
                    {attendees.length} Present
                  </Badge>
                </div>

                {lastScanAlert && (
                  <div className="mt-2 py-1 px-2.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{lastScanAlert}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-y-auto">
                {attendees.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {attendees.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-top-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground">
                              {attendee.student_name}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {attendee.enrollment_number}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant="success" className="text-[10px]">
                            {attendee.status}
                          </Badge>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {new Date(attendee.marked_at).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <QrCode className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Waiting for students to scan...</p>
                    <p className="text-xs max-w-xs leading-relaxed">
                      Students open their portal camera at <code className="font-mono text-primary font-semibold">/scan</code> to check in.
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="py-2.5 px-4 border-t bg-muted/10 text-[11px] text-muted-foreground flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Realtime channel active
                </span>
                <span className="font-mono text-[10px]">
                  ID: {activeSession.id.slice(0, 8)}...
                </span>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
