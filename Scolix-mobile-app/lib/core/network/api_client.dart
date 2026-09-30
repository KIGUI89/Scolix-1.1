import 'dart:async';
import 'dart:io' show SocketException, TlsException;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;

import '../config/app_config.dart';
import '../storage/token_storage.dart';

/// Timeout large : l'API est hébergée sur Render (plan gratuit), qui met le
/// service en veille après 15 min d'inactivité ; le premier appel doit
/// attendre son redémarrage (~1 min).
const Duration _apiTimeout = Duration(seconds: 60);

/// Nombre de nouvelles tentatives sur erreur réseau/timeout (jamais sur 4xx/5xx).
const int _maxNetworkRetries = 2;
const Duration _networkRetryDelay = Duration(seconds: 2);

/// Marqueur `extra` des requêtes publiques (login, refresh) : pas de Bearer
/// injecté (un token périmé en stockage ferait répondre 401 à DRF même sur
/// une vue ouverte) et pas de tentative de refresh sur leur 401.
const String kSkipAuth = 'skipAuth';

/// Client HTTP central pour consommer l'API Django REST existante.
///
/// Miroir du comportement de `src/lib/apiClient.ts` côté web :
///   - injection du Bearer token sur chaque requête,
///   - sur 401, tentative unique de refresh (POST /auth/refresh/), file
///     d'attente des requêtes concurrentes le temps du refresh, puis rejeu ;
///   - si le refresh échoue, purge des tokens et notification via
///     [onSessionExpired] (l'app mobile n'a pas de window.location : c'est
///     à l'appelant — AuthController — de faire naviguer vers /login).
/// En plus : nouvelles tentatives automatiques sur erreur réseau/timeout
/// (réveil de l'API Render) et journalisation des erreurs (debugPrint).
class ApiClient {
  ApiClient({required TokenStorage tokenStorage})
      : _tokenStorage = tokenStorage,
        dio = Dio(_baseOptions()) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.extra[kSkipAuth] != true) {
            final token = await _tokenStorage.getAccess();
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          _logError(error);

          final requestOptions = error.requestOptions;

          if (_isRetryableNetworkError(error)) {
            final attempt = (requestOptions.extra['networkRetry'] as int?) ?? 0;
            if (attempt < _maxNetworkRetries) {
              requestOptions.extra['networkRetry'] = attempt + 1;
              debugPrint('[API] nouvelle tentative ${attempt + 1}/$_maxNetworkRetries '
                  '${requestOptions.method} ${requestOptions.uri}');
              await Future<void>.delayed(_networkRetryDelay);
              try {
                handler.resolve(await dio.fetch(requestOptions));
              } on DioException catch (e) {
                handler.next(e);
              }
              return;
            }
          }

          final response = error.response;
          final alreadyRetried = requestOptions.extra['retried'] == true;
          final isPublic = requestOptions.extra[kSkipAuth] == true;

          if (response?.statusCode == 401 && !alreadyRetried && !isPublic) {
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

  static BaseOptions _baseOptions() => BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: _apiTimeout,
        sendTimeout: _apiTimeout,
        receiveTimeout: _apiTimeout,
        headers: {'Content-Type': 'application/json'},
      );

  Future<String> _refreshAccessToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    final completer = Completer<String>();
    _refreshCompleter = completer;

    try {
      final refresh = await _tokenStorage.getRefresh();
      if (refresh == null) throw StateError('Aucun refresh token');

      final response = await Dio(_baseOptions())
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

  /// Réessayer uniquement quand la requête n'a pas obtenu de réponse HTTP.
  /// Un receive/sendTimeout sur une écriture n'est pas rejoué : le serveur a
  /// pu la traiter, et la rejouer créerait un doublon.
  static bool _isRetryableNetworkError(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionError:
      case DioExceptionType.connectionTimeout:
        return true;
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        final method = error.requestOptions.method.toUpperCase();
        return method == 'GET' || error.requestOptions.extra[kSkipAuth] == true;
      default:
        return false;
    }
  }

  /// Journalise l'erreur réelle sans données sensibles : ni corps de requête
  /// (mot de passe), ni en-têtes (Bearer token).
  static void _logError(DioException error) {
    final options = error.requestOptions;
    final response = error.response;
    var body = response?.data?.toString() ?? '';
    if (body.length > 500) body = '${body.substring(0, 500)}…';
    debugPrint('[API] ${error.type.name} ${options.method} ${options.uri} '
        '-> HTTP ${response?.statusCode ?? '-'} | cause: ${error.error?.runtimeType ?? '-'} '
        '${error.error ?? error.message ?? ''}'
        '${body.isEmpty ? '' : ' | réponse: $body'}');
  }
}

/// Extrait un message affichable d'une erreur DRF, qu'elle soit au format
/// `{"detail": "..."}` ou `{"champ": ["message"]}` (comportement identique
/// à l'intercepteur web). Sans corps exploitable, le message dépend du type
/// d'échec (réseau, timeout, SSL) ou du code HTTP.
String apiErrorMessage(Object error, {String fallback = 'Une erreur est survenue'}) {
  if (error is! DioException) return fallback;

  final response = error.response;
  if (response != null) {
    final status = response.statusCode ?? 0;
    if (status == 401 && error.requestOptions.path.endsWith('/auth/login/')) {
      return 'Email ou mot de passe incorrect.';
    }

    final data = response.data;
    if (data is Map) {
      final detail = data['detail'];
      if (detail is String) return detail;
      if (data.values.isNotEmpty) {
        final first = data.values.first;
        if (first is List && first.isNotEmpty) return first.first.toString();
        if (first is String) return first;
      }
    }

    if (status == 400) {
      // Corps non-JSON : typiquement « Bad Request (400) » de Django quand
      // l'hôte appelé n'est pas dans ALLOWED_HOSTS.
      return 'Requête refusée par le serveur (400).';
    }
    if (status == 401) return fallback;
    if (status == 403) return 'Accès refusé (403).';
    if (status == 404) return 'Service introuvable sur le serveur (404).';
    if (status >= 500) return 'Le serveur a rencontré une erreur ($status). Réessayez plus tard.';
    return fallback;
  }

  switch (error.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.';
    case DioExceptionType.badCertificate:
      return 'Connexion sécurisée impossible (certificat SSL invalide).';
    case DioExceptionType.connectionError:
      final cause = error.error;
      if (cause is TlsException) {
        return 'Connexion sécurisée impossible (erreur SSL). Vérifiez la date et l\'heure du téléphone.';
      }
      // Échec DNS : le plus souvent, le téléphone n'a pas d'accès Internet.
      if (cause is SocketException && cause.message.contains('host lookup')) {
        return 'Pas de connexion Internet.';
      }
      return 'Impossible de contacter le serveur';
    default:
      return fallback;
  }
}
