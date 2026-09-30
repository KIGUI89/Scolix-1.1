export interface Department {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  teachers_count: number;
  courses_count: number;
}

export interface Semester {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Grade {
  id: string;
  name: string;
  description: string | null;
  rank_order: number;
  is_active: boolean;
  teachers_count: number;
}

export interface Student {
  id: string;
  university_id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  level: string;
  cohort: string;
  academic_year: string;
  is_active: boolean;
  department: string;
  department_name: string;
}

export interface DepartmentByLevel {
  id: string;
  code: string;
  name: string;
  students_count: number;
}

export interface Course {
  id: string;
  university_id: string;
  code: string;
  name: string;
  description: string;
  level: string;
  cohort: string;
  credit: number;
  is_active: boolean;
  teacher: string;
  teacher_name: string;
  secondary_teachers: string[];
  secondary_teacher_names: string[];
  department: string;
  department_name: string;
  semester: string;
  semester_name: string;
  grade: string | null;
  grade_name: string | null;
}

export interface Enrollment {
  id: string;
  student: string;
  student_name: string;
  student_code: string;
  course: string;
  course_name: string;
  course_code: string;
  semester: string;
  semester_name: string;
  department: string;
  department_name: string;
  academic_year: string;
  is_active: boolean;
  enrolled_at: string;
}

/** One (course, teacher) pairing the logged-in student is actively enrolled
 * in — from GET /sync/enrollments/mine/, campaign-independent (unlike
 * /evaluations/my-courses/) since it just reflects real enrollments. */
export interface MyEnrollmentRow {
  department_id: string;
  department_name: string;
  teacher_id: string;
  teacher_name: string;
  course_id: string;
  course_name: string;
  course_code: string;
}
