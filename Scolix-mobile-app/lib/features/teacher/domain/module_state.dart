import 'package:flutter/material.dart';

import '../../../core/theme/scolix_colors.dart';

/// Miroir de teacherModuleState.ts côté web — global_score est sur une
/// échelle 0–100 dans cette app (mêmes seuils que le tableau de bord admin).
class ModuleState {
  const ModuleState({required this.label, required this.color});

  final String label;
  final Color color;
}

ModuleState moduleStateFor(double score) {
  if (score >= 84) return const ModuleState(label: 'Très favorable', color: ScolixColors.statusSuccess);
  if (score >= 76) return const ModuleState(label: 'Favorable', color: ScolixColors.statusProgress);
  return const ModuleState(label: 'À travailler', color: ScolixColors.statusWarning);
}
