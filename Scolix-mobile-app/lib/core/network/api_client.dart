import 'dart:async';

import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Client HTTP central pour consommer l'API Django REST existante.
///
/// Miroir du comportement de `src/lib/apiClient.ts` côté web :
///   - injection du Bearer token sur chaque requête,
///   - sur 401, tentative unique de refresh (POST /auth/refresh/), file
///     d'attente des requêtes concurrentes le temps du refresh, puis rejeu ;
///   - si le refresh échoue, purge des tokens et notification via
///     [onSessionExpired] (l'app mobile n'a pas de window.location : c'est
///     à l'appelant — AuthController — de faire naviguer vers /login).
class ApiClient {
  ApiClient({required TokenStorage tokenStorage})
      : _tokenStorage = tokenStorage,
        dio = Dio(
          BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            connectTimeout: const Duration(seconds: 15),
            receiveTimeout: const Duration(seconds: 15),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.getAccess();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final response = error.response;
          final requestOptions = error.requestOptions;
          final alreadyRetried = requestOptions.extra['retried'] == true;

          if (response?.statusCode == 401 && !alreadyRetried) {
            try {
              final newAccess = await _refreshAccessToken();
              requestOptions.extra['retried'] = true;
              requestOptions.headers['Authorization'] = 'Bearer $newAccess';
              final retried = await dio.fetch(requestOptions);
              handler.resolve(retried);
              return;
            } catch (_) {
              await _tokenStorage.clear();
              onSessionExpired?.call();
              handler.next(error);
              return;
            }
          }

          handler.next(error);
        },
      ),
    );
  }

  final Dio dio;
  final TokenStorage _tokenStorage;

  /// Appelé quand le refresh échoue (session vraiment expirée) —
  /// l'AuthController s'y abonne pour réinitialiser l'état et rediriger.
  void Function()? onSessionExpired;

  Completer<String>? _refreshCompleter;

  Future<String> _refreshAccessToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    final completer = Completer<String>();
    _refreshCompleter = completer;

    try {
      final refresh = await _tokenStorage.getRefresh();
      if (refresh == null) throw StateError('Aucun refresh token');

      final response = await Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
          .post('/auth/refresh/', data: {'refresh': refresh});

      final newAccess = response.data['access'] as String;
      await _tokenStorage.updateAccess(newAccess);
      completer.complete(newAccess);
      return newAccess;
    } catch (e) {
      completer.completeError(e);
      rethrow;
    } finally {
      _refreshCompleter = null;
    }
  }
}

/// Extrait un message affichable d'une erreur DRF, qu'elle soit au format
/// `{"detail": "..."}` ou `{"champ": ["message"]}` (comportement identique
/// à l'intercepteur web).
String apiErrorMessage(Object error, {String fallback = 'Une erreur est survenue'}) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (data.values.isNotEmpty) {
        final first = data.values.first;
        if (first is List && first.isNotEmpty) return first.first.toString();
        if (first is String) return first;
      }
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Le serveur met trop de temps à répondre';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Impossible de contacter le serveur';
    }
  }
  return fallback;
}
