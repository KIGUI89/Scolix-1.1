import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage";
import { StudentEvalForm } from "../pages/student/StudentEvalForm";
import { StudentHome } from "../pages/student/StudentHome";
import { StudentTodo } from "../pages/student/StudentTodo";
import { StudentReports } from "../pages/student/StudentReports";
import { StudentRank } from "../pages/student/StudentRank";
import { TeacherHome } from "../pages/teacher/TeacherHome";
import { TeacherFiches } from "../pages/teacher/TeacherFiches";
import { TeacherModules } from "../pages/teacher/TeacherModules";
import { TeacherModuleDetail } from "../pages/teacher/TeacherModuleDetail";
import { TeacherBilan } from "../pages/teacher/TeacherBilan";
import { useAuthStore } from "../store/authStore";
import { ROLE_HOME } from "../lib/user";
import { AppShell } from "../components/layout/AppShell";
import { RequireAuth } from "../components/auth/RequireAuth";
import { RequireRole } from "../components/auth/RequireRole";
import { AdminDashboard } from "../pages/admin/AdminDashboard";
import { DirectionDashboard } from "../pages/direction/DirectionDashboard";
import { TeacherList } from "../pages/admin/TeacherList";
import { TeacherDetail } from "../pages/admin/TeacherDetail";
import { Grades } from "../pages/admin/Grades";
import { Semesters } from "../pages/admin/Semesters";
import { Students } from "../pages/admin/Students";
import { CoursDepartments } from "../pages/admin/CoursDepartments";
import { Enrollment } from "../pages/admin/Enrollment";
import { Users } from "../pages/admin/Users";
import { Campaigns } from "../pages/admin/Campaigns";
import { CriteriaWeights } from "../pages/admin/CriteriaWeights";
import { AdvancedAnalytics } from "../pages/admin/AdvancedAnalytics";
import { MlAnalysis } from "../pages/admin/MlAnalysis";
import { BiasDetection } from "../pages/admin/BiasDetection";
import { Classification } from "../pages/admin/Classification";
import { Alerts } from "../pages/admin/Alerts";
import { DataImport } from "../pages/admin/DataImport";
import { TeacherReports, TeacherReportDetail } from "../pages/admin/TeacherReports";

function HomeRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  return <Navigate to={role ? ROLE_HOME[role] : "/login"} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route element={<RequireRole allow={["ADMIN", "DIRECTOR"]} />}>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/departements" element={<DirectionDashboard />} />
              <Route path="/enseignants" element={<TeacherList />} />
              <Route path="/enseignants/:teacherId" element={<TeacherDetail />} />
              <Route path="/grades" element={<Grades />} />
              <Route path="/semestres" element={<Semesters />} />
              <Route path="/etudiants" element={<Students />} />
              <Route path="/cours" element={<CoursDepartments />} />
              <Route path="/enrollment" element={<Enrollment />} />
              <Route path="/utilisateurs" element={<Users />} />
              <Route path="/campagnes" element={<Campaigns />} />
              <Route path="/criteres" element={<CriteriaWeights />} />
              <Route path="/analytics" element={<AdvancedAnalytics />} />
              <Route path="/ia-clusters" element={<MlAnalysis />} />
              <Route path="/biais" element={<BiasDetection />} />
              <Route path="/classification" element={<Classification />} />
              <Route path="/alertes" element={<Alerts />} />
              <Route path="/import" element={<DataImport />} />
              <Route path="/signalements" element={<TeacherReports />} />
              <Route path="/signalements/:reportId" element={<TeacherReportDetail />} />
            </Route>
            <Route element={<RequireRole allow={["STUDENT"]} />}>
              <Route path="/accueil" element={<StudentHome />} />
              <Route path="/mes-evaluations" element={<StudentTodo />} />
              <Route path="/mes-rapports" element={<StudentReports />} />
              <Route path="/classement" element={<StudentRank />} />
              <Route path="/evaluer" element={<StudentEvalForm />} />
            </Route>
            <Route element={<RequireRole allow={["TEACHER"]} />}>
              <Route path="/mon-tableau-de-bord" element={<TeacherHome />} />
              <Route path="/fiches-recues" element={<TeacherFiches />} />
              <Route path="/modules-evalues" element={<TeacherModules />} />
              <Route path="/modules-evalues/:courseId" element={<TeacherModuleDetail />} />
              <Route path="/bilan-suggestions" element={<TeacherBilan />} />
            </Route>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
