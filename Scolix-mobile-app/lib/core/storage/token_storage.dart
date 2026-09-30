import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stockage sécurisé des tokens JWT (Keychain iOS / Keystore Android),
/// équivalent mobile du sessionStorage utilisé côté web (tokenStorage dans
/// apiClient.ts), mais persistant entre sessions puisqu'une app mobile n'a
/// pas d'onglet "à fermer".
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'scolix_access_token';
  static const _refreshKey = 'scolix_refresh_token';

  Future<String?> getAccess() => _storage.read(key: _accessKey);
  Future<String?> getRefresh() => _storage.read(key: _refreshKey);

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> updateAccess(String access) =>
      _storage.write(key: _accessKey, value: access);

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
