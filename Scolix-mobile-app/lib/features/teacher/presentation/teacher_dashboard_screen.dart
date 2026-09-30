import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/stat_tile.dart';
import '../../../shared/widgets/tag_chip.dart';
import '../application/teacher_providers.dart';
import '../domain/module_state.dart';
import 'widgets/criteria_radar_chart.dart';
import 'widgets/trend_bar_chart.dart';

/// Écran 06 de la maquette — Tableau de bord enseignant.
///
/// GET /evaluations/teacher-dashboard/ et GET /teachers/{id}/scores/ (voir
/// plan, étape 2 fonctionnalité 5). La comparaison "département" du radar
/// n'est pas affichée : /api/analytics/heatmap/ est réservé à ADMIN/DIRECTOR
/// (plan étape 0 point 2) — seul le polygone "vous" est donc tracé, sans
/// donnée fictive à la place de la comparaison manquante. De même, aucun
/// rang n'est affiché (dépend de /api/analytics/ranking/, même restriction).
class TeacherDashboardScreen extends ConsumerWidget {
  const TeacherDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(teacherDashboardProvider);
    final scoresAsync = ref.watch(teacherScoresProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: dashboardAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorState(
          message: apiErrorMessage(error, fallback: 'Impossible de charger votre tableau de bord.'),
          onRetry: () => ref.invalidate(teacherDashboardProvider),
        ),
        data: (dashboard) {
          final criteriaScores = scoresAsync.valueOrNull?.criteriaScores ?? const [];
          final radarAxes = criteriaScores.map((c) => RadarAxis(label: c.name, mine: c.avgScore)).toList();
          final trendPoints = scoresAsync.valueOrNull?.semesterHistory
                  .map((s) => SemesterScore(label: s.semesterName, score: s.avgScore))
                  .toList() ??
              const <SemesterScore>[];
          final responseRate = dashboard.totalEnrolled > 0
              ? (100 * dashboard.totalEvaluations / dashboard.totalEnrolled).clamp(0, 100).round()
              : null;
          final modulesPreview = dashboard.evaluatedCourses.take(4).toList();

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(teacherDashboardProvider);
              ref.invalidate(teacherScoresProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  dashboard.teacherName,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        value: dashboard.globalAverage.toStringAsFixed(1),
                        label: 'Score global /100',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: StatTile(value: '${dashboard.totalEvaluations}', label: 'Fiches reçues')),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: StatTile(
                        value: responseRate != null ? '$responseRate %' : '—',
                        label: 'Taux de réponse',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: StatTile(
                        value: '${dashboard.evaluatedCourses.length}',
                        label: 'Modules évalués',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text('Profil sur les critères', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                _LegendDot(color: colorScheme.primary, label: 'Vous'),
                const SizedBox(height: 12),
                if (radarAxes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'Pas encore assez d\'évaluations pour tracer un profil.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else
                  CriteriaRadarChart(axes: radarAxes, maxValue: 10),
                const SizedBox(height: 24),
                Text('Évolution du score', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                if (trendPoints.isEmpty)
                  Text(
                    'Historique insuffisant (au moins un semestre évalué requis).',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                  )
                else
                  TrendBarChart(points: trendPoints),
                if (criteriaScores.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  Text('Détail par critère', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          for (final c in criteriaScores)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(child: Text(c.name, style: Theme.of(context).textTheme.bodyMedium)),
                                      Text('${c.avgScore.toStringAsFixed(1)}/10', style: Theme.of(context).textTheme.labelMedium),
                                    ],
                                  ),
                                  const SizedBox(height: 5),
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(999),
                                    child: LinearProgressIndicator(
                                      value: (c.avgScore / 10).clamp(0, 1),
                                      minHeight: 6,
                                      backgroundColor: colorScheme.surfaceContainerHighest,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: Text('Modules évalués ce semestre', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
                    ),
                    TextButton(
                      onPressed: () => context.go('/teacher/modules'),
                      child: const Text('Tout voir'),
                    ),
                  ],
                ),
                if (modulesPreview.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Aucun module évalué pour le moment.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          for (final m in modulesPreview)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(m.courseName, style: Theme.of(context).textTheme.bodyMedium),
                                        Text(m.courseCode, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text('${m.averageScore.toStringAsFixed(1)}/100', style: Theme.of(context).textTheme.labelMedium),
                                  const SizedBox(width: 8),
                                  TagChip(label: moduleStateFor(m.averageScore).label, color: moduleStateFor(m.averageScore).color),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
