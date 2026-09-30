import 'package:dio/dio.dart';

import '../../../shared/models/submission.dart';
import 'models/self_assessment.dart';
import 'models/teacher_dashboard.dart';
import 'models/teacher_profile.dart';
import 'models/teacher_recommendations.dart';
import 'models/teacher_scores.dart';

/// Consomme les endpoints Django existants pour l'espace enseignant —
/// aucun nouvel endpoint : /evaluations/teacher-dashboard/, /teachers/{id}/
/// comments|scores/, /ai/recommendations/{id}/, /evaluations/self-assessment/,
/// /evaluations/criteria/ (auto-accès confirmé pour TEACHER, voir
/// apps/evaluations/teacher_views.py::is_own et apps/ai_engine/views.py) et
/// /evaluations/submissions/ (queryset scopé côté serveur à
/// `teacher=user.teacher_profile`, identité étudiante masquée — voir
/// EvaluationSubmissionViewSet.get_queryset).
class TeacherRepository {
  TeacherRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// GET /api/evaluations/teacher-dashboard/
  Future<TeacherDashboard> getDashboard() async {
    final response = await _dio.get('/evaluations/teacher-dashboard/');
    return TeacherDashboard.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  /// GET /api/evaluations/submissions/ — fiches reçues par l'enseignant
  /// connecté, une entrée par soumission (module, date, score, commentaire).
  Future<List<MySubmission>> getMySubmissions() async {
    final response = await _dio.get('/evaluations/submissions/');
    final data = response.data;
    final list = data is List ? data : (data as Map)['results'] as List;
    return list.map((e) => MySubmission.fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  /// GET /api/teachers/{teacher_id}/ — écran Paramètres (filière/grade/
  /// spécialité, absents de GET /auth/me/).
  Future<TeacherProfile> getProfile(String teacherId) async {
    final response = await _dio.get('/teachers/$teacherId/');
    return TeacherProfile.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  /// GET /api/teachers/{teacher_id}/scores/
  Future<TeacherScores> getScores(String teacherId) async {
    final response = await _dio.get('/teachers/$teacherId/scores/');
    return TeacherScores.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  /// GET /api/ai/recommendations/{teacher_id}/
  Future<TeacherRecommendations> getRecommendations(String teacherId) async {
    final response = await _dio.get('/ai/recommendations/$teacherId/');
    return TeacherRecommendations.fromJson(Map<String, dynamic>.from(response.data as Map));
  }

  /// GET /api/evaluations/self-assessment/ — null si aucune auto-évaluation
  /// n'a encore été soumise pour le semestre courant (404).
  Future<SelfAssessment?> getSelfAssessment() async {
    try {
      final response = await _dio.get('/evaluations/self-assessment/');
      return SelfAssessment.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// PUT /api/evaluations/self-assessment/ — crée ou remplace l'auto-évaluation.
  Future<void> saveSelfAssessment(List<Map<String, dynamic>> responses) async {
    await _dio.put('/evaluations/self-assessment/', data: {'responses': responses});
  }

  /// GET /api/evaluations/criteria/ — filtré aux critères actifs, comme
  /// listCriteria().filter(is_active) côté web.
  Future<List<EvaluationCriterion>> getActiveCriteria() async {
    final response = await _dio.get('/evaluations/criteria/');
    final data = response.data;
    final list = data is List ? data : (data as Map)['results'] as List;
    return list
        .map((e) => EvaluationCriterion.fromJson(Map<String, dynamic>.from(e as Map)))
        .where((c) => c.isActive)
        .toList();
  }
}
