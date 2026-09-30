import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { ROLE_HOME } from "../../lib/user";
import type { Role } from "../../types/auth";

export function RequireRole({ allow }: { allow: Role[] }) {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return <Navigate to="/login" replace />;
  if (!allow.includes(role)) return <Navigate to={ROLE_HOME[role]} replace />;
  return <Outlet />;
}
