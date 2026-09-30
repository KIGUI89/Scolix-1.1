import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/models/submission.dart';
import '../../../shared/widgets/error_state.dart';
import '../../../shared/widgets/segmented_control.dart';
import '../../../shared/widgets/tag_chip.dart';
import '../application/teacher_providers.dart';
import '../domain/module_state.dart';
import 'widgets/submission_detail_sheet.dart';

const _monthsFr = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

String _fmtDate(DateTime? d) {
  if (d == null) return '—';
  return '${d.day.toString().padLeft(2, '0')} ${_monthsFr[d.month - 1]} ${d.year}';
}

/// Écran 07 de la maquette — Fiches reçues.
///
/// GET /evaluations/submissions/ (queryset scopé côté serveur à
/// `teacher=user.teacher_profile`, identité étudiante absente de la
/// réponse — anonymisation faite côté serveur, voir
/// EvaluationSubmissionViewSet.get_queryset et to_representation). Reconstruit
/// à l'identique de TeacherFiches.tsx côté web : recherche dans les
/// commentaires/module, filtre par module (segments dynamiques selon les
/// modules réels de l'enseignant), et ouverture du détail d'une fiche.
class TeacherFeedbackScreen extends ConsumerStatefulWidget {
  const TeacherFeedbackScreen({super.key});

  @override
  ConsumerState<TeacherFeedbackScreen> createState() => _TeacherFeedbackScreenState();
}

class _TeacherFeedbackScreenState extends ConsumerState<TeacherFeedbackScreen> {
  final _searchController = TextEditingController();
  String _search = '';
  String _scope = 'ALL';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final submissionsAsync = ref.watch(teacherSubmissionsProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: submissionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => ErrorState(
          message: apiErrorMessage(error, fallback: 'Impossible de charger les fiches reçues.'),
          onRetry: () => ref.invalidate(teacherSubmissionsProvider),
        ),
        data: (submissions) {
          final modules = submissions.map((s) => s.courseCode).toSet().toList()..sort();
          if (_scope != 'ALL' && !modules.contains(_scope)) _scope = 'ALL';
          final segments = ['Tous', ...modules];
          final selectedIndex = _scope == 'ALL' ? 0 : modules.indexOf(_scope) + 1;

          final query = _search.trim().toLowerCase();
          final rows = submissions.where((s) {
            if (_scope != 'ALL' && s.courseCode != _scope) return false;
            if (query.isEmpty) return true;
            final comment = s.firstComment ?? '';
            return comment.toLowerCase().contains(query) ||
                s.courseName.toLowerCase().contains(query) ||
                s.courseCode.toLowerCase().contains(query);
          }).toList()
            ..sort((a, b) => (b.submittedAt ?? DateTime(0)).compareTo(a.submittedAt ?? DateTime(0)));

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(teacherSubmissionsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Fiches reçues',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    Text('${submissions.length}', style: Theme.of(context).textTheme.titleMedium),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Identités masquées',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    hintText: 'Rechercher dans les commentaires…',
                    prefixIcon: Icon(Icons.search),
                    isDense: true,
                  ),
                  onChanged: (v) => setState(() => _search = v),
                ),
                if (segments.length > 1) ...[
                  const SizedBox(height: 12),
                  SegmentedControl(
                    options: segments,
                    selectedIndex: selectedIndex,
                    onChanged: (i) => setState(() => _scope = i == 0 ? 'ALL' : modules[i - 1]),
                  ),
                ],
                const SizedBox(height: 16),
                if (rows.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      submissions.isEmpty ? 'Aucune fiche reçue pour le moment.' : 'Aucune fiche ne correspond à ce filtre.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else
                  for (final s in rows) _FicheCard(submission: s, onTap: () => showSubmissionDetailSheet(context, s)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FicheCard extends StatelessWidget {
  const _FicheCard({required this.submission, required this.onTap});

  final MySubmission submission;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final score = submission.globalScore;
    final comment = submission.firstComment;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${submission.courseCode} · ${submission.courseName}',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (score != null)
                    TagChip(label: '${score.toStringAsFixed(0)}/100', color: moduleStateFor(score).color)
                  else
                    Text('—', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Reçue le ${_fmtDate(submission.submittedAt)}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
              if (comment != null) ...[
                const SizedBox(height: 8),
                Text(
                  comment,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
