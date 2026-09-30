import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/scolix_colors.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/stat_tile.dart';
import '../../auth/application/auth_controller.dart';
import '../application/offline_queue_controller.dart';
import '../application/student_providers.dart';
import '../data/models/evaluable_course.dart';
import '../data/models/failed_submission.dart';
import 'widgets/evaluation_task_status.dart';
import 'widgets/evaluation_task_tile.dart';

/// Écran 01 de la maquette — Accueil étudiant.
///
/// GET /evaluations/my-courses/ (voir plan, étape 2 fonctionnalité 1).
class StudentHomeScreen extends ConsumerWidget {
  const StudentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    final firstName = user?.displayName.split(' ').first ?? '';
    final coursesAsync = ref.watch(evaluableCoursesProvider);
    final pendingQueue = ref.watch(offlineQueueControllerProvider).valueOrNull ?? [];
    final failedSubmissions = ref.watch(failedSubmissionsProvider);

    return SafeArea(
      child: RefreshIndicator(
        onRefresh: () => ref.refresh(evaluableCoursesProvider.future),
        child: coursesAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorState(
            message: apiErrorMessage(error, fallback: 'Impossible de charger vos cours à évaluer.'),
            onRetry: () => ref.invalidate(evaluableCoursesProvider),
          ),
          data: (courses) {
            final total = courses.length;
            final done = courses.where((c) => c.alreadySubmitted).length;
            final todo = total - done;
            final participationPct = total == 0 ? 0 : ((done / total) * 100).round();

            return ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Bonjour $firstName',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    const _AnonymousTag(),
                  ],
                ),
                for (final failure in failedSubmissions) _FailedSubmissionBanner(failure: failure),
                const SizedBox(height: 16),
                if (total == 0)
                  Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Center(
                      child: Text(
                        'Aucune campagne d\'évaluation active pour le moment.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  )
                else ...[
                  Row(
                    children: [
                      Expanded(child: StatTile(value: '$todo', label: 'À évaluer')),
                      const SizedBox(width: 10),
                      Expanded(child: StatTile(value: '$participationPct %', label: 'Participation')),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: done / total,
                      minHeight: 8,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text('$done / $total', style: Theme.of(context).textTheme.labelSmall),
                  const SizedBox(height: 20),
                  for (final course in courses)
                    _CourseTile(
                      key: ValueKey(course.taskId),
                      course: course,
                      isQueued: pendingQueue.any((p) => p.courseId == course.courseId && p.teacherId == course.teacherId),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

class _CourseTile extends StatelessWidget {
  const _CourseTile({super.key, required this.course, required this.isQueued});

  final EvaluableCourse course;
  final bool isQueued;

  @override
  Widget build(BuildContext context) {
    final status = course.alreadySubmitted
        ? EvaluationTaskStatus.done
        : (isQueued ? EvaluationTaskStatus.queued : EvaluationTaskStatus.todo);
    return EvaluationTaskTile(
      title: course.courseName,
      subtitle: '${course.courseCode} · ${course.teacherName}${course.isSecondaryTeacher ? ' (secondaire)' : ''}',
      caption: course.alreadySubmitted ? 'Réponse envoyée' : course.campaignTitle,
      status: status,
      onAction: course.alreadySubmitted
          ? null
          : () => context.go('/student/evaluations/form/${course.campaignId}/${course.courseId}/${course.teacherId}'),
    );
  }
}

/// Avertissement affiché quand une réponse mise en file hors-ligne a été
/// rejetée définitivement par le serveur à la resynchronisation (voir
/// OfflineQueueController.trySync) — l'étudiant doit le savoir, sinon il
/// croit sa réponse envoyée alors qu'elle a été silencieusement abandonnée.
class _FailedSubmissionBanner extends ConsumerWidget {
  const _FailedSubmissionBanner({required this.failure});

  final FailedSubmission failure;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: ScolixColors.statusWarning.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.error_outline, size: 18, color: ScolixColors.statusWarning),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${failure.submission.courseName} — non synchronisée',
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(failure.reason, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              tooltip: 'Fermer',
              onPressed: () => ref.read(failedSubmissionsProvider.notifier).update(
                    (list) => list.where((f) => f.submission.localId != failure.submission.localId).toList(),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AnonymousTag extends StatelessWidget {
  const _AnonymousTag();

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text('Anonyme', style: Theme.of(context).textTheme.labelSmall),
    );
  }
}
