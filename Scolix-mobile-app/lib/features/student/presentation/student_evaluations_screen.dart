import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../application/offline_queue_controller.dart';
import '../application/student_providers.dart';
import 'widgets/evaluation_task_status.dart';
import 'widgets/evaluation_task_tile.dart';

/// Écran 02 de la maquette — Mes évaluations.
///
/// GET /evaluations/my-courses/ (même source que l'accueil — voir plan,
/// étape 2 fonctionnalité 1).
class StudentEvaluationsScreen extends ConsumerStatefulWidget {
  const StudentEvaluationsScreen({super.key});

  @override
  ConsumerState<StudentEvaluationsScreen> createState() => _StudentEvaluationsScreenState();
}

class _StudentEvaluationsScreenState extends ConsumerState<StudentEvaluationsScreen> {
  int _segment = 0;

  @override
  Widget build(BuildContext context) {
    final coursesAsync = ref.watch(evaluableCoursesProvider);
    final pendingQueue = ref.watch(offlineQueueControllerProvider).valueOrNull ?? [];

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Mes évaluations',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedControl(
              options: const ['À faire', 'Terminées'],
              selectedIndex: _segment,
              onChanged: (i) => setState(() => _segment = i),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: coursesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => ErrorState(
                message: apiErrorMessage(error, fallback: 'Impossible de charger vos évaluations.'),
                onRetry: () => ref.invalidate(evaluableCoursesProvider),
              ),
              data: (courses) {
                final filtered = courses.where((c) => _segment == 0 ? !c.alreadySubmitted : c.alreadySubmitted).toList();
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(evaluableCoursesProvider.future),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    children: [
                      for (final course in filtered)
                        EvaluationTaskTile(
                          key: ValueKey(course.taskId),
                          title: course.courseName,
                          subtitle:
                              '${course.courseCode} · ${course.teacherName}${course.isSecondaryTeacher ? ' (secondaire)' : ''}',
                          caption: course.alreadySubmitted ? 'Réponse envoyée' : course.campaignTitle,
                          status: course.alreadySubmitted
                              ? EvaluationTaskStatus.done
                              : (pendingQueue.any((p) => p.courseId == course.courseId && p.teacherId == course.teacherId)
                                  ? EvaluationTaskStatus.queued
                                  : EvaluationTaskStatus.todo),
                          onAction: course.alreadySubmitted
                              ? null
                              : () => context
                                  .go('/student/evaluations/form/${course.campaignId}/${course.courseId}/${course.teacherId}'),
                        ),
                      if (filtered.isEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 32),
                          child: Center(
                            child: Text(
                              'Aucune évaluation ici pour le moment.',
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
