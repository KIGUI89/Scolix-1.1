import 'package:flutter/material.dart';

import '../../../../shared/widgets/tag_chip.dart';
import 'evaluation_task_status.dart';

/// Ligne "tâche d'évaluation" — motif réutilisé par l'écran Accueil (aperçu)
/// et l'écran Mes évaluations (avec bouton d'action).
class EvaluationTaskTile extends StatelessWidget {
  const EvaluationTaskTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.caption,
    required this.status,
    this.onAction,
  });

  final String title;
  final String subtitle;
  final String caption;
  final EvaluationTaskStatus status;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TagChip(label: status.label, color: status.color),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    caption,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            if (onAction != null) ...[
              const SizedBox(width: 8),
              OutlinedButton(onPressed: onAction, child: Text(status.ctaLabel)),
            ],
          ],
        ),
      ),
    );
  }
}
