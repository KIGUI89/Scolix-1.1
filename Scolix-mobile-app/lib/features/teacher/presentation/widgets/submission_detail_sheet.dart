import 'package:flutter/material.dart';

import '../../../../shared/models/submission.dart';

const _monthsFr = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

String _fmtDate(DateTime? d) {
  if (d == null) return '—';
  return '${d.day.toString().padLeft(2, '0')} ${_monthsFr[d.month - 1]} ${d.year}';
}

/// Miroir de SubmissionDetailModal.tsx côté web — détail d'une fiche reçue,
/// affiché en feuille modale (l'équivalent mobile de la modale web).
Future<void> showSubmissionDetailSheet(BuildContext context, MySubmission submission) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => _SubmissionDetailSheet(submission: submission),
  );
}

class _SubmissionDetailSheet extends StatelessWidget {
  const _SubmissionDetailSheet({required this.submission});

  final MySubmission submission;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final commented = submission.responses.where((r) => r.comment != null && r.comment!.trim().isNotEmpty).toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    submission.courseName,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(context).pop()),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${submission.courseCode} · reçue le ${_fmtDate(submission.submittedAt)}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  submission.globalScore != null ? submission.globalScore!.toStringAsFixed(1) : '—',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(width: 6),
                Text(
                  '/100${submission.recommendationScore != null ? ' · recommandation ${submission.recommendationScore}/10' : ''}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView(
                controller: scrollController,
                children: [
                  for (final r in submission.responses)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(r.criteriaName, style: Theme.of(context).textTheme.bodyMedium)),
                              Text('${r.score}/10', style: Theme.of(context).textTheme.labelMedium),
                            ],
                          ),
                          const SizedBox(height: 4),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(999),
                            child: LinearProgressIndicator(
                              value: r.score / 10,
                              minHeight: 5,
                              backgroundColor: colorScheme.surfaceContainerHighest,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (commented.isNotEmpty) ...[
                    const Divider(height: 24),
                    Text('Commentaire', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
                    const SizedBox(height: 8),
                    for (final r in commented)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(r.comment!, style: Theme.of(context).textTheme.bodyMedium),
                      ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
