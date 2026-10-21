import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Database,
  GraduationCap,
  Users,
  CalendarCheck,
  ReceiptCheck,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ChevronDown,
} from "lucide-react";

export default function HomePage() {
  const tables = [
    { name: "profiles", rls: "STRICT (RBAC)", description: "Linked to auth.users, user metadata & role mapping" },
    { name: "departments", rls: "STRICT (Admin CRUD / Public Read)", description: "Academic departments & HOD leadership" },
    { name: "courses", rls: "STRICT (Admin CRUD / Public Read)", description: "Degree curricula, duration, and credit rules" },
    { name: "semesters", rls: "STRICT (Admin CRUD / Public Read)", description: "Academic terms and date ranges" },
    { name: "subjects", rls: "STRICT (Admin CRUD / Public Read)", description: "Courses, modules, credits & electives" },
    { name: "student_records", rls: "STRICT (Student Own / Faculty View)", description: "Institutional admission, enrollment, and roll info" },
    { name: "subject_allocations", rls: "STRICT (Faculty Assocs)", description: "Faculty-to-subject & section assignment" },
    { name: "attendance_sessions", rls: "STRICT (Faculty CRUD own)", description: "Classroom attendance sessions & timestamps" },
    { name: "attendance_records", rls: "STRICT (Student Own Read)", description: "Attendance records: present, absent, late" },
    { name: "fee_structures", rls: "STRICT (Admin & Accountant)", description: "Tuition, lab, exam & library fee breakdown" },
    { name: "student_invoices", rls: "STRICT (Student Own / Accountant)", description: "Billing ledger, balances & receipt reconciliation" },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">AcademiaCore CMS</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-muted-foreground font-mono">v1.0.0-enterprise</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="success" className="gap-1.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase RLS Active
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  System Roles <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>Available Personas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <Badge variant="destructive" className="text-[10px] px-1.5">Admin</Badge>
                  <span>Super Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Badge variant="info" className="text-[10px] px-1.5">Faculty</Badge>
                  <span>Professor / Teacher</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5">Student</Badge>
                  <span>Student Portal</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Badge variant="warning" className="text-[10px] px-1.5">Finance</Badge>
                  <span>Accountant</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <a href="/login">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Portal Login &rarr;
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 sm:px-8 pt-12 pb-8">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Next.js 15 App Router &bull; Supabase RBAC Architecture
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
            Enterprise College Management System
          </h1>
          <p className="text-lg text-muted-foreground">
            Production-grade database schema, strict Row Level Security (RLS) policies, Next.js 15 SSR integration, and fully typed shadcn/ui design system.
          </p>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="container px-4 sm:px-8 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Database Tables
              </CardTitle>
              <Database className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">11</div>
              <p className="text-xs text-muted-foreground mt-1">100% RLS Enabled with indexes</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Role Matrix
              </CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4 Roles</div>
              <p className="text-xs text-muted-foreground mt-1">Super Admin, Faculty, Student, Accountant</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Attendance Tracking
              </CardTitle>
              <CalendarCheck className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">QR & Manual</div>
              <p className="text-xs text-muted-foreground mt-1">Session-level faculty allocation checks</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Financial Ledger
              </CardTitle>
              <ReceiptCheck className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">Invoices & Fees</div>
              <p className="text-xs text-muted-foreground mt-1">Generated columns & audit timestamps</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Main Content: Database Schema Table & Interactive Components */}
      <section className="container px-4 sm:px-8 py-6 space-y-8">
        {/* Schema Table */}
        <Card className="border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Supabase Schema Architecture</CardTitle>
                <CardDescription>
                  Comprehensive relational data model configured in <code className="text-primary font-mono text-xs">supabase/schema.sql</code>
                </CardDescription>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2">
                    <Terminal className="h-4 w-4" /> Quick Setup Guide
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Deploying the Schema in Supabase</DialogTitle>
                    <DialogDescription>
                      Follow these 3 quick steps to run the complete SQL script.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm mt-2">
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs space-y-2">
                      <p className="font-semibold text-foreground">1. Open Supabase Dashboard &rarr; SQL Editor</p>
                      <p className="font-semibold text-foreground">2. Paste content from: <span className="text-primary">supabase/schema.sql</span></p>
                      <p className="font-semibold text-foreground">3. Click "RUN" to apply tables, indexes, triggers & RLS</p>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      The script creates all enums, tables, b-tree indexes, anti-recursion helper functions (<code className="text-foreground">is_super_admin()</code>, <code className="text-foreground">get_current_student_id()</code>), and auth hooks automatically.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Table Name</TableHead>
                  <TableHead>RLS Status</TableHead>
                  <TableHead>Description & Purpose</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.name}>
                    <TableCell className="font-mono font-medium text-primary">
                      {table.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                        {table.rls}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs sm:text-sm">
                      {table.description}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="cursor-pointer hover:bg-muted text-[11px]">
                        Inspect
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Component Showcase Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Design System & Form Primitives</CardTitle>
              <CardDescription>
                shadcn/ui Button, Input, and Badges styled for high-density academic administrative workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Search Student Enrollment / Roll Number</label>
                <div className="flex gap-2">
                  <Input placeholder="e.g. STU20250001 or John Doe..." />
                  <Button variant="default">Search</Button>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Present</Badge>
                <Badge variant="warning">Late</Badge>
                <Badge variant="destructive">Absent</Badge>
                <Badge variant="info">Semester 4</Badge>
                <Badge variant="outline">Elective</Badge>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              Validated with Zod &amp; React Hook Form ready.
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Environment Setup Status</CardTitle>
              <CardDescription>
                Review credentials configured in <code className="text-primary font-mono text-xs">.env.local.example</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40">
                <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL</span>
                <Badge variant="outline" className="text-[10px]">CONFIGURED IN EXAMPLE</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40">
                <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                <Badge variant="outline" className="text-[10px]">CONFIGURED IN EXAMPLE</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/40">
                <span className="text-muted-foreground">SUPABASE_SERVICE_ROLE_KEY</span>
                <Badge variant="destructive" className="text-[10px]">SERVER ONLY</Badge>
              </div>
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground border-t pt-4">
              TypeScript types exported in <span className="font-mono text-foreground ml-1">src/types/database.ts</span>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
}
