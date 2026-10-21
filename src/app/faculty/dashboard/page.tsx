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
import { BookOpen, CalendarCheck, Users, QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FacultyDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userSummary = {
    id: user.id,
    email: user.email || "",
    first_name: profile?.first_name || "Faculty",
    last_name: profile?.last_name || "Member",
    role: "faculty" as const,
    avatar_url: profile?.avatar_url,
  };

  return (
    <AppShell user={userSummary}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Faculty Academic Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome, Prof. {profile?.first_name || "Faculty"}. Review your allocated subjects, trigger QR attendance sessions, and track class progress.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Allocated Classes</CardTitle>
              <BookOpen className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Subject Allocations</div>
              <p className="text-xs text-muted-foreground mt-1">Mapped by department administrators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Attendance Sessions</CardTitle>
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Dynamic QR Codes</div>
              <p className="text-xs text-muted-foreground mt-1">Generate live student check-ins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Student Enrollees</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Section Rosters</div>
              <p className="text-xs text-muted-foreground mt-1">Class roll numbers and history</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle className="text-lg">Assigned Subjects & Rosters</CardTitle>
            <CardDescription>
              Faculty can only view and update attendance for subject sessions allocated to their profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Attendance sessions created here are protected under PostgreSQL Row-Level Security ensuring no other instructor can overwrite your classroom data.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
