import type { Role } from "./auth";

export interface PlatformAccount {
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

export interface PlatformAccountInput {
  email: string;
  password?: string;
  role: Role;
  teacher_profile_id?: string | null;
  student_profile_id?: string | null;
  is_active?: boolean;
  is_verified?: boolean;
}
