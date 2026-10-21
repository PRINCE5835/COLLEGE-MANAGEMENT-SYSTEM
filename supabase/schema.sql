-- ==============================================================================
-- ENTERPRISE COLLEGE MANAGEMENT SYSTEM (CMS) - SUPABASE DATABASE SCHEMA
-- Version: 1.0.0
-- Architecture: Multi-Role RBAC (Super Admin, Faculty, Student, Accountant)
-- Description: Complete production schema with Tables, Enums, Indexes,
--              Row-Level Security (RLS) policies, and Auth Triggers.
-- ==============================================================================

-- 0. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CUSTOM ENUMS
-- ==============================================================================
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('super_admin', 'faculty', 'student', 'accountant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. HELPER FUNCTIONS FOR TIMESTAMPS & RBAC (Prevents RLS Recursion)
-- ==============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optimized security definer functions to inspect roles without recursive RLS lookups
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'faculty'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'accountant'::public.user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.student_records WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- ==============================================================================
-- 3. CORE APPLICATION TABLES
-- ==============================================================================

-- 3.1 PROFILES (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'student',
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.2 DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  head_of_department_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.3 COURSES (Degree programs under a department)
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  duration_years integer NOT NULL DEFAULT 4 CHECK (duration_years > 0),
  total_semesters integer NOT NULL DEFAULT 8 CHECK (total_semesters > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.4 SEMESTERS (Academic terms per course)
CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_number integer NOT NULL CHECK (semester_number >= 1),
  academic_year text NOT NULL, -- e.g. '2025-2026'
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sem_dates CHECK (end_date >= start_date),
  CONSTRAINT uq_course_semester_year UNIQUE (course_id, semester_number, academic_year)
);

-- 3.5 SUBJECTS (Modules taught in a course/semester)
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  semester_number integer NOT NULL CHECK (semester_number >= 1),
  credits integer NOT NULL DEFAULT 3 CHECK (credits > 0),
  is_elective boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.6 STUDENT RECORDS (Official academic & institutional data)
CREATE TABLE IF NOT EXISTS public.student_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrollment_number text NOT NULL UNIQUE,
  roll_number text,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  current_semester_id uuid REFERENCES public.semesters(id) ON DELETE SET NULL,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  blood_group text,
  guardian_name text,
  guardian_phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.7 SUBJECT ALLOCATIONS (Faculty assigned to subject/semester/section)
CREATE TABLE IF NOT EXISTS public.subject_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  section text NOT NULL DEFAULT 'A',
  academic_year text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_allocation UNIQUE (subject_id, faculty_id, semester_id, section, academic_year)
);

-- 3.8 ATTENDANCE SESSIONS (Class session created by faculty)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL REFERENCES public.subject_allocations(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time NOT NULL,
  end_time time NOT NULL,
  topic text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_session_times CHECK (end_time > start_time)
);

-- 3.9 ATTENDANCE RECORDS (Student attendance per session)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_records(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  remarks text,
  marked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

-- 3.10 FEE STRUCTURES (Course & semester fee definition)
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  academic_year text NOT NULL,
  tuition_fee numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (tuition_fee >= 0),
  development_fee numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (development_fee >= 0),
  examination_fee numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (examination_fee >= 0),
  library_fee numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (library_fee >= 0),
  total_fee numeric(12, 2) GENERATED ALWAYS AS (tuition_fee + development_fee + examination_fee + library_fee) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fee_course_sem_year UNIQUE (course_id, semester_id, academic_year)
);

-- 3.11 STUDENT INVOICES (Billing, fee tracking, and payment receipts)
CREATE TABLE IF NOT EXISTS public.student_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  student_id uuid NOT NULL REFERENCES public.student_records(id) ON DELETE CASCADE,
  fee_structure_id uuid NOT NULL REFERENCES public.fee_structures(id) ON DELETE RESTRICT,
  amount_due numeric(12, 2) NOT NULL CHECK (amount_due >= 0),
  amount_paid numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  balance_amount numeric(12, 2) GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 4. B-TREE INDEXES FOR PERFORMANCE OPTIMIZATION
-- ==============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Departments & Courses
CREATE INDEX IF NOT EXISTS idx_departments_head ON public.departments(head_of_department_id);
CREATE INDEX IF NOT EXISTS idx_courses_department ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_is_active ON public.courses(is_active);

-- Semesters & Subjects
CREATE INDEX IF NOT EXISTS idx_semesters_course ON public.semesters(course_id);
CREATE INDEX IF NOT EXISTS idx_semesters_current ON public.semesters(is_current);
CREATE INDEX IF NOT EXISTS idx_subjects_course ON public.subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON public.subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_subjects_sem_num ON public.subjects(semester_number);

-- Student Records
CREATE INDEX IF NOT EXISTS idx_student_records_profile ON public.student_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_student_records_department ON public.student_records(department_id);
CREATE INDEX IF NOT EXISTS idx_student_records_course ON public.student_records(course_id);
CREATE INDEX IF NOT EXISTS idx_student_records_semester ON public.student_records(current_semester_id);
CREATE INDEX IF NOT EXISTS idx_student_records_enrollment ON public.student_records(enrollment_number);

-- Subject Allocations
CREATE INDEX IF NOT EXISTS idx_subject_allocations_subject ON public.subject_allocations(subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_allocations_faculty ON public.subject_allocations(faculty_id);
CREATE INDEX IF NOT EXISTS idx_subject_allocations_semester ON public.subject_allocations(semester_id);
CREATE INDEX IF NOT EXISTS idx_subject_allocations_academic_year ON public.subject_allocations(academic_year);

-- Attendance Sessions & Records
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_alloc ON public.attendance_sessions(allocation_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_creator ON public.attendance_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_composite ON public.attendance_records(session_id, student_id, status);

-- Fees & Invoices
CREATE INDEX IF NOT EXISTS idx_fee_structures_course_sem ON public.fee_structures(course_id, semester_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_student ON public.student_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_status ON public.student_invoices(status);
CREATE INDEX IF NOT EXISTS idx_student_invoices_due_date ON public.student_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_student_invoices_fee_struct ON public.student_invoices(fee_structure_id);

-- ==============================================================================
-- 5. UPDATED_AT TRIGGERS
-- ==============================================================================
CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_semesters_updated_at BEFORE UPDATE ON public.semesters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_student_records_updated_at BEFORE UPDATE ON public.student_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_subject_allocations_updated_at BEFORE UPDATE ON public.subject_allocations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_attendance_sessions_updated_at BEFORE UPDATE ON public.attendance_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE OR REPLACE TRIGGER trg_student_invoices_updated_at BEFORE UPDATE ON public.student_invoices FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. AUTH SIGNUP TRIGGER: AUTO-PROVISION PUBLIC.PROFILES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role public.user_role;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Extract role from metadata or default to 'student'
  BEGIN
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role);
  EXCEPTION WHEN others THEN
    v_role := 'student'::public.user_role;
  END;

  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1));
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', substring(COALESCE(NEW.raw_user_meta_data->>'full_name', '') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', '')) + 1));
  
  IF v_last_name IS NULL OR v_last_name = '' THEN
    v_last_name := 'User';
  END IF;

  INSERT INTO public.profiles (
    id,
    role,
    first_name,
    last_name,
    email,
    phone,
    avatar_url,
    is_active
  )
  VALUES (
    NEW.id,
    v_role,
    v_first_name,
    v_last_name,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if needed and re-bind
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 7.1 PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Super admin full CRUD
CREATE POLICY "super_admin_manage_profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Users read their own profile
CREATE POLICY "users_read_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users update their own editable profile details
CREATE POLICY "users_update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Faculty & Accountants can view student and faculty profiles (Directory / Roster)
CREATE POLICY "staff_read_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_faculty() OR public.is_accountant());

-- Students can read faculty profiles (for finding instructors)
CREATE POLICY "students_read_faculty_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_student() AND role = 'faculty'::public.user_role);

-- ------------------------------------------------------------------------------
-- 7.2 ACADEMIC METADATA: DEPARTMENTS, COURSES, SEMESTERS, SUBJECTS
-- ------------------------------------------------------------------------------
-- Departments
CREATE POLICY "super_admin_manage_departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "authenticated_read_departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

-- Courses
CREATE POLICY "super_admin_manage_courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "authenticated_read_courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

-- Semesters
CREATE POLICY "super_admin_manage_semesters"
  ON public.semesters FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "authenticated_read_semesters"
  ON public.semesters FOR SELECT
  TO authenticated
  USING (true);

-- Subjects
CREATE POLICY "super_admin_manage_subjects"
  ON public.subjects FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "authenticated_read_subjects"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 7.3 STUDENT RECORDS POLICIES
-- ------------------------------------------------------------------------------
-- Super admin full CRUD
CREATE POLICY "super_admin_manage_student_records"
  ON public.student_records FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Faculty can read student records (for grade books, roster, attendance)
CREATE POLICY "faculty_read_student_records"
  ON public.student_records FOR SELECT
  TO authenticated
  USING (public.is_faculty());

-- Accountant can read student records (for billing and student lookups)
CREATE POLICY "accountant_read_student_records"
  ON public.student_records FOR SELECT
  TO authenticated
  USING (public.is_accountant());

-- Students can view only their own record
CREATE POLICY "students_read_own_record"
  ON public.student_records FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 7.4 SUBJECT ALLOCATIONS POLICIES
-- ------------------------------------------------------------------------------
-- Super admin full CRUD
CREATE POLICY "super_admin_manage_allocations"
  ON public.subject_allocations FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Faculty can view all allocations (or their own assigned subjects)
CREATE POLICY "faculty_read_allocations"
  ON public.subject_allocations FOR SELECT
  TO authenticated
  USING (public.is_faculty());

-- Students can view allocations for their enrolled course subjects
CREATE POLICY "students_read_allocations"
  ON public.subject_allocations FOR SELECT
  TO authenticated
  USING (
    public.is_student() AND EXISTS (
      SELECT 1 FROM public.student_records sr
      JOIN public.subjects s ON s.course_id = sr.course_id
      WHERE sr.profile_id = auth.uid()
        AND s.id = public.subject_allocations.subject_id
    )
  );

-- ------------------------------------------------------------------------------
-- 7.5 ATTENDANCE SESSIONS POLICIES
-- ------------------------------------------------------------------------------
-- Super admin full CRUD
CREATE POLICY "super_admin_manage_attendance_sessions"
  ON public.attendance_sessions FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Faculty can view sessions for allocations assigned to them
CREATE POLICY "faculty_select_attendance_sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    public.is_faculty() AND EXISTS (
      SELECT 1 FROM public.subject_allocations sa
      WHERE sa.id = public.attendance_sessions.allocation_id
        AND sa.faculty_id = auth.uid()
    )
  );

-- Faculty can create sessions for their assigned subjects
CREATE POLICY "faculty_insert_attendance_sessions"
  ON public.attendance_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_faculty() AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.subject_allocations sa
      WHERE sa.id = public.attendance_sessions.allocation_id
        AND sa.faculty_id = auth.uid()
    )
  );

-- Faculty can update/delete their own sessions
CREATE POLICY "faculty_update_own_sessions"
  ON public.attendance_sessions FOR UPDATE
  TO authenticated
  USING (
    public.is_faculty() AND created_by = auth.uid()
  )
  WITH CHECK (
    public.is_faculty() AND created_by = auth.uid()
  );

-- Students can view sessions for subjects in their course/semester
CREATE POLICY "students_read_attendance_sessions"
  ON public.attendance_sessions FOR SELECT
  TO authenticated
  USING (
    public.is_student() AND EXISTS (
      SELECT 1 FROM public.subject_allocations sa
      JOIN public.student_records sr ON sr.course_id = (SELECT course_id FROM public.subjects WHERE id = sa.subject_id)
      WHERE sa.id = public.attendance_sessions.allocation_id
        AND sr.profile_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- 7.6 ATTENDANCE RECORDS POLICIES
-- ------------------------------------------------------------------------------
-- Super admin full CRUD
CREATE POLICY "super_admin_manage_attendance_records"
  ON public.attendance_records FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Faculty can view and record/update attendance for sessions of their allocated subjects
CREATE POLICY "faculty_select_attendance_records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.is_faculty() AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.subject_allocations a ON a.id = s.allocation_id
      WHERE s.id = public.attendance_records.session_id
        AND a.faculty_id = auth.uid()
    )
  );

CREATE POLICY "faculty_insert_attendance_records"
  ON public.attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_faculty() AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.subject_allocations a ON a.id = s.allocation_id
      WHERE s.id = public.attendance_records.session_id
        AND a.faculty_id = auth.uid()
    )
  );

CREATE POLICY "faculty_update_attendance_records"
  ON public.attendance_records FOR UPDATE
  TO authenticated
  USING (
    public.is_faculty() AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.subject_allocations a ON a.id = s.allocation_id
      WHERE s.id = public.attendance_records.session_id
        AND a.faculty_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_faculty() AND EXISTS (
      SELECT 1 FROM public.attendance_sessions s
      JOIN public.subject_allocations a ON a.id = s.allocation_id
      WHERE s.id = public.attendance_records.session_id
        AND a.faculty_id = auth.uid()
    )
  );

-- Students can ONLY read their own attendance records
CREATE POLICY "students_read_own_attendance_records"
  ON public.attendance_records FOR SELECT
  TO authenticated
  USING (
    public.is_student() AND student_id = public.get_current_student_id()
  );

-- ------------------------------------------------------------------------------
-- 7.7 FEE STRUCTURES POLICIES
-- ------------------------------------------------------------------------------
-- Super admin & Accountant manage fee structures
CREATE POLICY "admins_accountants_manage_fee_structures"
  ON public.fee_structures FOR ALL
  TO authenticated
  USING (public.is_super_admin() OR public.is_accountant())
  WITH CHECK (public.is_super_admin() OR public.is_accountant());

-- Faculty & Students can view active fee structures
CREATE POLICY "authenticated_view_fee_structures"
  ON public.fee_structures FOR SELECT
  TO authenticated
  USING (true);

-- ------------------------------------------------------------------------------
-- 7.8 STUDENT INVOICES POLICIES
-- ------------------------------------------------------------------------------
-- Super admin & Accountant manage invoices
CREATE POLICY "admins_accountants_manage_invoices"
  ON public.student_invoices FOR ALL
  TO authenticated
  USING (public.is_super_admin() OR public.is_accountant())
  WITH CHECK (public.is_super_admin() OR public.is_accountant());

-- Students can read-only access to their own invoices
CREATE POLICY "students_read_own_invoices"
  ON public.student_invoices FOR SELECT
  TO authenticated
  USING (
    public.is_student() AND student_id = public.get_current_student_id()
  );
