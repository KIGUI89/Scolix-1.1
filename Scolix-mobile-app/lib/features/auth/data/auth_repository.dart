import 'package:dio/dio.dart';

import '../../../core/storage/token_storage.dart';
import 'models/app_user.dart';

class AuthRepository {
  AuthRepository({required Dio dio, required TokenStorage tokenStorage})
      : _dio = dio,
        _tokenStorage = tokenStorage;

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /// POST /api/auth/login/ — {email, password} -> {access, refresh, user}
  Future<AppUser> login({required String email, required String password}) async {
    final response = await _dio.post(
      '/auth/login/',
      data: {'email': email, 'password': password},
    );

    final data = response.data as Map<String, dynamic>;
    await _tokenStorage.save(
      access: data['access'] as String,
      refresh: data['refresh'] as String,
    );

    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// GET /api/auth/me/ — utilisé au démarrage pour restaurer la session
  /// si un token valide est déjà en stockage sécurisé.
  Future<AppUser> me() async {
    final response = await _dio.get('/auth/me/');
    return AppUser.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> logout() => _tokenStorage.clear();

  Future<bool> hasStoredSession() async {
    final access = await _tokenStorage.getAccess();
    return access != null;
  }
}
