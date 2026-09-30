/// Signalement d'un étudiant sur un enseignant —
/// GET/POST /api/evaluations/teacher-reports/ (mêmes champs que le web).
class TeacherReport {
  const TeacherReport({
    required this.id,
    required this.teacherName,
    required this.title,
    required this.description,
    required this.status,
    required this.adminResponse,
    required this.responseAt,
    required this.createdAt,
  });

  final String id;
  final String teacherName;
  final String title;
  final String description;

  /// NEW | READ | TREATED
  final String status;
  final String? adminResponse;
  final DateTime? responseAt;
  final DateTime createdAt;

  String get statusLabel => switch (status) {
        'NEW' => 'Nouveau',
        'READ' => 'Lu',
        'TREATED' => 'Traité',
        _ => status,
      };

  factory TeacherReport.fromJson(Map<String, dynamic> json) => TeacherReport(
        id: json['id'] as String,
        teacherName: (json['teacher_name'] as String?) ?? '',
        title: json['title'] as String,
        description: json['description'] as String,
        status: (json['status'] as String?) ?? 'NEW',
        adminResponse: json['admin_response'] as String?,
        responseAt: json['response_at'] != null ? DateTime.parse(json['response_at'] as String).toLocal() : null,
        createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
      );
}

/// Enseignant signalable : issu de GET /api/sync/enrollments/mine/, dédoublonné
/// par enseignant (même logique que TeacherReportFormModal côté web).
class ReportableTeacher {
  ReportableTeacher({required this.teacherId, required this.teacherName});

  final String teacherId;
  final String teacherName;
  final List<String> courses = [];
}
