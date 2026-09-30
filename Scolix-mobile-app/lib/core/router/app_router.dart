import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/data/models/app_user.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/auth/presentation/unsupported_role_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/student/presentation/evaluation_form_screen.dart';
import '../../features/student/presentation/student_evaluations_screen.dart';
import '../../features/student/presentation/student_home_screen.dart';
import '../../features/student/presentation/student_ranking_screen.dart';
import '../../features/student/presentation/student_report_screen.dart';
import '../../features/student/presentation/student_shell.dart';
import '../../features/teacher/presentation/teacher_dashboard_screen.dart';
import '../../features/teacher/presentation/teacher_feedback_screen.dart';
import '../../features/teacher/presentation/teacher_modules_screen.dart';
import '../../features/teacher/presentation/teacher_shell.dart';
import '../../features/teacher/presentation/teacher_summary_screen.dart';

const _splash = '/splash';
const _login = '/login';
const _student = '/student';
const _teacher = '/teacher';
const _unsupportedRole = '/unsupported-role';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Garde d'accès par rôle : redirige vers le tableau de bord du bon
/// espace selon l'état de session, et bloque explicitement ADMIN/DIRECTOR
/// (réservés au web) plutôt que de les laisser échouer silencieusement.
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: _splash,
    redirect: (context, state) {
      final loggingIn = state.matchedLocation == _login;
      final onSplash = state.matchedLocation == _splash;

      if (authState.isLoading) return onSplash ? null : _splash;

      final user = authState.value;

      if (user == null) return loggingIn ? null : _login;

      final target = switch (user.role) {
        UserRole.student => _student,
        UserRole.teacher => _teacher,
        _ => _unsupportedRole,
      };

      // startsWith (pas ==) : les routes imbriquées sous /student/... ou
      // /teacher/... doivent rester accessibles, pas seulement la racine.
      if (state.matchedLocation.startsWith(target)) return null;
      return target;
    },
    routes: [
      GoRoute(path: _splash, builder: (context, state) => const SplashScreen()),
      GoRoute(path: _login, builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: _unsupportedRole,
        builder: (context, state) => const UnsupportedRoleScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => StudentShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: _student, builder: (context, state) => const StudentHomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '$_student/evaluations',
                builder: (context, state) => const StudentEvaluationsScreen(),
                routes: [
                  GoRoute(
                    path: 'form/:campaignId/:courseId/:teacherId',
                    builder: (context, state) => EvaluationFormScreen(
                      campaignId: state.pathParameters['campaignId']!,
                      courseId: state.pathParameters['courseId']!,
                      teacherId: state.pathParameters['teacherId']!,
                    ),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_student/report', builder: (context, state) => const StudentReportScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_student/ranking', builder: (context, state) => const StudentRankingScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_student/settings', builder: (context, state) => const SettingsScreen()),
            ],
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => TeacherShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: _teacher, builder: (context, state) => const TeacherDashboardScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_teacher/feedback', builder: (context, state) => const TeacherFeedbackScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_teacher/modules', builder: (context, state) => const TeacherModulesScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_teacher/summary', builder: (context, state) => const TeacherSummaryScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '$_teacher/settings', builder: (context, state) => const SettingsScreen()),
            ],
          ),
        ],
      ),
    ],
  );
});
