"use client";

import React, { useState, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { login, demoLogin } from "./actions";
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
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  School,
  KeyRound,
} from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const [errorMessage, setErrorMessage] = useState<string | null>(
    urlError === "account_deactivated"
      ? "This account has been deactivated. Please contact the administrator."
      : null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeDemoRole, setActiveDemoRole] = useState<string | null>(null);

  const handleStandardLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await login(null, formData);
      if (res?.error) {
        setErrorMessage(res.error);
      }
    });
  };

  const handleDemoLogin = (role: "admin" | "faculty" | "student") => {
    setErrorMessage(null);
    setActiveDemoRole(role);

    startTransition(async () => {
      const res = await demoLogin(role);
      if (res?.error) {
        setErrorMessage(res.error);
      }
      setActiveDemoRole(null);
    });
  };

  const handleFillDemo = (email: string, pass: string) => {
    setEmailValue(email);
    setPasswordValue(pass);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Institutional Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/25 mb-1 transition-transform hover:scale-105 duration-200">
          <School className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          AcademiaCore ERP
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Comprehensive College Management & Academic Intelligence System
        </p>
      </div>

      <Card className="border border-border/80 shadow-2xl backdrop-blur-md bg-card/95 transition-all">
        <CardHeader className="space-y-1.5 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold tracking-tight">
              Portal Sign In
            </CardTitle>
            <Badge variant="outline" className="text-[11px] font-mono tracking-wide text-muted-foreground">
              Next.js 15 SSR
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Authenticate with your university email or choose a one-click demo persona.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in-50 duration-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Standard Credentials Form */}
          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
              </label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="name@college.edu"
                  required
                  disabled={isPending}
                  className="h-10 text-sm pl-3 pr-4 transition-colors focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
                </label>
                <button
                  type="button"
                  tabIndex={-1}
                  className="text-[11px] text-primary hover:underline font-medium"
                  onClick={() =>
                    setErrorMessage("For demo access, select one of the Quick Switch personas below.")
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isPending}
                  className="h-10 text-sm pl-3 pr-10 transition-colors focus-visible:ring-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2 font-medium transition-all shadow-md shadow-primary/20 hover:shadow-primary/30"
              disabled={isPending}
            >
              {isPending && !activeDemoRole ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Session...
                </>
              ) : (
                <>
                  Sign In with Credentials
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-semibold tracking-wider flex items-center gap-1.5 border border-border/60 rounded-full py-0.5 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> One-Click Demo Personas
              </span>
            </div>
          </div>

          {/* 3 Quick-Switch Demo Role Buttons */}
          <div className="grid gap-2.5">
            {/* 1. Super Admin Demo */}
            <div className="rounded-lg border border-border/70 bg-muted/20 hover:bg-accent/40 hover:border-destructive/40 transition-all p-3 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 text-destructive group-hover:scale-105 transition-transform shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Super Administrator
                    </span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      super_admin
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Full CRUD, student records &amp; fee config &bull; <span className="font-mono text-[10px]">/admin/*</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  title="Prefill form credentials"
                  onClick={() => handleFillDemo("admin@college.edu", "AdminDemo123!")}
                  disabled={isPending}
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Fill
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8 px-3 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
                  onClick={() => handleDemoLogin("admin")}
                  disabled={isPending}
                >
                  {isPending && activeDemoRole === "admin" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Launch"
                  )}
                </Button>
              </div>
            </div>

            {/* 2. Faculty Demo */}
            <div className="rounded-lg border border-border/70 bg-muted/20 hover:bg-accent/40 hover:border-sky-500/40 transition-all p-3 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Faculty Member
                    </span>
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      faculty
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Course allocations, QR attendance sessions &bull; <span className="font-mono text-[10px]">/faculty/*</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  title="Prefill form credentials"
                  onClick={() => handleFillDemo("faculty@college.edu", "FacultyDemo123!")}
                  disabled={isPending}
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Fill
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8 px-3 text-xs bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                  onClick={() => handleDemoLogin("faculty")}
                  disabled={isPending}
                >
                  {isPending && activeDemoRole === "faculty" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    "Launch"
                  )}
                </Button>
              </div>
            </div>

            {/* 3. Student Demo */}
            <div className="rounded-lg border border-border/70 bg-muted/20 hover:bg-accent/40 hover:border-emerald-500/40 transition-all p-3 flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Student Scholar
                    </span>
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">
                      student
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Attendance history, QR scan &amp; fee ledger &bull; <span className="font-mono text-[10px]">/student/*</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground hidden sm:inline-flex"
                  title="Prefill form credentials"
                  onClick={() => handleFillDemo("student@college.edu", "StudentDemo123!")}
                  disabled={isPending}
                >
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Fill
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => handleDemoLogin("student")}
                  disabled={isPending}
                >
                  {isPending && activeDemoRole === "student" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  ) : (
                    "Launch"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2 pb-4 border-t border-border/60 text-[11px] text-muted-foreground text-center flex flex-col gap-1">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Strict Role-Based Access Control enforced by Edge Middleware</span>
          </div>
          <span className="text-[10px] text-muted-foreground/80">
            Unauthorized cross-role route access is automatically intercepted and redirected.
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/40 to-background p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="w-full max-w-lg p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
