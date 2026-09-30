export type Role = "ADMIN" | "DIRECTOR" | "TEACHER" | "STUDENT";

export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  teacher_profile_id?: string | null;
  teacher_name?: string | null;
  student_profile_id?: string | null;
  student_name?: string | null;
  created_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}
