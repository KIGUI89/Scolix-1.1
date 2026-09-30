/// Miroir de TeacherDashboardSerializer (apps/evaluations/serializers.py) —
/// GET /api/evaluations/teacher-dashboard/.
class TeacherDashboard {
  const TeacherDashboard({
    required this.teacherName,
    required this.teacherEmail,
    required this.totalEvaluations,
    required this.globalAverage,
    required this.criteriaAverages,
    required this.evaluatedCourses,
    required this.totalEnrolled,
  });

  factory TeacherDashboard.fromJson(Map<String, dynamic> json) => TeacherDashboard(
        teacherName: json['teacher_name'] as String,
        teacherEmail: json['teacher_email'] as String,
        totalEvaluations: json['total_evaluations'] as int,
        globalAverage: double.tryParse('${json['global_average']}') ?? 0,
        criteriaAverages: (json['criteria_averages'] as List)
            .map((e) => CriteriaAverage.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        evaluatedCourses: (json['evaluated_courses'] as List)
            .map((e) => EvaluatedCourseSummary.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        totalEnrolled: json['total_enrolled'] as int,
      );

  final String teacherName;
  final String teacherEmail;
  final int totalEvaluations;
  final double globalAverage;
  final List<CriteriaAverage> criteriaAverages;
  final List<EvaluatedCourseSummary> evaluatedCourses;

  /// Nombre réel d'étudiants inscrits ce semestre, tous modules confondus —
  /// alimente le "Taux de réponse" (voir services.py::get_teacher_dashboard).
  final int totalEnrolled;
}

/// Moyenne 0–10 par critère, toutes campagnes confondues — pas de moyenne de
/// département dans cette réponse (voir plan étape 0 point 2 : /analytics/
/// heatmap/ réservé à ADMIN/DIRECTOR) : le radar n'affiche donc que "vous".
class CriteriaAverage {
  const CriteriaAverage({
    required this.criteriaId,
    required this.name,
    required this.category,
    required this.averageScore,
    required this.totalResponses,
  });

  factory CriteriaAverage.fromJson(Map<String, dynamic> json) => CriteriaAverage(
        criteriaId: json['criteria__id'] as String,
        name: json['criteria__name'] as String,
        category: json['criteria__category'] as String,
        averageScore: double.tryParse('${json['average_score']}') ?? 0,
        totalResponses: json['total_responses'] as int,
      );

  final String criteriaId;
  final String name;
  final String category;
  final double averageScore;
  final int totalResponses;
}

/// Moyenne 0–100 (global_score) par cours — alimente l'écran "Modules évalués".
class EvaluatedCourseSummary {
  const EvaluatedCourseSummary({
    required this.courseId,
    required this.courseCode,
    required this.courseName,
    required this.totalEvaluations,
    required this.averageScore,
    required this.enrolledCount,
    required this.scoreDelta,
  });

  factory EvaluatedCourseSummary.fromJson(Map<String, dynamic> json) => EvaluatedCourseSummary(
        courseId: json['course__id'] as String,
        courseCode: json['course__code'] as String,
        courseName: json['course__name'] as String,
        totalEvaluations: json['total_evaluations'] as int,
        averageScore: double.tryParse('${json['average_score']}') ?? 0,
        enrolledCount: json['enrolled_count'] as int,
        scoreDelta: json['score_delta'] == null ? null : double.tryParse('${json['score_delta']}'),
      );

  final String courseId;
  final String courseCode;
  final String courseName;
  final int totalEvaluations;
  final double averageScore;

  /// Nombre réel d'étudiants inscrits à ce cours ce semestre.
  final int enrolledCount;

  /// Évolution du score global entre ce semestre et le précédent où le
  /// module a été évalué — null si un seul semestre d'historique existe.
  final double? scoreDelta;
}
