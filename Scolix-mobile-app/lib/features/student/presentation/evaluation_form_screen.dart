import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/scolix_colors.dart';
import '../../../shared/models/submission.dart';
import '../../../shared/widgets/error_state.dart';
import '../application/offline_queue_controller.dart';
import '../application/student_providers.dart';
import '../data/models/campaign_criterion.dart';
import '../data/models/evaluable_course.dart';
import '../data/models/pending_submission.dart';

const _scaleLabels = [
  'Pas du tout d\'accord',
  'Plutôt pas d\'accord',
  'Neutre',
  'Plutôt d\'accord',
  'Tout à fait d\'accord',
];

/// Écran 03 de la maquette — Formulaire d'évaluation.
///
/// GET /campaigns/{campaign_id}/criteria/ pour les questions,
/// POST /evaluations/submissions/ pour l'envoi (voir plan, étape 2
/// fonctionnalité 2). L'échelle Likert 1–5 de la maquette est convertie en
/// score 0–10 attendu par le backend (option i -> score (i+1)*2).
///
/// Le backend exige aussi une note de recommandation (0–10, NPS) que la
/// maquette ne dépeint pas explicitement : ajoutée comme dernière page du
/// formulaire, seul moyen de satisfaire ce champ obligatoire sans inventer
/// un endpoint de soumission partielle.
class EvaluationFormScreen extends ConsumerStatefulWidget {
  const EvaluationFormScreen({
    super.key,
    required this.campaignId,
    required this.courseId,
    required this.teacherId,
  });

  final String campaignId;
  final String courseId;
  final String teacherId;

  @override
  ConsumerState<EvaluationFormScreen> createState() => _EvaluationFormScreenState();
}

class _EvaluationFormScreenState extends ConsumerState<EvaluationFormScreen> {
  final Map<String, int> _scores = {};
  int _recommendationScore = 5;
  bool _recommendationTouched = false;
  int _pageIndex = 0;
  bool _submitting = false;
  bool _savingDraft = false;
  String? _submitError;
  bool _isOffline = false;
  bool _draftLoaded = false;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  @override
  void initState() {
    super.initState();
    Connectivity().checkConnectivity().then((results) {
      if (mounted) setState(() => _isOffline = results.every((r) => r == ConnectivityResult.none));
    });
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (mounted) setState(() => _isOffline = results.every((r) => r == ConnectivityResult.none));
    });
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  Future<void> _submit(List<CampaignCriterion> criteria, EvaluableCourse course) async {
    setState(() {
      _submitting = true;
      _submitError = null;
    });

    final responses = criteria
        .map((c) => {'criteria_id': c.criteriaId, 'score': _scores[c.criteriaId] ?? 6})
        .toList();

    try {
      await ref.read(studentRepositoryProvider).submitEvaluation(
            campaignId: widget.campaignId,
            courseId: widget.courseId,
            teacherId: widget.teacherId,
            responses: responses,
            recommendationScore: _recommendationScore,
          );
      ref.invalidate(evaluableCoursesProvider);
      if (mounted) context.go('/student/evaluations');
    } on DioException catch (e) {
      final isConnectivityIssue =
          e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout;
      if (isConnectivityIssue) {
        await ref.read(offlineQueueControllerProvider.notifier).enqueue(
              PendingSubmission(
                localId: '${widget.campaignId}_${widget.courseId}_${widget.teacherId}_${DateTime.now().millisecondsSinceEpoch}',
                campaignId: widget.campaignId,
                courseId: widget.courseId,
                courseName: course.courseName,
                teacherId: widget.teacherId,
                responses: responses,
                recommendationScore: _recommendationScore,
                queuedAt: DateTime.now(),
              ),
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Hors ligne : réponses mises en file, seront synchronisées à la reconnexion.')),
          );
          context.go('/student/evaluations');
        }
      } else {
        setState(() => _submitError = apiErrorMessage(e, fallback: 'Échec de l\'envoi de vos réponses.'));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _saveDraftAndExit(List<CampaignCriterion> criteria) async {
    setState(() => _savingDraft = true);
    final responses = criteria
        .where((c) => _scores.containsKey(c.criteriaId))
        .map((c) => {'criteria_id': c.criteriaId, 'score': _scores[c.criteriaId]})
        .toList();

    try {
      await ref.read(studentRepositoryProvider).saveDraft(
            campaignId: widget.campaignId,
            courseId: widget.courseId,
            teacherId: widget.teacherId,
            responses: responses,
            recommendationScore: _recommendationTouched ? _recommendationScore : null,
          );
      ref.invalidate(evaluableCoursesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Brouillon enregistré — vous pourrez reprendre plus tard.')),
        );
        context.go('/student/evaluations');
      }
    } on DioException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(apiErrorMessage(e, fallback: 'Échec de l\'enregistrement du brouillon.'))),
        );
      }
    } finally {
      if (mounted) setState(() => _savingDraft = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(evaluableCoursesProvider);
    final criteriaAsync = ref.watch(campaignCriteriaProvider(widget.campaignId));

    return SafeArea(
      child: coursesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorState(
          message: apiErrorMessage(error, fallback: 'Impossible de charger ce cours.'),
          onRetry: () => ref.invalidate(evaluableCoursesProvider),
        ),
        data: (courses) {
          final matches = courses.where((c) => c.courseId == widget.courseId && c.teacherId == widget.teacherId);
          final course = matches.isEmpty ? null : matches.first;
          if (course == null) {
            return const Center(child: Text('Cette évaluation n\'est plus disponible.'));
          }

          if (course.hasDraft) {
            ref.listen<AsyncValue<MySubmission?>>(
              evaluationDraftProvider((
                campaignId: widget.campaignId,
                courseId: widget.courseId,
                teacherId: widget.teacherId,
              )),
              (previous, next) {
                final draft = next.valueOrNull;
                if (draft == null || _draftLoaded) return;
                _draftLoaded = true;
                setState(() {
                  for (final r in draft.responses) {
                    _scores[r.criteriaId] = r.score;
                  }
                  if (draft.recommendationScore != null) {
                    _recommendationScore = draft.recommendationScore!;
                    _recommendationTouched = true;
                  }
                });
              },
            );
          }

          return criteriaAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => ErrorState(
              message: apiErrorMessage(error, fallback: 'Impossible de charger les critères.'),
              onRetry: () => ref.invalidate(campaignCriteriaProvider(widget.campaignId)),
            ),
            data: (criteria) => _FormBody(
              course: course,
              criteria: criteria,
              pageIndex: _pageIndex,
              scores: _scores,
              recommendationScore: _recommendationScore,
              submitting: _submitting,
              savingDraft: _savingDraft,
              submitError: _submitError,
              isOffline: _isOffline,
              onSelectScore: (criteriaId, score) => setState(() => _scores[criteriaId] = score),
              onRecommendationChanged: (v) => setState(() {
                _recommendationScore = v;
                _recommendationTouched = true;
              }),
              onPrevious: () => setState(() => _pageIndex -= 1),
              onNext: () {
                if (_pageIndex < criteria.length) {
                  setState(() => _pageIndex += 1);
                } else {
                  _submit(criteria, course);
                }
              },
              onSaveDraft: () => _saveDraftAndExit(criteria),
            ),
          );
        },
      ),
    );
  }
}

class _FormBody extends StatelessWidget {
  const _FormBody({
    required this.course,
    required this.criteria,
    required this.pageIndex,
    required this.scores,
    required this.recommendationScore,
    required this.submitting,
    required this.savingDraft,
    required this.submitError,
    required this.isOffline,
    required this.onSelectScore,
    required this.onRecommendationChanged,
    required this.onPrevious,
    required this.onNext,
    required this.onSaveDraft,
  });

  final EvaluableCourse course;
  final List<CampaignCriterion> criteria;
  final int pageIndex;
  final Map<String, int> scores;
  final int recommendationScore;
  final bool submitting;
  final bool savingDraft;
  final String? submitError;
  final bool isOffline;
  final void Function(String criteriaId, int score) onSelectScore;
  final ValueChanged<int> onRecommendationChanged;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onSaveDraft;

  bool get _isRecommendationPage => pageIndex >= criteria.length;
  int get _totalPages => criteria.length + 1;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    if (criteria.isEmpty) {
      return const Center(child: Text('Aucun critère configuré pour cette campagne.'));
    }

    final currentCriterion = _isRecommendationPage ? null : criteria[pageIndex];
    final selectedScore = currentCriterion == null ? null : scores[currentCriterion.criteriaId];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (isOffline)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: ScolixColors.statusWarning.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off, size: 14, color: ScolixColors.statusWarning),
                const SizedBox(width: 6),
                Text(
                  'Hors ligne',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: ScolixColors.statusWarning, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerRight,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text('Anonyme', style: Theme.of(context).textTheme.labelSmall),
          ),
        ),
        const SizedBox(height: 12),
        Text(course.courseName, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600)),
        Text(
          '${course.teacherName}${course.isSecondaryTeacher ? ' (secondaire)' : ''} — ${course.semesterName}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: (pageIndex + 1) / _totalPages,
            minHeight: 8,
            backgroundColor: colorScheme.surfaceContainerHighest,
          ),
        ),
        const SizedBox(height: 6),
        Text('${pageIndex + 1} / $_totalPages', style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 24),
        if (currentCriterion != null) ...[
          Text(
            currentCriterion.name,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          if (currentCriterion.description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              currentCriterion.description,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
          const SizedBox(height: 16),
          for (var i = 0; i < _scaleLabels.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _ScaleOption(
                index: i + 1,
                label: _scaleLabels[i],
                selected: selectedScore == (i + 1) * 2,
                onTap: () => onSelectScore(currentCriterion.criteriaId, (i + 1) * 2),
              ),
            ),
        ] else ...[
          Text(
            'Recommanderiez-vous cet enseignant ?',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            'De 0 (pas du tout) à 10 (tout à fait)',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          Text(
            '$recommendationScore / 10',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          Slider(
            value: recommendationScore.toDouble(),
            min: 0,
            max: 10,
            divisions: 10,
            label: '$recommendationScore',
            onChanged: (v) => onRecommendationChanged(v.round()),
          ),
        ],
        const SizedBox(height: 12),
        Text(
          'Réponses mises en file, synchronisées à la reconnexion.',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
        if (submitError != null) ...[
          const SizedBox(height: 12),
          Text(submitError!, style: TextStyle(color: colorScheme.error)),
        ],
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: pageIndex == 0 || submitting || savingDraft ? null : onPrevious,
                child: const Text('Précédent'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: (currentCriterion != null && selectedScore == null) || submitting || savingDraft
                    ? null
                    : onNext,
                child: submitting
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text(_isRecommendationPage ? 'Terminer' : 'Suivant'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        TextButton.icon(
          onPressed: submitting || savingDraft ? null : onSaveDraft,
          icon: savingDraft
              ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.save_outlined, size: 18),
          label: const Text('Enregistrer et reprendre plus tard'),
        ),
      ],
    );
  }
}

class _ScaleOption extends StatelessWidget {
  const _ScaleOption({required this.index, required this.label, required this.selected, required this.onTap});

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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? colorScheme.primary.withValues(alpha: 0.1) : colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: selected ? colorScheme.primary : Colors.transparent, width: 1.5),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: selected ? colorScheme.primary : colorScheme.surface,
              child: Text(
                '$index',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          ],
        ),
      ),
    );
  }
}
