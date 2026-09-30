import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/submission.dart';
import '../../auth/application/auth_controller.dart';
import '../data/models/self_assessment.dart';
import '../data/models/teacher_dashboard.dart';
import '../data/models/teacher_profile.dart';
import '../data/models/teacher_recommendations.dart';
import '../data/models/teacher_scores.dart';
import '../data/teacher_repository.dart';

final teacherRepositoryProvider = Provider<TeacherRepository>((ref) {
  return TeacherRepository(dio: ref.watch(apiClientProvider).dio);
});

/// GET /evaluations/teacher-dashboard/ — écrans Tableau de bord et Modules
/// évalués (voir plan, étape 2 fonctionnalités 5 et 7).
final teacherDashboardProvider = FutureProvider.autoDispose<TeacherDashboard>((ref) {
  return ref.watch(teacherRepositoryProvider).getDashboard();
});

/// GET /teachers/{id}/scores/ — radar + tendance par semestre, écran
/// Tableau de bord (voir plan, étape 2 fonctionnalité 5).
final teacherScoresProvider = FutureProvider.autoDispose<TeacherScores?>((ref) async {
  final user = await ref.watch(authControllerProvider.future);
  final teacherId = user?.teacherProfileId;
  if (teacherId == null) return null;
  return ref.watch(teacherRepositoryProvider).getScores(teacherId);
});

/// GET /teachers/{id}/ — écran Paramètres, complète le profil (filière,
/// grade, spécialité) absent de GET /auth/me/.
final teacherProfileProvider = FutureProvider.autoDispose<TeacherProfile?>((ref) async {
  final user = await ref.watch(authControllerProvider.future);
  final teacherId = user?.teacherProfileId;
  if (teacherId == null) return null;
  return ref.watch(teacherRepositoryProvider).getProfile(teacherId);
});

/// GET /ai/recommendations/{id}/ — écran Bilan, carte "Formations suggérées"
/// (voir plan, étape 2 fonctionnalité 8). Auto-accès confirmé pour TEACHER.
final teacherRecommendationsProvider = FutureProvider.autoDispose<TeacherRecommendations?>((ref) async {
  final user = await ref.watch(authControllerProvider.future);
  final teacherId = user?.teacherProfileId;
  if (teacherId == null) return null;
  return ref.watch(teacherRepositoryProvider).getRecommendations(teacherId);
});

/// GET /evaluations/self-assessment/ — écran Bilan, carte "Auto-évaluation".
final selfAssessmentProvider = FutureProvider.autoDispose<SelfAssessment?>((ref) {
  return ref.watch(teacherRepositoryProvider).getSelfAssessment();
});

/// GET /evaluations/criteria/ (actifs) — questions du formulaire
/// d'auto-évaluation, écran Bilan.
final activeCriteriaProvider = FutureProvider.autoDispose<List<EvaluationCriterion>>((ref) {
  return ref.watch(teacherRepositoryProvider).getActiveCriteria();
});

/// GET /evaluations/submissions/ — écran Fiches reçues (une entrée par
/// soumission, avec module, date et commentaire).
final teacherSubmissionsProvider = FutureProvider.autoDispose<List<MySubmission>>((ref) {
  return ref.watch(teacherRepositoryProvider).getMySubmissions();
});
