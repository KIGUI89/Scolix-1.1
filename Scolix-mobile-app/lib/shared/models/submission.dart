/// Miroir de EvaluationSubmissionSerializer (apps/evaluations/serializers.py) —
/// GET /api/evaluations/submissions/. Partagé étudiant (ses propres
/// soumissions) et enseignant (soumissions reçues, `student`/`student_email`
/// absents de la réponse pour ce rôle — anonymisation faite côté serveur,
/// voir to_representation).
class SubmissionResponse {
  const SubmissionResponse({
    required this.id,
    required this.criteriaId,
    required this.criteriaName,
    required this.criteriaCategory,
    required this.score,
    required this.comment,
  });

  factory SubmissionResponse.fromJson(Map<String, dynamic> json) => SubmissionResponse(
        id: json['id'] as String,
        criteriaId: json['criteria'] as String,
        criteriaName: json['criteria_name'] as String,
        criteriaCategory: json['criteria_category'] as String,
        score: json['score'] as int,
        comment: json['comment'] as String?,
      );

  final String id;
  final String criteriaId;
  final String criteriaName;
  final String criteriaCategory;
  final int score;
  final String? comment;
}

class MySubmission {
  const MySubmission({
    required this.id,
    required this.campaignId,
    required this.campaignTitle,
    required this.courseId,
    required this.courseName,
    required this.courseCode,
    required this.teacherId,
    required this.teacherName,
    required this.status,
    required this.globalScore,
    required this.recommendationScore,
    required this.submittedAt,
    required this.responses,
  });

  factory MySubmission.fromJson(Map<String, dynamic> json) => MySubmission(
        id: json['id'] as String,
        campaignId: json['campaign'] as String,
        campaignTitle: json['campaign_title'] as String,
        courseId: json['course'] as String,
        courseName: json['course_name'] as String,
        courseCode: json['course_code'] as String,
        teacherId: json['teacher'] as String,
        teacherName: json['teacher_name'] as String,
        status: json['status'] as String,
        globalScore: double.tryParse('${json['global_score']}'),
        recommendationScore: json['recommendation_score'] as int?,
        submittedAt: json['submitted_at'] == null ? null : DateTime.tryParse('${json['submitted_at']}'),
        responses: (json['responses'] as List)
            .map((e) => SubmissionResponse.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  final String id;
  final String campaignId;
  final String campaignTitle;
  final String courseId;
  final String courseName;
  final String courseCode;
  final String teacherId;
  final String teacherName;
  final String status;
  final double? globalScore;
  final int? recommendationScore;
  final DateTime? submittedAt;
  final List<SubmissionResponse> responses;

  bool get isSubmitted => status == 'SUBMITTED';

  /// Premier commentaire libre non vide (un seul par soumission dans le flux
  /// actuel — voir EvaluationFormScreen côté client, StudentEvalForm côté web).
  String? get firstComment {
    for (final r in responses) {
      if (r.comment != null && r.comment!.trim().isNotEmpty) return r.comment;
    }
    return null;
  }
}

/// Miroir de TeacherRankingStudentAPIView (apps/evaluations/views.py) —
/// GET /api/evaluations/teacher-ranking/, réservé au rôle STUDENT.
class TeacherRankingRow {
  const TeacherRankingRow({
    required this.rank,
    required this.teacherId,
    required this.teacherName,
    required this.departmentName,
    required this.avgScore,
    required this.totalEvaluations,
  });

  factory TeacherRankingRow.fromJson(Map<String, dynamic> json) => TeacherRankingRow(
        rank: json['rank'] as int,
        teacherId: json['teacher_id'] as String,
        teacherName: json['teacher_name'] as String,
        departmentName: json['department_name'] as String? ?? '',
        avgScore: double.tryParse('${json['avg_score']}') ?? 0,
        totalEvaluations: json['total_evaluations'] as int,
      );

  final int rank;
  final String teacherId;
  final String teacherName;
  final String departmentName;
  final double avgScore;
  final int totalEvaluations;
}
