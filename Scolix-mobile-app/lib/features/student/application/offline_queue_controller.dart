import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/models/failed_submission.dart';
import '../data/models/pending_submission.dart';
import '../data/offline_queue_service.dart';
import 'student_providers.dart';

final offlineQueueServiceProvider = Provider<OfflineQueueService>((ref) => OfflineQueueService());

/// Soumissions retirées de la file après un rejet définitif du serveur
/// (erreur 4xx) — affichées une fois à l'étudiant (voir _FailedSubmissionBanner
/// dans student_home_screen.dart) puis effacées de cette liste au clic sur
/// "Fermer". Volontairement non persisté : une notification manquée au
/// redémarrage de l'app est un moindre mal comparé à une file qui boucle
/// indéfiniment en silence.
final failedSubmissionsProvider =
    StateProvider<List<FailedSubmission>>((ref) => []);

/// État de la file d'attente hors-ligne (écran 03 : "Réponses mises en file,
/// synchronisées à la reconnexion."). Charge la file au démarrage, écoute la
/// reconnexion réseau via connectivity_plus et rejoue automatiquement les
/// soumissions en attente dès qu'une connexion revient.
final offlineQueueControllerProvider =
    AsyncNotifierProvider<OfflineQueueController, List<PendingSubmission>>(OfflineQueueController.new);

class OfflineQueueController extends AsyncNotifier<List<PendingSubmission>> {
  @override
  Future<List<PendingSubmission>> build() async {
    final items = await ref.watch(offlineQueueServiceProvider).loadAll();

    // ref.onDispose n'est pas nécessaire ici : ce provider vit pour toute la
    // durée de la session étudiante (pas de .autoDispose), l'abonnement au
    // flux de connectivité doit donc rester actif tant que l'app tourne.
    Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) trySync();
    });

    return items;
  }

  Future<void> enqueue(PendingSubmission submission) async {
    await ref.read(offlineQueueServiceProvider).enqueue(submission);
    state = AsyncData([...state.valueOrNull ?? [], submission]);
  }

  /// Rejoue les soumissions en attente une à une. Celles qui échouent pour
  /// une raison réseau (toujours hors-ligne, serveur injoignable) restent en
  /// file pour le prochain essai. Celles que le serveur rejette
  /// définitivement (400–499, ex. "déjà soumise" — apps/evaluations/
  /// services.py::create_submission) sont retirées de la file : les
  /// retenter indéfiniment n'aboutirait jamais, elles sont donc déplacées
  /// vers [failedSubmissionsProvider] pour que l'étudiant en soit informé.
  Future<void> trySync() async {
    final queueService = ref.read(offlineQueueServiceProvider);
    final repository = ref.read(studentRepositoryProvider);
    final pending = List<PendingSubmission>.from(state.valueOrNull ?? await queueService.loadAll());

    for (final submission in List.of(pending)) {
      try {
        await repository.submitEvaluation(
          campaignId: submission.campaignId,
          courseId: submission.courseId,
          teacherId: submission.teacherId,
          responses: submission.responses,
          recommendationScore: submission.recommendationScore,
        );
        await queueService.remove(submission.localId);
        pending.removeWhere((e) => e.localId == submission.localId);
      } on DioException catch (e) {
        final status = e.response?.statusCode;
        final isPermanentRejection = status != null && status >= 400 && status < 500;
        if (isPermanentRejection) {
          await queueService.remove(submission.localId);
          pending.removeWhere((e) => e.localId == submission.localId);
          ref.read(failedSubmissionsProvider.notifier).update(
                (list) => [
                  ...list,
                  FailedSubmission(submission: submission, reason: apiErrorMessage(e)),
                ],
              );
        }
        // Sinon (timeout, pas de réseau, 5xx) : on la garde en file.
      } catch (_) {
        // Erreur inattendue non-HTTP : par prudence, on la garde en file
        // plutôt que de perdre silencieusement la réponse de l'étudiant.
      }
    }

    state = AsyncData(pending);
    ref.invalidate(evaluableCoursesProvider);
  }
}
