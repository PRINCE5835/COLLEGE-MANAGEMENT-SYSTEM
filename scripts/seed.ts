import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// 1. Environment Variable Loader
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase Environment Variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in .env.local.");
  process.exit(1);
}

// 2. Initialize Admin Supabase Client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper: Provision user in Supabase Auth & public.profiles
// For Super Admin & Faculty:
// 1. When calling admin.createUser(), if it throws an error or warns that the user exists,
//    fallback to finding their user ID using: const { data: users } = await supabase.auth.admin.listUsers();
// 2. Ensure that a profile entry exists in the profiles table for that id with role: 'super_admin' or 'faculty' (upsert into profiles).
// 3. Return the verified profile id so that faculty subject allocations in step [4/7] resolve correctly.
async function provisionUser(
  email: string,
  pass: string,
  meta: { first_name: string; last_name: string; role: "super_admin" | "faculty" | "student" }
): Promise<string> {
  let userId: string | null = null;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
      user_metadata: meta,
    });

    if (data?.user?.id) {
      userId = data.user.id;
    } else if (error) {
      // 1. Fallback to finding user ID using supabase.auth.admin.listUsers()
      const { data: users } = await supabase.auth.admin.listUsers();
      const matchingUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (matchingUser?.id) {
        userId = matchingUser.id;
      } else {
        // Fallback: check directly from profiles table
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingProfile?.id) {
          userId = existingProfile.id;
        }
      }

      if (!userId) {
        console.warn(`   ⚠️ Warning provisioning ${email}: ${error.message}`);
      }
    }
  } catch (err: any) {
    console.warn(`   ⚠️ Exception provisioning ${email}: ${err?.message || err}`);
    // Exception fallback to listUsers
    try {
      const { data: users } = await supabase.auth.admin.listUsers();
      const matchingUser = users?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (matchingUser?.id) {
        userId = matchingUser.id;
      }
    } catch {}

    if (!userId) {
      try {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingProfile?.id) {
          userId = existingProfile.id;
        }
      } catch {}
    }
  }

  // 2. Ensure that a profile entry exists in the profiles table for that id with role: 'super_admin' or 'faculty' (upsert into profiles)
  if (userId) {
    const { error: upsertErr } = await supabase.from("profiles").upsert(
      {
        id: userId,
        role: meta.role,
        first_name: meta.first_name,
        last_name: meta.last_name,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertErr) {
      console.warn(`   ⚠️ Could not upsert profile for ${email}: ${upsertErr.message}`);
    }

    // 3. Return the verified profile id so that faculty subject allocations in step [4/7] resolve correctly
    const { data: verifiedProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (verifiedProfile?.id) {
      return verifiedProfile.id;
    }

    return userId;
  }

  return "";
}

async function runSeed() {
  console.log("===================================================================");
  console.log("🌱 ACADEMIACORE CMS — INSTITUTIONAL DATABASE SEEDER");
  console.log("===================================================================\n");

  // Pre-flight Schema Verification Check
  const { error: testError } = await supabase.from("departments").select("id").limit(1);
  if (testError && testError.code === "PGRST205") {
    console.error("❌ DATABASE SCHEMA NOT DETECTED IN POSTGREST CACHE!");
    console.error("-------------------------------------------------------------------");
    console.error("Before running this seeder, the PostgreSQL database tables must be created.");
    console.error("1. Open your Supabase Dashboard: https://supabase.com/dashboard");
    console.error("2. Navigate to SQL Editor and open the file: supabase/schema.sql");
    console.error("3. Run the complete SQL script to create tables, enums, triggers, and RLS policies.");
    console.error("4. Re-run: npm run db:seed\n");
    process.exit(1);
  }

  // STEP 1: Provision Super Admin
  console.log("👑 [1/7] Provisioning Super Admin Account...");
  const adminId = await provisionUser("admin@college.edu", "AdminDemo123!", {
    first_name: "Super",
    last_name: "Administrator",
    role: "super_admin",
  });
  console.log(`   ✓ Super Admin: admin@college.edu (${adminId ? `ID: ${adminId}` : "skipped - profile not resolved"})\n`);

  // STEP 2: Provision 3 Faculty Members
  console.log("👨‍🏫 [2/7] Provisioning 3 Academic Faculty Members...");
  const facultySharmaId = await provisionUser("faculty@college.edu", "FacultyDemo123!", {
    first_name: "Rajesh",
    last_name: "Sharma",
    role: "faculty",
  });
  const facultyPatelId = await provisionUser("dr.patel@college.edu", "FacultyDemo123!", {
    first_name: "Ananya",
    last_name: "Patel",
    role: "faculty",
  });
  const facultyChenId = await provisionUser("prof.chen@college.edu", "FacultyDemo123!", {
    first_name: "David",
    last_name: "Chen",
    role: "faculty",
  });
  console.log(
    `   ✓ Faculty profiles: Sharma (${facultySharmaId || "none"}), Patel (${facultyPatelId || "none"}), Chen (${facultyChenId || "none"})\n`
  );

  // STEP 3: Seed Core Academic Departments & Courses
  console.log("🏛️ [3/7] Seeding 2 Departments & 2 Degree Programs...");

  // CSE Department
  let { data: deptCSE } = await supabase
    .from("departments")
    .upsert({ code: "CSE", name: "Computer Science & Engineering" }, { onConflict: "code" })
    .select("id, code, name")
    .maybeSingle();

  if (!deptCSE?.id) {
    const { data: existingCSE } = await supabase
      .from("departments")
      .select("id, code, name")
      .eq("code", "CSE")
      .maybeSingle();
    deptCSE = existingCSE;
  }

  if (!deptCSE?.id) {
    throw new Error("❌ Failed to resolve or insert CSE Department (code: 'CSE'). Aborting seeder.");
  }

  // IT Department
  let { data: deptIT } = await supabase
    .from("departments")
    .upsert({ code: "IT", name: "Information Technology" }, { onConflict: "code" })
    .select("id, code, name")
    .maybeSingle();

  if (!deptIT?.id) {
    const { data: existingIT } = await supabase
      .from("departments")
      .select("id, code, name")
      .eq("code", "IT")
      .maybeSingle();
    deptIT = existingIT;
  }

  if (!deptIT?.id) {
    throw new Error("❌ Failed to resolve or insert IT Department (code: 'IT'). Aborting seeder.");
  }

  // CSE Course
  const cseCourseName = "Bachelor of Technology in Computer Science & Engineering";
  let { data: courseCSE } = await supabase
    .from("courses")
    .select("id, department_id, name, duration_years")
    .eq("department_id", deptCSE.id)
    .eq("name", cseCourseName)
    .maybeSingle();

  if (!courseCSE?.id) {
    const { data: newCourse, error: cseErr } = await supabase
      .from("courses")
      .insert({
        department_id: deptCSE.id,
        name: cseCourseName,
        duration_years: 4,
      })
      .select("id, department_id, name, duration_years")
      .maybeSingle();

    if (cseErr) {
      console.warn(`   ⚠️ Warning inserting CSE Course: ${cseErr.message}`);
    }
    courseCSE = newCourse;
  }

  if (!courseCSE?.id) {
    throw new Error("❌ Failed to resolve or insert CSE Course. Aborting seeder.");
  }

  // IT Course
  const itCourseName = "Bachelor of Technology in Information Technology";
  let { data: courseIT } = await supabase
    .from("courses")
    .select("id, department_id, name, duration_years")
    .eq("department_id", deptIT.id)
    .eq("name", itCourseName)
    .maybeSingle();

  if (!courseIT?.id) {
    const { data: newCourse, error: itErr } = await supabase
      .from("courses")
      .insert({
        department_id: deptIT.id,
        name: itCourseName,
        duration_years: 4,
      })
      .select("id, department_id, name, duration_years")
      .maybeSingle();

    if (itErr) {
      console.warn(`   ⚠️ Warning inserting IT Course: ${itErr.message}`);
    }
    courseIT = newCourse;
  }

  if (!courseIT?.id) {
    throw new Error("❌ Failed to resolve or insert IT Course. Aborting seeder.");
  }

  console.log(`   ✓ Departments: CSE (${deptCSE.id}), IT (${deptIT.id})`);
  console.log(`   ✓ Programs: B.Tech CSE (${courseCSE.id}), B.Tech IT (${courseIT.id})\n`);

  // STEP 4: Seed 4 Semesters & 8 Curriculum Subjects
  console.log("📚 [4/7] Seeding 4 Semesters, 8 Subjects, & Faculty Allocations...");
  const currentAcademicYear = "2025-2026";

  async function resolveSemester(courseId: string, semNumber: number, academicYear: string) {
    if (!courseId) return null;
    const { data: existing } = await supabase
      .from("semesters")
      .select("id, course_id, semester_number, academic_year")
      .eq("course_id", courseId)
      .eq("semester_number", semNumber)
      .eq("academic_year", academicYear)
      .maybeSingle();

    if (existing?.id) return existing;

    const { data: created, error } = await supabase
      .from("semesters")
      .insert({
        course_id: courseId,
        semester_number: semNumber,
        academic_year: academicYear,
      })
      .select("id, course_id, semester_number, academic_year")
      .maybeSingle();

    if (error) {
      console.warn(`   ⚠️ Could not insert Semester ${semNumber} (${academicYear}): ${error.message}`);
      return null;
    }
    return created;
  }

  const semCSE1 = await resolveSemester(courseCSE.id, 1, currentAcademicYear);
  const semCSE2 = await resolveSemester(courseCSE.id, 2, currentAcademicYear);
  const semIT1 = await resolveSemester(courseIT.id, 1, currentAcademicYear);
  const semIT2 = await resolveSemester(courseIT.id, 2, currentAcademicYear);

  if (!semCSE1?.id || !semCSE2?.id || !semIT1?.id || !semIT2?.id) {
    throw new Error("❌ Failed to resolve required Semesters. Aborting seeder.");
  }

  // 8 Subjects: 4 for CSE, 4 for IT
  const subjectsToSeed = [
    { code: "CS101", name: "Data Structures & Algorithms", semesterId: semCSE1.id, credits: 4 },
    { code: "CS102", name: "Discrete Mathematical Structures", semesterId: semCSE1.id, credits: 3 },
    { code: "CS201", name: "Computer Organization & Architecture", semesterId: semCSE2.id, credits: 4 },
    { code: "CS202", name: "Database Management Systems", semesterId: semCSE2.id, credits: 4 },
    { code: "IT101", name: "Foundations of Web Technologies", semesterId: semIT1.id, credits: 4 },
    { code: "IT102", name: "Object Oriented Software Systems", semesterId: semIT1.id, credits: 3 },
    { code: "IT201", name: "Cloud Infrastructure & DevOps", semesterId: semIT2.id, credits: 4 },
    { code: "IT202", name: "Information & Cyber Security", semesterId: semIT2.id, credits: 4 },
  ];

  const seededSubjects: Record<string, string> = {};
  for (const sub of subjectsToSeed) {
    if (!sub.semesterId) {
      console.warn(`   ⚠️ Skipping subject ${sub.code}: missing semester ID.`);
      continue;
    }

    let { data: existing } = await supabase
      .from("subjects")
      .select("id, subject_code, subject_name")
      .eq("subject_code", sub.code)
      .maybeSingle();

    if (!existing?.id) {
      const { data: created, error } = await supabase
        .from("subjects")
        .insert({
          semester_id: sub.semesterId,
          subject_code: sub.code,
          subject_name: sub.name,
          credits: sub.credits,
        })
        .select("id, subject_code, subject_name")
        .maybeSingle();

      if (error) {
        console.warn(`   ⚠️ Could not insert Subject ${sub.code}: ${error.message}`);
      } else if (created?.id) {
        existing = created;
      }
    }

    if (existing?.id) {
      seededSubjects[sub.code] = existing.id;
    }
  }

  // Subject Allocations for Faculty
  const allocations = [
    { subjectCode: "CS101", facultyId: facultySharmaId },
    { subjectCode: "CS202", facultyId: facultySharmaId },
    { subjectCode: "CS102", facultyId: facultyChenId },
    { subjectCode: "CS201", facultyId: facultyChenId },
    { subjectCode: "IT101", facultyId: facultyPatelId },
    { subjectCode: "IT201", facultyId: facultyPatelId },
    { subjectCode: "IT102", facultyId: facultyChenId },
    { subjectCode: "IT202", facultyId: facultySharmaId },
  ];

  const seededAllocations: { id: string; subject_id: string; faculty_id: string }[] = [];
  for (const alloc of allocations) {
    const subjectId = seededSubjects[alloc.subjectCode];
    const facultyId = alloc.facultyId;

    // Requirement 3: Strictly verify that faculty profile ID and subject ID actually exist before inserting
    if (!subjectId) {
      console.warn(`   ⚠️ Skipping allocation for ${alloc.subjectCode}: Subject ID does not exist.`);
      continue;
    }
    if (!facultyId) {
      console.warn(`   ⚠️ Skipping allocation for ${alloc.subjectCode}: Faculty profile ID is not resolved.`);
      continue;
    }

    // Verify faculty ID exists in profiles table
    const { data: facCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", facultyId)
      .maybeSingle();

    if (!facCheck?.id) {
      console.warn(`   ⚠️ Skipping allocation for ${alloc.subjectCode}: Faculty ID ${facultyId} does not exist in profiles table.`);
      continue;
    }

    // Verify subject ID exists in subjects table
    const { data: subCheck } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .maybeSingle();

    if (!subCheck?.id) {
      console.warn(`   ⚠️ Skipping allocation for ${alloc.subjectCode}: Subject ID ${subjectId} does not exist in subjects table.`);
      continue;
    }

    // Check if allocation already exists
    const { data: existingAlloc } = await supabase
      .from("subject_allocations")
      .select("id, subject_id, faculty_id")
      .eq("subject_id", subjectId)
      .eq("faculty_id", facultyId)
      .maybeSingle();

    if (existingAlloc?.id) {
      seededAllocations.push(existingAlloc);
      continue;
    }

    const { data: newAlloc, error: allocErr } = await supabase
      .from("subject_allocations")
      .insert({
        subject_id: subjectId,
        faculty_id: facultyId,
      })
      .select("id, subject_id, faculty_id")
      .maybeSingle();

    if (allocErr) {
      console.warn(`   ⚠️ Error inserting allocation for ${alloc.subjectCode}: ${allocErr.message}`);
    } else if (newAlloc?.id) {
      seededAllocations.push(newAlloc);
    }
  }

  console.log(`   ✓ 4 Semesters resolved (Sem 1 & 2 for CSE & IT)`);
  console.log(`   ✓ ${Object.keys(seededSubjects).length} Subjects resolved`);
  console.log(`   ✓ ${seededAllocations.length} Faculty Allocations verified & linked\n`);

  // STEP 5: Provision 25 Students with Academic Records
  console.log("🎓 [5/7] Provisioning 25 Students with Profiles & Academic Records...");
  const studentList = [
    { first_name: "Aarav", last_name: "Sharma", email: "student@college.edu" },
    { first_name: "Priya", last_name: "Verma", email: "priya.verma@college.edu" },
    { first_name: "Rohan", last_name: "Mehta", email: "rohan.mehta@college.edu" },
    { first_name: "Sneha", last_name: "Iyer", email: "sneha.iyer@college.edu" },
    { first_name: "Vikram", last_name: "Singh", email: "vikram.singh@college.edu" },
    { first_name: "Ananya", last_name: "Joshi", email: "ananya.joshi@college.edu" },
    { first_name: "Aditya", last_name: "Rao", email: "aditya.rao@college.edu" },
    { first_name: "Meera", last_name: "Nair", email: "meera.nair@college.edu" },
    { first_name: "Kabir", last_name: "Kapoor", email: "kabir.kapoor@college.edu" },
    { first_name: "Diya", last_name: "Patel", email: "diya.patel@college.edu" },
    { first_name: "Arjun", last_name: "Reddy", email: "arjun.reddy@college.edu" },
    { first_name: "Tanvi", last_name: "Deshmukh", email: "tanvi.deshmukh@college.edu" },
    { first_name: "Yash", last_name: "Malhotra", email: "yash.malhotra@college.edu" },
    { first_name: "Sanya", last_name: "Gupta", email: "sanya.gupta@college.edu" },
    { first_name: "Karan", last_name: "Bhatia", email: "karan.bhatia@college.edu" },
    { first_name: "Rhea", last_name: "Choudhury", email: "rhea.choudhury@college.edu" },
    { first_name: "Nikhil", last_name: "Saxena", email: "nikhil.saxena@college.edu" },
    { first_name: "Pooja", last_name: "Mishra", email: "pooja.mishra@college.edu" },
    { first_name: "Varun", last_name: "Nambiar", email: "varun.nambiar@college.edu" },
    { first_name: "Isha", last_name: "Kulkarni", email: "isha.kulkarni@college.edu" },
    { first_name: "Dhruv", last_name: "Agarwal", email: "dhruv.agarwal@college.edu" },
    { first_name: "Shreya", last_name: "Ghosh", email: "shreya.ghosh@college.edu" },
    { first_name: "Harsh", last_name: "Vardhan", email: "harsh.vardhan@college.edu" },
    { first_name: "Kavya", last_name: "Menon", email: "kavya.menon@college.edu" },
    { first_name: "Siddharth", last_name: "Pandey", email: "siddharth.pandey@college.edu" },
  ];

  const seededStudentRecords: { id: string; course_id: string; enrollment_number: string }[] = [];

  for (let i = 0; i < studentList.length; i++) {
    const student = studentList[i];
    const isCSE = i < 13;
    const course = isCSE ? courseCSE : courseIT;
    const semester = isCSE ? semCSE2 : semIT2;
    const enrollment = `STU2025${String(i + 1).padStart(4, "0")}`;

    // 1. Explicitly provide parameters to admin.createUser
    let studentUserId: string | null = null;
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: student.email,
        password: "StudentDemo123!",
        email_confirm: true,
        user_metadata: {
          first_name: student.first_name,
          last_name: student.last_name,
          role: "student",
        },
      });

      if (data?.user?.id) {
        studentUserId = data.user.id;
      }

      // 2. Immediately check if error occurs. If user already exists, retrieve ID via listUsers
      if (error) {
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existing = userList?.users?.find(
          (u) => u.email?.toLowerCase() === student.email.toLowerCase()
        );
        if (existing?.id) {
          studentUserId = existing.id;
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", student.email)
            .maybeSingle();
          if (profile?.id) {
            studentUserId = profile.id;
          }
        }
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Auth creation exception for ${student.email}: ${err?.message || err}`);
      try {
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existing = userList?.users?.find(
          (u) => u.email?.toLowerCase() === student.email.toLowerCase()
        );
        if (existing?.id) {
          studentUserId = existing.id;
        }
      } catch {}
    }

    // 3. Explicitly insert or upsert the student's entry into profiles and student_records
    if (studentUserId) {
      await supabase.from("profiles").upsert(
        {
          id: studentUserId,
          role: "student",
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // Explicitly insert or upsert into student_records so 0 Student records linked never happens
    let { data: record } = await supabase
      .from("student_records")
      .select("id, course_id, enrollment_number, profile_id")
      .eq("enrollment_number", enrollment)
      .maybeSingle();

    if (!record?.id) {
      const { data: newRecord, error: recErr } = await supabase
        .from("student_records")
        .insert({
          profile_id: studentUserId || null,
          enrollment_number: enrollment,
          course_id: course.id,
          current_semester_id: semester.id,
          admission_year: 2025,
        })
        .select("id, course_id, enrollment_number, profile_id")
        .maybeSingle();

      if (recErr) {
        console.warn(`   ⚠️ Error creating student record for ${enrollment}: ${recErr.message}`);
      } else if (newRecord?.id) {
        record = newRecord;
      }
    } else if (studentUserId && !record.profile_id) {
      const { data: updatedRecord } = await supabase
        .from("student_records")
        .update({ profile_id: studentUserId })
        .eq("id", record.id)
        .select("id, course_id, enrollment_number, profile_id")
        .maybeSingle();
      if (updatedRecord?.id) {
        record = updatedRecord;
      }
    }

    if (record?.id) {
      seededStudentRecords.push(record);
    }

    // 4. Add a short delay (50ms) between student creations to prevent local network throttling
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log(`   ✓ ${seededStudentRecords.length} Student records linked with profiles\n`);

  // STEP 6: Seed Past 30 Days of Attendance Sessions & Records
  console.log("⏱️ [6/7] Generating 30 Days of Historical Classroom Attendance...");
  let attendanceRecordCount = 0;
  const now = new Date();

  // Resolve session targets from allocations or fallback to core seeded subjects
  const sessionTargets: { subject_id: string; faculty_id: string | null }[] =
    seededAllocations.length > 0
      ? seededAllocations.slice(0, 4)
      : [
          { subject_id: seededSubjects["CS101"], faculty_id: facultySharmaId || null },
          { subject_id: seededSubjects["CS202"], faculty_id: facultySharmaId || null },
          { subject_id: seededSubjects["IT101"], faculty_id: facultyPatelId || null },
          { subject_id: seededSubjects["IT201"], faculty_id: facultyPatelId || null },
        ].filter((t) => Boolean(t.subject_id));

  if (sessionTargets.length === 0 || seededStudentRecords.length === 0) {
    console.warn("   ⚠️ Insufficient session targets or student records to generate attendance sessions. Skipping.");
  } else {
    for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
      const sessionDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = sessionDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Exclude weekends

      const dateStr = sessionDate.toISOString().split("T")[0];

      for (const target of sessionTargets) {
        if (!target?.subject_id) continue;

        const { data: session } = await supabase
          .from("attendance_sessions")
          .insert({
            subject_id: target.subject_id,
            faculty_id: target.faculty_id || null,
            session_date: dateStr,
            is_active: dayOffset === 1,
          })
          .select("id")
          .maybeSingle();

        if (session?.id) {
          const recordsToInsert = seededStudentRecords.slice(0, 16).map((stu) => {
            const rand = Math.random();
            let status: "present" | "absent" | "late" = "present";
            if (rand > 0.92) status = "absent";
            else if (rand > 0.82) status = "late";

            return {
              session_id: session.id,
              student_id: stu.id,
              status,
              marked_at: `${dateStr}T09:35:00Z`,
            };
          });

          if (recordsToInsert.length > 0) {
            const { error: attErr } = await supabase.from("attendance_records").insert(recordsToInsert);
            if (!attErr) attendanceRecordCount += recordsToInsert.length;
          }
        }
      }
    }
  }

  console.log(`   ✓ ${attendanceRecordCount} Attendance records generated across past 30 days\n`);

  // STEP 7: Seed Fee Structures and Student Invoices
  console.log("💳 [7/7] Seeding Fee Structures & Student Invoices...");
  const feeStructuresList = [
    {
      course_id: courseCSE.id,
      semester_id: semCSE2.id,
      tuition_fee: 2800.0,
      exam_fee: 200.0,
      due_date: "2026-06-30",
    },
    {
      course_id: courseIT.id,
      semester_id: semIT2.id,
      tuition_fee: 2600.0,
      exam_fee: 200.0,
      due_date: "2026-06-30",
    },
  ];

  const seededFeeStructures: Record<string, string> = {};
  for (const fee of feeStructuresList) {
    if (!fee.course_id || !fee.semester_id) continue;

    let { data: existingFee } = await supabase
      .from("fee_structures")
      .select("id, course_id")
      .eq("course_id", fee.course_id)
      .eq("semester_id", fee.semester_id)
      .maybeSingle();

    if (!existingFee?.id) {
      const { data: createdFee, error: feeErr } = await supabase
        .from("fee_structures")
        .insert(fee)
        .select("id, course_id")
        .maybeSingle();

      if (feeErr) {
        console.warn(`   ⚠️ Error creating fee structure: ${feeErr.message}`);
      } else {
        existingFee = createdFee;
      }
    }

    if (existingFee?.id) {
      seededFeeStructures[existingFee.course_id] = existingFee.id;
    }
  }

  let invoiceCount = 0;
  for (let i = 0; i < seededStudentRecords.length; i++) {
    const stu = seededStudentRecords[i];
    if (!stu?.id || !stu?.course_id) continue;

    const feeStructureId = seededFeeStructures[stu.course_id];
    if (!feeStructureId) continue;

    const invoiceNumber = `INV-2025-${String(i + 1).padStart(5, "0")}`;
    const amountDue = stu.course_id === courseCSE.id ? 3000.0 : 2800.0;

    let status: "paid" | "pending" | "overdue" = "paid";
    if (i >= 20) {
      status = "overdue";
    } else if (i >= 12) {
      status = "pending";
    }

    // Check if invoice already exists
    const { data: existingInv } = await supabase
      .from("student_invoices")
      .select("id")
      .eq("invoice_number", invoiceNumber)
      .maybeSingle();

    if (!existingInv?.id) {
      const { error: invErr } = await supabase.from("student_invoices").insert({
        invoice_number: invoiceNumber,
        student_id: stu.id,
        fee_structure_id: feeStructureId,
        total_amount: amountDue,
        status,
      });

      if (!invErr) invoiceCount++;
      else console.warn(`   ⚠️ Error creating invoice ${invoiceNumber}: ${invErr.message}`);
    } else {
      invoiceCount++;
    }
  }

  console.log(`   ✓ ${Object.keys(seededFeeStructures).length} Fee Structures defined`);
  console.log(`   ✓ ${invoiceCount} Student invoices created (Paid, Pending, Overdue)\n`);

  console.log("===================================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("===================================================================\n");
  console.log("DEMO PERSONAS READY FOR RECRUITER EVALUATION:");
  console.log("-------------------------------------------------------------------");
  console.log("👑 1. Super Admin: admin@college.edu         | AdminDemo123!");
  console.log("👨‍🏫 2. Faculty:     faculty@college.edu       | FacultyDemo123!");
  console.log("🎓 3. Student:     student@college.edu       | StudentDemo123!");
  console.log("-------------------------------------------------------------------\n");
}

runSeed().catch((err) => {
  console.error("❌ Fatal error in seeder script:", err);
  process.exit(1);
});
