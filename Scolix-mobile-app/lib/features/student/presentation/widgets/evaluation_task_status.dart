import 'package:flutter/material.dart';

import '../../../../core/theme/scolix_colors.dart';

enum EvaluationTaskStatus { todo, queued, done }

extension EvaluationTaskStatusX on EvaluationTaskStatus {
  String get label => switch (this) {
        EvaluationTaskStatus.todo => 'À faire',
        EvaluationTaskStatus.queued => 'Brouillon',
        EvaluationTaskStatus.done => 'Terminée',
      };

  Color get color => switch (this) {
        EvaluationTaskStatus.todo => ScolixColors.accent,
        EvaluationTaskStatus.queued => ScolixColors.statusCaution,
        EvaluationTaskStatus.done => ScolixColors.statusSuccess,
      };

  String get ctaLabel => switch (this) {
        EvaluationTaskStatus.todo => 'Évaluer',
        EvaluationTaskStatus.queued => 'Reprendre',
        EvaluationTaskStatus.done => 'Voir',
      };
}
