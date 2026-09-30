import 'package:dio/dio.dart';

import '../../../shared/models/submission.dart';
import 'models/campaign_criterion.dart';
import 'models/evaluable_course.dart';
import 'models/teacher_report.dart';

/// Consomme les endpoints Django existants pour l'espace étudiant — aucun
/// nouvel endpoint inventé : /evaluations/my-courses/, /campaigns/{id}/criteria/
/// (lecture ouverte à tout authentifié — voir apps/campaigns/views.py),
/// /evaluations/submissions/, /evaluations/drafts/, /evaluations/teacher-ranking/
/// (les trois derniers ajoutés côté backend pendant la parité web de cette
/// session — mêmes endpoints que src/services/evaluations.ts côté web).
class StudentRepository {
  StudentRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// GET /api/evaluations/my-courses/
  Future<List<EvaluableCourse>> getEvaluableCourses() async {
    final response = await _dio.get('/evaluations/my-courses/');
    return (response.data as List)
        .map((e) => EvaluableCourse.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// GET /api/campaigns/{campaign_id}/criteria/
  Future<List<CampaignCriterion>> getCampaignCriteria(String campaignId) async {
    final response = await _dio.get('/campaigns/$campaignId/criteria/');
    return (response.data as List)
        .map((e) => CampaignCriterion.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// POST /api/evaluations/submissions/
  Future<void> submitEvaluation({
    required String campaignId,
    required String courseId,
    required String teacherId,
    required List<Map<String, dynamic>> responses,
    required int recommendationScore,
  }) async {
    await _dio.post('/evaluations/submissions/', data: {
      'campaign_id': campaignId,
      'course_id': courseId,
      'teacher_id': teacherId,
      'responses': responses,
      'recommendation_score': recommendationScore,
    });
  }

  /// GET /api/evaluations/submissions/ — les soumissions déjà envoyées par
  /// l'étudiant connecté (queryset scopé côté serveur à `student=user`).
  Future<List<MySubmission>> getMySubmissions() async {
    final response = await _dio.get('/evaluations/submissions/');
    final data = response.data;
    final list = data is List ? data : (data as Map)['results'] as List;
    return list.map((e) => MySubmission.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// PUT /api/evaluations/drafts/ — enregistre (crée ou met à jour) le
  /// brouillon courant, réponses partielles autorisées.
  Future<void> saveDraft({
    required String campaignId,
    required String courseId,
    required String teacherId,
    required List<Map<String, dynamic>> responses,
    int? recommendationScore,
  }) async {
    await _dio.put('/evaluations/drafts/', data: {
      'campaign_id': campaignId,
      'course_id': courseId,
      'teacher_id': teacherId,
      'responses': responses,
      if (recommendationScore != null) 'recommendation_score': recommendationScore,
    });
  }

  /// GET /api/evaluations/drafts/{campaign_id}/{course_id}/?teacher_id=... —
  /// null si aucun brouillon n'existe encore (404). teacher_id requis depuis
  /// qu'un cours peut avoir plusieurs enseignants évaluables (principal +
  /// secondaires) — voir apps/evaluations/views.py::EvaluationDraftDetailAPIView.
  Future<MySubmission?> getDraft({
    required String campaignId,
    required String courseId,
    required String teacherId,
  }) async {
    try {
      final response = await _dio.get(
        '/evaluations/drafts/$campaignId/$courseId/',
        queryParameters: {'teacher_id': teacherId},
      );
      return MySubmission.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// GET /api/evaluations/teacher-ranking/?scope=mine|all — réservé au rôle
  /// STUDENT : moyenne des scores globaux, campagnes clôturées uniquement
  /// (publié à la clôture de chaque campagne), sans seuil de réponses.
  Future<List<TeacherRankingRow>> getTeacherRanking({required String scope}) async {
    final response = await _dio.get('/evaluations/teacher-ranking/', queryParameters: {'scope': scope});
    return (response.data as List)
        .map((e) => TeacherRankingRow.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  /// GET /api/evaluations/teacher-reports/ — signalements de l'étudiant
  /// connecté (scopés côté serveur), avec statut et réponse de l'administration.
  Future<List<TeacherReport>> getMyTeacherReports() async {
    final response = await _dio.get('/evaluations/teacher-reports/');
    final data = response.data;
    final list = data is List ? data : (data as Map)['results'] as List;
    return list.map((e) => TeacherReport.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// POST /api/evaluations/teacher-reports/
  Future<void> createTeacherReport({
    required String teacherId,
    required String title,
    required String description,
  }) async {
    await _dio.post('/evaluations/teacher-reports/', data: {
      'teacher_id': teacherId,
      'title': title,
      'description': description,
    });
  }

  /// GET /api/sync/enrollments/mine/ — enseignants de l'étudiant, dédoublonnés.
  Future<List<ReportableTeacher>> getReportableTeachers() async {
    final response = await _dio.get('/sync/enrollments/mine/');
    final byTeacher = <String, ReportableTeacher>{};
    for (final raw in response.data as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      final teacher = byTeacher.putIfAbsent(
        row['teacher_id'] as String,
        () => ReportableTeacher(teacherId: row['teacher_id'] as String, teacherName: row['teacher_name'] as String),
      );
      final course = row['course_name'] as String;
      if (!teacher.courses.contains(course)) teacher.courses.add(course);
    }
    return byTeacher.values.toList()..sort((a, b) => a.teacherName.compareTo(b.teacherName));
  }
}
