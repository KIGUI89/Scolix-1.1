import 'package:flutter/material.dart';

/// Tuile "valeur + libellé" utilisée dans les grilles de statistiques
/// (accueil étudiant, tableau de bord enseignant).
class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.value, required this.label, this.caption});

  final String value;
  final String label;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          if (caption != null) ...[
            const SizedBox(height: 2),
            Text(
              caption!,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ],
        ],
      ),
    );
  }
}
