/// Miroir de SelfAssessmentView (apps/evaluations/) —
/// GET/PUT /api/evaluations/self-assessment/, réservé au rôle TEACHER
/// (même contrat que src/services/evaluations.ts::getSelfAssessment côté web).
class SelfAssessmentResponse {
  const SelfAssessmentResponse({required this.criteriaId, required this.criteriaName, required this.score});

  factory SelfAssessmentResponse.fromJson(Map<String, dynamic> json) => SelfAssessmentResponse(
        criteriaId: json['criteria'] as String,
        criteriaName: json['criteria_name'] as String,
        score: json['score'] as int,
      );

  final String criteriaId;
  final String criteriaName;
  final int score;
}

class SelfAssessment {
  const SelfAssessment({required this.semesterName, required this.submittedAt, required this.responses});

  factory SelfAssessment.fromJson(Map<String, dynamic> json) => SelfAssessment(
        semesterName: json['semester_name'] as String,
        submittedAt: DateTime.tryParse('${json['submitted_at']}') ?? DateTime.now(),
        responses: (json['responses'] as List? ?? [])
            .map((e) => SelfAssessmentResponse.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  final String semesterName;
  final DateTime submittedAt;
  final List<SelfAssessmentResponse> responses;
}

/// Miroir de CriterionSerializer — GET /api/evaluations/criteria/.
class EvaluationCriterion {
  const EvaluationCriterion({required this.id, required this.name, required this.isActive});

  factory EvaluationCriterion.fromJson(Map<String, dynamic> json) => EvaluationCriterion(
        id: json['id'] as String,
        name: json['name'] as String,
        isActive: json['is_active'] as bool? ?? true,
      );

  final String id;
  final String name;
  final bool isActive;
}
