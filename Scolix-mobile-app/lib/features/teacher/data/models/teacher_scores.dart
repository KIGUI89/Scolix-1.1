/// Miroir de TeacherScoresView (apps/evaluations/teacher_views.py) —
/// GET /api/teachers/{teacher_id}/scores/, en auto-accès pour TEACHER.
/// Alimente le radar (critères, 0–10) et la tendance par semestre (score
/// global, 0–100) de l'écran Tableau de bord.
class TeacherScores {
  const TeacherScores({required this.criteriaScores, required this.semesterHistory});

  factory TeacherScores.fromJson(Map<String, dynamic> json) => TeacherScores(
        criteriaScores: (json['criteria_scores'] as List)
            .map((e) => TeacherCriteriaScore.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
        semesterHistory: (json['semester_history'] as List)
            .map((e) => TeacherSemesterScore.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  final List<TeacherCriteriaScore> criteriaScores;
  final List<TeacherSemesterScore> semesterHistory;
}

class TeacherCriteriaScore {
  const TeacherCriteriaScore({required this.name, required this.avgScore});

  factory TeacherCriteriaScore.fromJson(Map<String, dynamic> json) => TeacherCriteriaScore(
        name: json['criteria_name'] as String,
        avgScore: double.tryParse('${json['avg_score']}') ?? 0,
      );

  final String name;
  final double avgScore;
}

class TeacherSemesterScore {
  const TeacherSemesterScore({required this.semesterName, required this.avgScore});

  factory TeacherSemesterScore.fromJson(Map<String, dynamic> json) => TeacherSemesterScore(
        semesterName: json['semester_name'] as String,
        avgScore: double.tryParse('${json['avg_score']}') ?? 0,
      );

  final String semesterName;
  final double avgScore;
}
