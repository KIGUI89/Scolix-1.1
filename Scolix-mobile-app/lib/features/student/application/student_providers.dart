import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../../../shared/models/submission.dart';
import '../data/models/campaign_criterion.dart';
import '../data/models/evaluable_course.dart';
import '../data/models/teacher_report.dart';
import '../data/student_repository.dart';

final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  return StudentRepository(dio: ref.watch(apiClientProvider).dio);
});

/// Liste des cours à évaluer (écrans Accueil et Mes évaluations) —
/// GET /evaluations/my-courses/.
final evaluableCoursesProvider = FutureProvider.autoDispose<List<EvaluableCourse>>((ref) {
  return ref.watch(studentRepositoryProvider).getEvaluableCourses();
});

/// Critères pondérés d'une campagne (formulaire d'évaluation) —
/// GET /campaigns/{campaign_id}/criteria/.
final campaignCriteriaProvider =
    FutureProvider.autoDispose.family<List<CampaignCriterion>, String>((ref, campaignId) {
  return ref.watch(studentRepositoryProvider).getCampaignCriteria(campaignId);
});

/// Soumissions déjà envoyées par l'étudiant — Mes évaluations (détail),
/// Mon rapport. GET /evaluations/submissions/.
final mySubmissionsProvider = FutureProvider.autoDispose<List<MySubmission>>((ref) {
  return ref.watch(studentRepositoryProvider).getMySubmissions();
});

/// Classement des enseignants — GET /evaluations/teacher-ranking/.
final teacherRankingProvider =
    FutureProvider.autoDispose.family<List<TeacherRankingRow>, String>((ref, scope) {
  return ref.watch(studentRepositoryProvider).getTeacherRanking(scope: scope);
});

/// Signalements de l'étudiant (onglet Rapport) — GET /evaluations/teacher-reports/.
final myTeacherReportsProvider = FutureProvider.autoDispose<List<TeacherReport>>((ref) {
  return ref.watch(studentRepositoryProvider).getMyTeacherReports();
});

/// Enseignants que l'étudiant peut signaler — GET /sync/enrollments/mine/.
final reportableTeachersProvider = FutureProvider.autoDispose<List<ReportableTeacher>>((ref) {
  return ref.watch(studentRepositoryProvider).getReportableTeachers();
});

/// Brouillon existant pour un (campagne, cours, enseignant) donné, s'il y en
/// a un — GET /evaluations/drafts/{campaign_id}/{course_id}/?teacher_id=...
final evaluationDraftProvider = FutureProvider.autoDispose
    .family<MySubmission?, ({String campaignId, String courseId, String teacherId})>((ref, key) {
  return ref.watch(studentRepositoryProvider).getDraft(
        campaignId: key.campaignId,
        courseId: key.courseId,
        teacherId: key.teacherId,
      );
});
