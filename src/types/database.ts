export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'super_admin' | 'faculty' | 'student' | 'accountant';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type InvoiceStatus = 'pending' | 'paid' | 'overdue';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      departments: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          head_of_department_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          head_of_department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          head_of_department_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_of_department_id_fkey";
            columns: ["head_of_department_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      courses: {
        Row: {
          id: string;
          department_id: string;
          code: string;
          name: string;
          duration_years: number;
          total_semesters: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          code: string;
          name: string;
          duration_years?: number;
          total_semesters?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          code?: string;
          name?: string;
          duration_years?: number;
          total_semesters?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          }
        ];
      };

      semesters: {
        Row: {
          id: string;
          course_id: string;
          semester_number: number;
          academic_year: string;
          start_date: string;
          end_date: string;
          is_current: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          semester_number: number;
          academic_year: string;
          start_date: string;
          end_date: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          semester_number?: number;
          academic_year?: string;
          start_date?: string;
          end_date?: string;
          is_current?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "semesters_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };

      subjects: {
        Row: {
          id: string;
          course_id: string;
          department_id: string;
          code: string;
          name: string;
          semester_number: number;
          credits: number;
          is_elective: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          department_id: string;
          code: string;
          name: string;
          semester_number: number;
          credits?: number;
          is_elective?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          department_id?: string;
          code?: string;
          name?: string;
          semester_number?: number;
          credits?: number;
          is_elective?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subjects_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subjects_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          }
        ];
      };

      student_records: {
        Row: {
          id: string;
          profile_id: string;
          enrollment_number: string;
          roll_number: string | null;
          department_id: string;
          course_id: string;
          current_semester_id: string | null;
          admission_date: string;
          blood_group: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          enrollment_number: string;
          roll_number?: string | null;
          department_id: string;
          course_id: string;
          current_semester_id?: string | null;
          admission_date?: string;
          blood_group?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          enrollment_number?: string;
          roll_number?: string | null;
          department_id?: string;
          course_id?: string;
          current_semester_id?: string | null;
          admission_date?: string;
          blood_group?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_records_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_records_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_records_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_records_current_semester_id_fkey";
            columns: ["current_semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };

      subject_allocations: {
        Row: {
          id: string;
          subject_id: string;
          faculty_id: string;
          semester_id: string;
          section: string;
          academic_year: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          faculty_id: string;
          semester_id: string;
          section?: string;
          academic_year: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          faculty_id?: string;
          semester_id?: string;
          section?: string;
          academic_year?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subject_allocations_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subject_allocations_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subject_allocations_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };

      attendance_sessions: {
        Row: {
          id: string;
          allocation_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          topic: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          allocation_id: string;
          session_date?: string;
          start_time: string;
          end_time: string;
          topic?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          allocation_id?: string;
          session_date?: string;
          start_time?: string;
          end_time?: string;
          topic?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_allocation_id_fkey";
            columns: ["allocation_id"];
            isOneToOne: false;
            referencedRelation: "subject_allocations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          status: AttendanceStatus;
          remarks: string | null;
          marked_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          status?: AttendanceStatus;
          remarks?: string | null;
          marked_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          status?: AttendanceStatus;
          remarks?: string | null;
          marked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_records";
            referencedColumns: ["id"];
          }
        ];
      };

      fee_structures: {
        Row: {
          id: string;
          course_id: string;
          semester_id: string;
          academic_year: string;
          tuition_fee: number;
          development_fee: number;
          examination_fee: number;
          library_fee: number;
          total_fee: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          semester_id: string;
          academic_year: string;
          tuition_fee?: number;
          development_fee?: number;
          examination_fee?: number;
          library_fee?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          semester_id?: string;
          academic_year?: string;
          tuition_fee?: number;
          development_fee?: number;
          examination_fee?: number;
          library_fee?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_structures_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };

      student_invoices: {
        Row: {
          id: string;
          invoice_number: string;
          student_id: string;
          fee_structure_id: string;
          amount_due: number;
          amount_paid: number;
          balance_amount: number;
          status: InvoiceStatus;
          due_date: string;
          paid_at: string | null;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          student_id: string;
          fee_structure_id: string;
          amount_due: number;
          amount_paid?: number;
          status?: InvoiceStatus;
          due_date: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          student_id?: string;
          fee_structure_id?: string;
          amount_due?: number;
          amount_paid?: number;
          status?: InvoiceStatus;
          due_date?: string;
          paid_at?: string | null;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_invoices_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "student_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_invoices_fee_structure_id_fkey";
            columns: ["fee_structure_id"];
            isOneToOne: false;
            referencedRelation: "fee_structures";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      is_super_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_faculty: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_student: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_accountant: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_current_student_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      attendance_status: AttendanceStatus;
      invoice_status: InvoiceStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// ------------------------------------------------------------------------------
// Convenience Entity Types
// ------------------------------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Profile = Tables<'profiles'>;
export type Department = Tables<'departments'>;
export type Course = Tables<'courses'>;
export type Semester = Tables<'semesters'>;
export type Subject = Tables<'subjects'>;
export type StudentRecord = Tables<'student_records'>;
export type SubjectAllocation = Tables<'subject_allocations'>;
export type AttendanceSession = Tables<'attendance_sessions'>;
export type AttendanceRecord = Tables<'attendance_records'>;
export type FeeStructure = Tables<'fee_structures'>;
export type StudentInvoice = Tables<'student_invoices'>;

// ------------------------------------------------------------------------------
// Joined / Relationship Model Types
// ------------------------------------------------------------------------------
export interface StudentRecordWithDetails extends StudentRecord {
  profile: Profile;
  department: Department;
  course: Course;
  current_semester: Semester | null;
}

export interface SubjectAllocationWithDetails extends SubjectAllocation {
  subject: Subject;
  faculty: Profile;
  semester: Semester;
}

export interface AttendanceSessionWithDetails extends AttendanceSession {
  allocation: SubjectAllocation & {
    subject: Subject;
    faculty: Profile;
    semester: Semester;
  };
  records?: AttendanceRecordWithStudent[];
}

export interface AttendanceRecordWithStudent extends AttendanceRecord {
  student: StudentRecord & {
    profile: Profile;
  };
}

export interface StudentInvoiceWithDetails extends StudentInvoice {
  student: StudentRecord & {
    profile: Profile;
    course: Course;
  };
  fee_structure: FeeStructure;
}
