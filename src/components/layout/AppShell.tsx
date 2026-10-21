"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/types/database";
import { signOut } from "@/app/(auth)/login/actions";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Receipt,
  BookOpen,
  CalendarCheck,
  QrCode,
  LogOut,
  Menu,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface UserProfileSummary {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  avatar_url?: string | null;
}

interface AppShellProps {
  user: UserProfileSummary;
  children: React.ReactNode;
}

// Navigation structure dynamically filtered per role
const ROLE_NAVIGATION: Record<UserRole, NavItem[]> = {
  super_admin: [
    { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Students", href: "/admin/students", icon: Users },
    { title: "Faculty", href: "/admin/faculty", icon: UserCheck },
    { title: "Departments", href: "/admin/departments", icon: Building2 },
    { title: "Invoices", href: "/admin/invoices", icon: Receipt },
  ],
  faculty: [
    { title: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
    { title: "My Classes", href: "/faculty/classes", icon: BookOpen },
    { title: "Attendance Session", href: "/faculty/attendance", icon: CalendarCheck },
  ],
  student: [
    { title: "Overview", href: "/student/dashboard", icon: LayoutDashboard },
    { title: "My Attendance", href: "/student/attendance", icon: CalendarCheck },
    { title: "Fee Receipts", href: "/student/invoices", icon: Receipt },
  ],
  accountant: [
    { title: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Invoices & Fees", href: "/admin/invoices", icon: Receipt },
    { title: "Students", href: "/admin/students", icon: Users },
  ],
};

const ROLE_BADGE_CONFIG: Record<UserRole, { label: string; variant: "default" | "destructive" | "secondary" | "success" | "warning" | "info" }> = {
  super_admin: { label: "Super Admin", variant: "destructive" },
  faculty: { label: "Faculty", variant: "info" },
  student: { label: "Student", variant: "success" },
  accountant: { label: "Accountant", variant: "warning" },
};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme from document or localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const navItems = ROLE_NAVIGATION[user.role] || ROLE_NAVIGATION.student;
  const badgeConfig = ROLE_BADGE_CONFIG[user.role] || { label: "User", variant: "secondary" };
  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name || ""}`.trim()
    : user.email.split("@")[0];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* 1. Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card/60 backdrop-blur-sm transition-all duration-300 relative z-30",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center px-4 border-b justify-between">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <GraduationCap className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight truncate">AcademiaCore</span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">Enterprise CMS</span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Role Persona Tag */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Access Level</span>
            <Badge variant={badgeConfig.variant} className="text-[10px] font-medium">
              {badgeConfig.label}
            </Badge>
          </div>
        )}

        {/* Dynamic Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
                title={isCollapsed ? item.title : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-105",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Mini Footer */}
        <div className="p-3 border-t bg-muted/10">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg bg-card border",
              isCollapsed && "justify-center p-1.5"
            )}
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20">
              {displayName.charAt(0)}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate leading-tight">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 h-16 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Sheet Menu Trigger */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col">
                <SheetHeader className="h-16 px-6 border-b flex flex-row items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <SheetTitle className="text-base font-bold">AcademiaCore</SheetTitle>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">Enterprise CMS</span>
                  </div>
                </SheetHeader>

                <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Portal Role</span>
                  <Badge variant={badgeConfig.variant} className="text-[10px]">
                    {badgeConfig.label}
                  </Badge>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-4 border-t">
                  <form action={signOut}>
                    <Button variant="destructive" className="w-full gap-2">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>

            <span className="text-sm font-semibold text-muted-foreground hidden sm:inline-block">
              Institutional Management Portal
            </span>
          </div>

          {/* Right Action Icons: Theme Toggle & Profile Dropdown */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Profile Menu & Working Logout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full border bg-background hover:bg-muted/60 transition-colors">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {displayName.charAt(0)}
                  </div>
                  <span className="text-xs font-medium max-w-[120px] truncate hidden sm:inline-block">
                    {displayName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Active Role:</span>
                  <Badge variant={badgeConfig.variant} className="text-[10px]">
                    {badgeConfig.label}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-sm cursor-pointer transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
