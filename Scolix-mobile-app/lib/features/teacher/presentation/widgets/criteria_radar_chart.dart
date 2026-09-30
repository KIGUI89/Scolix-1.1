import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Un axe du radar : score personnel (0–maxValue), et optionnellement une
/// moyenne de comparaison (ex. département) — [department] reste `null`
/// tant qu'aucune source de données n'est branchée pour cette comparaison
/// (voir plan étape 0 point 2 : /analytics/heatmap/ réservé à ADMIN/DIRECTOR,
/// donc `null` en pratique pour l'instant côté mobile).
class RadarAxis {
  const RadarAxis({required this.label, required this.mine, this.department});

  final String label;
  final double mine;
  final double? department;
}

/// Radar "profil sur les critères" (écran 06 de la maquette) — dessiné en
/// CustomPainter, comme le SVG brut de la maquette (pas de librairie de
/// charts). Polygone plein = vous ; polygone en pointillés = département,
/// affiché uniquement si la donnée de comparaison est disponible.
class CriteriaRadarChart extends StatelessWidget {
  const CriteriaRadarChart({super.key, required this.axes, required this.maxValue});

  final List<RadarAxis> axes;
  final double maxValue;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return AspectRatio(
      aspectRatio: 1,
      child: CustomPaint(
        painter: _RadarPainter(
          axes: axes,
          maxValue: maxValue,
          gridColor: colorScheme.outline,
          labelColor: colorScheme.onSurfaceVariant,
          mineColor: colorScheme.primary,
          departmentColor: colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }
}

class _RadarPainter extends CustomPainter {
  _RadarPainter({
    required this.axes,
    required this.maxValue,
    required this.gridColor,
    required this.labelColor,
    required this.mineColor,
    required this.departmentColor,
  });

  final List<RadarAxis> axes;
  final double maxValue;
  final Color gridColor;
  final Color labelColor;
  final Color mineColor;
  final Color departmentColor;

  Offset _point(Offset center, double radius, int index, int count, double ratio) {
    final angle = (-math.pi / 2) + (index * 2 * math.pi / count);
    return center + Offset(math.cos(angle), math.sin(angle)) * (radius * ratio);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final count = axes.length;
    if (count < 3) return;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2 - 24;

    final gridPaint = Paint()
      ..color = gridColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (var ring = 1; ring <= 4; ring++) {
      final path = Path();
      for (var i = 0; i < count; i++) {
        final p = _point(center, radius, i, count, ring / 4);
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      path.close();
      canvas.drawPath(path, gridPaint);
    }

    for (var i = 0; i < count; i++) {
      final p = _point(center, radius, i, count, 1);
      canvas.drawLine(center, p, gridPaint);

      final labelPainter = TextPainter(
        text: TextSpan(text: axes[i].label, style: TextStyle(fontSize: 10, color: labelColor)),
        textDirection: TextDirection.ltr,
      )..layout();
      final labelPoint = _point(center, radius + 14, i, count, 1);
      labelPainter.paint(canvas, labelPoint - Offset(labelPainter.width / 2, labelPainter.height / 2));
    }

    if (axes.every((a) => a.department != null)) {
      _drawSeries(
        canvas,
        center,
        radius,
        count,
        axes.map((a) => a.department! / maxValue).toList(),
        departmentColor,
        dashed: true,
        fill: false,
      );
    }
    _drawSeries(
      canvas,
      center,
      radius,
      count,
      axes.map((a) => a.mine / maxValue).toList(),
      mineColor,
      dashed: false,
      fill: true,
    );
  }

  void _drawSeries(
    Canvas canvas,
    Offset center,
    double radius,
    int count,
    List<double> ratios,
    Color color, {
    required bool dashed,
    required bool fill,
  }) {
    final path = Path();
    for (var i = 0; i < count; i++) {
      final p = _point(center, radius, i, count, ratios[i].clamp(0, 1));
      if (i == 0) {
        path.moveTo(p.dx, p.dy);
      } else {
        path.lineTo(p.dx, p.dy);
      }
    }
    path.close();

    if (fill) {
      canvas.drawPath(path, Paint()..color = color.withValues(alpha: 0.12));
    }

    final strokePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    if (!dashed) {
      canvas.drawPath(path, strokePaint);
      return;
    }

    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      const dashLength = 4.0;
      const gapLength = 3.0;
      while (distance < metric.length) {
        final next = math.min(distance + dashLength, metric.length);
        canvas.drawPath(metric.extractPath(distance, next), strokePaint);
        distance = next + gapLength;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) {
    return oldDelegate.axes != axes || oldDelegate.maxValue != maxValue;
  }
}
