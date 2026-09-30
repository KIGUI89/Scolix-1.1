/// Miroir de TeacherRecommendationsView (apps/ai_engine/) —
/// GET /api/ai/recommendations/{teacher_id}/, auto-accès confirmé pour
/// TEACHER (même contrat que src/services/aiEngine.ts côté web).
class TrainingCatalogEntry {
  const TrainingCatalogEntry({required this.id, required this.title, required this.provider, required this.url});

  factory TrainingCatalogEntry.fromJson(Map<String, dynamic> json) => TrainingCatalogEntry(
        id: json['id'] as String,
        title: json['title'] as String,
        provider: json['provider'] as String? ?? '',
        url: json['url'] as String? ?? '',
      );

  final String id;
  final String title;
  final String provider;
  final String url;
}

class CriteriaRecommendation {
  const CriteriaRecommendation({
    required this.criteriaId,
    required this.criteriaName,
    required this.avgScore,
    required this.recommendation,
    required this.trainings,
  });

  factory CriteriaRecommendation.fromJson(Map<String, dynamic> json) => CriteriaRecommendation(
        criteriaId: json['criteria_id'] as String,
        criteriaName: json['criteria_name'] as String,
        avgScore: double.tryParse('${json['avg_score']}') ?? 0,
        recommendation: json['recommendation'] as String? ?? '',
        trainings: (json['trainings'] as List? ?? [])
            .map((e) => TrainingCatalogEntry.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  final String criteriaId;
  final String criteriaName;
  final double avgScore;
  final String recommendation;
  final List<TrainingCatalogEntry> trainings;
}

class TeacherRecommendations {
  const TeacherRecommendations({required this.globalAvg, required this.recommendations});

  factory TeacherRecommendations.fromJson(Map<String, dynamic> json) => TeacherRecommendations(
        globalAvg: json['global_avg'] == null ? null : double.tryParse('${json['global_avg']}'),
        recommendations: (json['recommendations'] as List? ?? [])
            .map((e) => CriteriaRecommendation.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList(),
      );

  final double? globalAvg;
  final List<CriteriaRecommendation> recommendations;
}
