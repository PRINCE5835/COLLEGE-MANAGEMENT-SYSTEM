import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  CalendarCheck,
  Receipt,
  QrCode,
  BookOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = (await (supabase.from("profiles") as any)
    .select("*")
    .eq("id", user.id)
    .single()) as { data: { first_name?: string; last_name?: string; role?: string; avatar_url?: string } | null };

  const { data: studentRecord } = (await (supabase.from("student_records") as any)
    .select("*, course:courses(name, code), department:departments(name)")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: any | null };

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Student",
    last_name: profile?.last_name || "Portal",
    role: "student" as const,
    avatar_url: profile?.avatar_url,
  };

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {profile?.first_name || "Student"}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enrollment ID: <span className="font-mono font-medium text-foreground">{studentRecord?.enrollment_number || "STU-PENDING"}</span> &bull; Program: <span className="text-foreground">{studentRecord?.course?.name || "B.Tech Computer Science"}</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">My Attendance</CardTitle>
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Personal Ledger</div>
              <p className="text-xs text-muted-foreground mt-1">Secure student-isolated records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Fee Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Payment Receipts</div>
              <p className="text-xs text-muted-foreground mt-1">Tuition, lab, and exam dues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">QR Check-in</CardTitle>
              <QrCode className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Scan to Attend</div>
              <p className="text-xs text-muted-foreground mt-1">Instant session presence validation</p>
              <a href="/student/scan">
                <Button size="sm" className="mt-3 w-full gap-1.5 text-xs">
                  <QrCode className="h-3.5 w-3.5" /> Launch Camera Scanner
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg">Student Isolation Enforced</CardTitle>
            <CardDescription>
              Protected by Next.js 15 SSR Middleware and Supabase RLS security policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Your attendance records, personal invoices, and academic marks are sealed with strict security policies. Attempts to access administrative routes (<code className="text-foreground font-mono">/admin/*</code>) are immediately blocked.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
