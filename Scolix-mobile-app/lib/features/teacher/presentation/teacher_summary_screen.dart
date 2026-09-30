import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../application/teacher_providers.dart';
import '../data/models/self_assessment.dart';
import '../data/models/teacher_recommendations.dart';

const _likertLabels = ['Insuffisant', 'Perfectible', 'Satisfaisant', 'Bien', 'Excellent'];
const _likertToScore = [2, 4, 6, 8, 10];

const _monthsFr = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

String _fmtDate(DateTime d) => '${d.day.toString().padLeft(2, '0')} ${_monthsFr[d.month - 1]} ${d.year}';

/// Écran 09 de la maquette — Bilan et suggestions.
///
/// Reconstruit à l'identique de TeacherBilan.tsx côté web : recommandations
/// via GET /ai/recommendations/{teacher_id}/ (auto-accès TEACHER confirmé,
/// contrairement à l'hypothèse initiale) et auto-évaluation éditable via
/// GET/PUT /evaluations/self-assessment/. Le bouton "Accuser réception" de
/// la maquette n'a pas d'équivalent backend ; remplacé par l'action réelle
/// disponible ici — soumettre/mettre à jour l'auto-évaluation.
class TeacherSummaryScreen extends ConsumerStatefulWidget {
  const TeacherSummaryScreen({super.key});

  @override
  ConsumerState<TeacherSummaryScreen> createState() => _TeacherSummaryScreenState();
}

class _TeacherSummaryScreenState extends ConsumerState<TeacherSummaryScreen> {
  bool _editing = false;
  final Map<String, int> _answers = {};
  bool _saving = false;
  String? _saveError;

  void _startEditing() {
    setState(() {
      _answers.clear();
      _saveError = null;
      _editing = true;
    });
  }

  Future<void> _save(List<EvaluationCriterion> criteria) async {
    setState(() {
      _saving = true;
      _saveError = null;
    });
    final responses = criteria
        .where((c) => _answers.containsKey(c.id))
        .map((c) => {'criteria_id': c.id, 'score': _likertToScore[_answers[c.id]! - 1]})
        .toList();
    try {
      await ref.read(teacherRepositoryProvider).saveSelfAssessment(responses);
      ref.invalidate(selfAssessmentProvider);
      if (mounted) setState(() => _editing = false);
    } on DioException catch (e) {
      if (mounted) {
        setState(() => _saveError = apiErrorMessage(e, fallback: 'Impossible d\'enregistrer l\'auto-évaluation. Réessayez.'));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final recosAsync = ref.watch(teacherRecommendationsProvider);
    final assessmentAsync = ref.watch(selfAssessmentProvider);
    final criteriaAsync = ref.watch(activeCriteriaProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(teacherRecommendationsProvider);
          ref.invalidate(selfAssessmentProvider);
          ref.invalidate(activeCriteriaProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Bilan', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 20),
            Text('Formations suggérées', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            recosAsync.when(
              loading: () => const _MessageCard(child: Center(child: CircularProgressIndicator())),
              error: (error, _) => _MessageCard(
                child: Text('Recommandations indisponibles pour le moment.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
              ),
              data: (recos) {
                if (recos == null || recos.recommendations.isEmpty) {
                  return _MessageCard(
                    child: Text(
                      'Aucune recommandation pour le moment — vos scores ne signalent pas de critère à renforcer.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  );
                }
                return Column(
                  children: [
                    for (final r in recos.recommendations) _RecommendationCard(recommendation: r),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Text('Auto-évaluation', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            criteriaAsync.when(
              loading: () => const _MessageCard(child: Center(child: CircularProgressIndicator())),
              error: (error, _) => _MessageCard(
                child: Text(apiErrorMessage(error, fallback: 'Impossible de charger les critères.')),
              ),
              data: (criteria) {
                if (_editing) {
                  return _SelfAssessmentForm(
                    criteria: criteria,
                    answers: _answers,
                    saving: _saving,
                    saveError: _saveError,
                    onSelect: (criteriaId, level) => setState(() => _answers[criteriaId] = level),
                    onCancel: _saving ? () {} : () => setState(() => _editing = false),
                    onSubmit: () => _save(criteria),
                  );
                }
                return assessmentAsync.when(
                  loading: () => const _MessageCard(child: Center(child: CircularProgressIndicator())),
                  error: (error, _) => _MessageCard(
                    child: Text(apiErrorMessage(error, fallback: 'Impossible de charger votre auto-évaluation.')),
                  ),
                  data: (assessment) => _SelfAssessmentSummary(
                    assessment: assessment,
                    canEdit: criteria.isNotEmpty,
                    onStart: _startEditing,
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(16), child: child));
}

class _RecommendationCard extends StatelessWidget {
  const _RecommendationCard({required this.recommendation});
  final CriteriaRecommendation recommendation;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(recommendation.criteriaName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                ),
                Text('${recommendation.avgScore.toStringAsFixed(1)}/10',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
              ],
            ),
            const SizedBox(height: 6),
            Text(recommendation.recommendation, style: Theme.of(context).textTheme.bodyMedium),
            if (recommendation.trainings.isNotEmpty) ...[
              const SizedBox(height: 8),
              for (final t in recommendation.trainings)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: t.url.isEmpty
                      ? Text(t.title,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant))
                      : InkWell(
                          onTap: () => launchUrl(Uri.parse(t.url), mode: LaunchMode.externalApplication),
                          child: Text(t.title,
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(color: colorScheme.primary, decoration: TextDecoration.underline)),
                        ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SelfAssessmentSummary extends StatelessWidget {
  const _SelfAssessmentSummary({required this.assessment, required this.canEdit, required this.onStart});

  final SelfAssessment? assessment;
  final bool canEdit;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final assessment = this.assessment;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Comparez votre propre lecture des critères avec vos résultats étudiants.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            if (assessment == null)
              Text('Aucune auto-évaluation soumise pour le moment.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant))
            else ...[
              Text(
                'Soumise le ${_fmtDate(assessment.submittedAt)} — ${assessment.semesterName}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 10),
              for (final r in assessment.responses)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Expanded(child: Text(r.criteriaName, style: Theme.of(context).textTheme.bodyMedium)),
                      Text('${r.score}/10', style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
            ],
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: canEdit ? onStart : null,
              child: Text(assessment != null ? 'Mettre à jour mon auto-évaluation' : 'Remplir mon auto-évaluation'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SelfAssessmentForm extends StatelessWidget {
  const _SelfAssessmentForm({
    required this.criteria,
    required this.answers,
    required this.saving,
    required this.saveError,
    required this.onSelect,
    required this.onCancel,
    required this.onSubmit,
  });

  final List<EvaluationCriterion> criteria;
  final Map<String, int> answers;
  final bool saving;
  final String? saveError;
  final void Function(String criteriaId, int level) onSelect;
  final VoidCallback onCancel;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final answered = answers.length;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final c in criteria) ...[
              Text(c.name, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (var i = 0; i < _likertLabels.length; i++)
                    _LikertOption(
                      index: i + 1,
                      label: _likertLabels[i],
                      selected: answers[c.id] == i + 1,
                      onTap: () => onSelect(c.id, i + 1),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            if (saveError != null) ...[
              Text(saveError!, style: TextStyle(color: colorScheme.error, fontSize: 12)),
              const SizedBox(height: 12),
            ],
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: answered < criteria.length || saving ? null : onSubmit,
                    child: saving
                        ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Envoyer'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: saving ? null : onCancel,
                    child: const Text('Annuler'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LikertOption extends StatelessWidget {
  const _LikertOption({required this.index, required this.label, required this.selected, required this.onTap});

  final int index;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        constraints: const BoxConstraints(minWidth: 92),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? colorScheme.primary.withValues(alpha: 0.1) : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? colorScheme.primary : Colors.transparent, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$index', style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
            Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
