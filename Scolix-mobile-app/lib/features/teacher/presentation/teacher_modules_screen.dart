import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/tag_chip.dart';
import '../application/teacher_providers.dart';
import '../data/models/teacher_dashboard.dart';
import '../domain/module_state.dart';

/// Écran 08 de la maquette — Modules évalués.
///
/// GET /evaluations/teacher-dashboard/ (champ evaluated_courses — voir plan,
/// étape 2 fonctionnalité 7). Le nombre d'inscrits par cours (`enrolled_count`)
/// et le delta de score par période (`score_delta`) sont désormais renvoyés
/// par le backend (voir services.py::get_teacher_dashboard) et alimentent la
/// barre de progression "taux de réponse" et la colonne "évolution".
class TeacherModulesScreen extends ConsumerWidget {
  const TeacherModulesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(teacherDashboardProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorState(
          message: apiErrorMessage(error, fallback: 'Impossible de charger vos modules.'),
          onRetry: () => ref.invalidate(teacherDashboardProvider),
        ),
        data: (dashboard) {
          final modules = dashboard.evaluatedCourses;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(teacherDashboardProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Modules évalués',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    Text('${modules.length}', style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
                const SizedBox(height: 16),
                if (modules.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'Aucun module évalué pour le moment.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else
                  for (final module in modules) _ModuleCard(module: module),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({required this.module});

  final EvaluatedCourseSummary module;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rate = module.enrolledCount > 0
        ? (100 * module.totalEvaluations / module.enrolledCount).clamp(0, 100).round()
        : null;
    final delta = module.scoreDelta;
    final state = moduleStateFor(module.averageScore);
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        module.courseName,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        module.courseCode,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                Text('${module.averageScore.toStringAsFixed(1)}/100', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: (rate ?? 0) / 100,
                      minHeight: 6,
                      backgroundColor: colorScheme.surfaceContainerHighest,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  rate != null ? '${module.totalEvaluations}/${module.enrolledCount} · $rate %' : '${module.totalEvaluations} réponse(s)',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                if (delta != null) ...[
                  Icon(delta >= 0 ? Icons.arrow_upward : Icons.arrow_downward, size: 14, color: colorScheme.onSurfaceVariant),
                  const SizedBox(width: 2),
                  Text(
                    '${delta > 0 ? '+' : ''}${delta.toStringAsFixed(1)}',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                  const Spacer(),
                ] else
                  const Spacer(),
                TagChip(label: state.label, color: state.color),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
