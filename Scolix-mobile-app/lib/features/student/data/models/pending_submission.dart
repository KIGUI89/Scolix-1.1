/// Une soumission d'évaluation en attente de synchronisation — créée quand
/// POST /evaluations/submissions/ échoue faute de réseau, persistée
/// localement puis rejouée à la reconnexion (voir OfflineQueueService).
class PendingSubmission {
  const PendingSubmission({
    required this.localId,
    required this.campaignId,
    required this.courseId,
    required this.courseName,
    required this.teacherId,
    required this.responses,
    required this.recommendationScore,
    required this.queuedAt,
  });

  factory PendingSubmission.fromJson(Map<String, dynamic> json) => PendingSubmission(
        localId: json['local_id'] as String,
        campaignId: json['campaign_id'] as String,
        courseId: json['course_id'] as String,
        courseName: json['course_name'] as String,
        teacherId: json['teacher_id'] as String,
        responses: (json['responses'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList(),
        recommendationScore: json['recommendation_score'] as int,
        queuedAt: DateTime.parse(json['queued_at'] as String),
      );

  final String localId;
  final String campaignId;
  final String courseId;
  final String courseName;
  final String teacherId;
  final List<Map<String, dynamic>> responses;
  final int recommendationScore;
  final DateTime queuedAt;

  Map<String, dynamic> toJson() => {
        'local_id': localId,
        'campaign_id': campaignId,
        'course_id': courseId,
        'course_name': courseName,
        'teacher_id': teacherId,
        'responses': responses,
        'recommendation_score': recommendationScore,
        'queued_at': queuedAt.toIso8601String(),
      };
}
