/// Miroir de CampaignCriteriaSerializer (apps/evaluations/serializers.py) —
/// un critère pondéré configuré pour une campagne donnée, tel que renvoyé
/// par GET /api/campaigns/{campaign_id}/criteria/.
class CampaignCriterion {
  const CampaignCriterion({
    required this.id,
    required this.criteriaId,
    required this.name,
    required this.category,
    required this.description,
    required this.percentage,
  });

  factory CampaignCriterion.fromJson(Map<String, dynamic> json) => CampaignCriterion(
        id: json['id'] as String,
        criteriaId: json['criteria'] as String,
        name: json['criteria_name'] as String,
        category: json['criteria_category'] as String,
        description: json['criteria_description'] as String? ?? '',
        percentage: double.tryParse('${json['percentage']}') ?? 0,
      );

  final String id;
  final String criteriaId;
  final String name;
  final String category;
  final String description;
  final double percentage;
}
