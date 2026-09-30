import 'package:flutter/material.dart';

class SemesterScore {
  const SemesterScore({required this.label, required this.score});

  final String label;
  final double score;
}

/// Barres de tendance du score global par semestre (écran 06 de la maquette).
class TrendBarChart extends StatelessWidget {
  const TrendBarChart({super.key, required this.points, this.maxValue = 100});

  final List<SemesterScore> points;
  final double maxValue;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final point in points)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      point.score.toStringAsFixed(0),
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                    const SizedBox(height: 4),
                    Expanded(
                      child: FractionallySizedBox(
                        alignment: Alignment.bottomCenter,
                        heightFactor: (point.score / maxValue).clamp(0.02, 1),
                        child: Container(
                          decoration: BoxDecoration(
                            color: colorScheme.primary,
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(point.label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
