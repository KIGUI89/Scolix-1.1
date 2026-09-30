import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../data/models/app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthRepository(dio: apiClient.dio, tokenStorage: ref.watch(tokenStorageProvider));
});

/// État de session : AsyncData(null) = déconnecté, AsyncData(user) = connecté.
/// AsyncLoading pendant le login ou la restauration de session au démarrage.
final authControllerProvider = AsyncNotifierProvider<AuthController, AppUser?>(
  AuthController.new,
);

/// true juste après une expiration de session en cours d'usage (refresh
/// token devenu invalide) — l'écran de connexion l'affiche une fois puis le
/// réinitialise. Ne concerne pas l'échec de restauration au démarrage
/// (géré silencieusement dans build(), voir catch ci-dessous).
final sessionExpiredProvider = StateProvider<bool>((ref) => false);

class AuthController extends AsyncNotifier<AppUser?> {
  @override
  Future<AppUser?> build() async {
    final apiClient = ref.watch(apiClientProvider);
    apiClient.onSessionExpired = () {
      ref.read(sessionExpiredProvider.notifier).state = true;
      state = const AsyncData(null);
    };

    final repo = ref.watch(authRepositoryProvider);
    if (!await repo.hasStoredSession()) return null;

    try {
      return await repo.me();
    } catch (_) {
      // Token stocké invalide/expiré et refresh impossible : session propre.
      await repo.logout();
      return null;
    }
  }

  Future<void> login({required String email, required String password}) async {
    final repo = ref.read(authRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.login(email: email, password: password));
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}
