import 'pending_submission.dart';

/// Une soumission d'évaluation hors-ligne que le serveur a rejetée
/// définitivement à la resynchronisation (erreur 4xx, ex. "déjà soumise" —
/// voir OfflineQueueController.trySync). Contrairement à une erreur réseau,
/// la retenter indéfiniment ne servirait à rien : elle est retirée de la
/// file et conservée ici uniquement le temps d'en informer l'étudiant.
class FailedSubmission {
  const FailedSubmission({required this.submission, required this.reason});

  final PendingSubmission submission;
  final String reason;
}
