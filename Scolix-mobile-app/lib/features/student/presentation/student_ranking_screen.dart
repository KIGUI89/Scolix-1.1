import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../application/student_providers.dart';

/// Écran 05 de la maquette — Classement des enseignants.
///
/// GET /evaluations/teacher-ranking/?scope=mine|all (voir plan, étape 2
/// fonctionnalité 2). Filtre de recherche appliqué côté client sur la liste
/// déjà chargée (nom d'enseignant / filière).
class StudentRankingScreen extends ConsumerStatefulWidget {
  const StudentRankingScreen({super.key});

  @override
  ConsumerState<StudentRankingScreen> createState() => _StudentRankingScreenState();
}

class _StudentRankingScreenState extends ConsumerState<StudentRankingScreen> {
  int _segment = 0;
  bool _searching = false;
  String _query = '';
  final _searchController = TextEditingController();

  String get _scope => _segment == 0 ? 'mine' : 'all';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rankingAsync = ref.watch(teacherRankingProvider(_scope));

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: _searching
                      ? TextField(
                          controller: _searchController,
                          autofocus: true,
                          decoration: const InputDecoration(
                            hintText: 'Rechercher un enseignant, une filière…',
                            isDense: true,
                          ),
                          onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
                        )
                      : Text(
                          'Classement',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                        ),
                ),
                IconButton(
                  icon: Icon(_searching ? Icons.close : Icons.search),
                  tooltip: _searching ? 'Fermer la recherche' : 'Rechercher',
                  onPressed: () => setState(() {
                    _searching = !_searching;
                    if (!_searching) {
                      _query = '';
                      _searchController.clear();
                    }
                  }),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SegmentedControl(
              options: const ['Ma filière', 'Établissement'],
              selectedIndex: _segment,
              onChanged: (i) => setState(() => _segment = i),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: rankingAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => ErrorState(
                message: apiErrorMessage(error, fallback: 'Impossible de charger le classement.'),
                onRetry: () => ref.invalidate(teacherRankingProvider(_scope)),
              ),
              data: (rows) {
                final filtered = _query.isEmpty
                    ? rows
                    : rows
                        .where((r) =>
                            r.teacherName.toLowerCase().contains(_query) ||
                            r.departmentName.toLowerCase().contains(_query))
                        .toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        rows.isEmpty
                            ? 'Aucun classement disponible pour le moment — il est publié à la clôture de chaque campagne.'
                            : 'Aucun résultat pour « $_query ».',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(teacherRankingProvider(_scope)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final row = filtered[index];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: colorScheme.surfaceContainerHighest,
                                child: Text(
                                  '${row.rank}',
                                  style: Theme.of(context).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(row.teacherName,
                                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                                    Text(
                                      row.departmentName,
                                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                '${row.avgScore.toStringAsFixed(1)}/100',
                                style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
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
