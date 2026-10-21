"use client";

import React, { useState, useTransition } from "react";
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
  Shield,
  BookOpen,
  User,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-1">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AcademiaCore CMS
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access your institutional academic portal
          </p>
        </div>

        {/* Main Login Card */}
        <Card className="border shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Authentication</CardTitle>
            <CardDescription>
              Enter your college credentials or select a one-click demo persona
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleStandardLogin} className="space-y-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@college.edu"
                  required
                  disabled={isPending}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
                  </label>
                  <a
                    href="#"
                    className="text-xs text-primary hover:underline font-medium"
                    tabIndex={-1}
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  required
                  disabled={isPending}
                  className="h-10"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 mt-2 font-medium"
                disabled={isPending}
              >
                {isPending && !activeDemoRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                  </>
                ) : (
                  "Sign In with Credentials"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2.5 text-muted-foreground font-semibold tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Recruiter & Demo Access
                </span>
              </div>
            </div>

            {/* 3 Quick Demo Login Buttons */}
            <div className="grid gap-2.5">
              {/* Super Admin */}
              <button
                type="button"
                onClick={() => handleDemoLogin("admin")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-accent hover:border-primary/40 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/15 text-destructive group-hover:scale-105 transition-transform">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Super Admin Demo
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Full system CRUD &bull; <span className="font-mono">/admin/*</span>
                    </div>
                  </div>
                </div>
                {isPending && activeDemoRole === "admin" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                    Admin
                  </Badge>
                )}
              </button>

              {/* Faculty */}
              <button
                type="button"
                onClick={() => handleDemoLogin("faculty")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-accent hover:border-primary/40 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Faculty Member Demo
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Attendance & Rosters &bull; <span className="font-mono">/faculty/*</span>
                    </div>
                  </div>
                </div>
                {isPending && activeDemoRole === "faculty" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge variant="info" className="text-[10px] px-2 py-0.5">
                    Faculty
                  </Badge>
                )}
              </button>

              {/* Student */}
              <button
                type="button"
                onClick={() => handleDemoLogin("student")}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-accent hover:border-primary/40 transition-all text-left group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Student Portal Demo
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Attendance & Invoices &bull; <span className="font-mono">/student/*</span>
                    </div>
                  </div>
                </div>
                {isPending && activeDemoRole === "student" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Badge variant="success" className="text-[10px] px-2 py-0.5">
                    Student
                  </Badge>
                )}
              </button>
            </div>
          </CardContent>

          <CardFooter className="pt-2 pb-5 border-t text-[11px] text-muted-foreground text-center flex flex-col gap-1">
            <span>Next.js 15 SSR Middleware strictly validates sessions and enforces RBAC isolation.</span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
