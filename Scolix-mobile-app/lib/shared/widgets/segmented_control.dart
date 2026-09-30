import 'package:flutter/material.dart';

/// Contrôle segmenté (motif "seg" de la maquette) — remplace un groupe de
/// boutons radio par une bande de segments cliquables.
class SegmentedControl extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.options,
    required this.selectedIndex,
    required this.onChanged,
  });

  final List<String> options;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          for (var i = 0; i < options.length; i++)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: i == selectedIndex ? colorScheme.surface : Colors.transparent,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    options[i],
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          fontWeight: i == selectedIndex ? FontWeight.w600 : FontWeight.w400,
                          color: i == selectedIndex ? colorScheme.onSurface : colorScheme.onSurfaceVariant,
                        ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
