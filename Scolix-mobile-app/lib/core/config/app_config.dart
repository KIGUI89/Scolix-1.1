/// Configuration d'environnement, injectée à la compilation via --dart-define :
///
///   flutter build apk --release --dart-define=API_URL=https://scolix-1-1.onrender.com
///
/// API_URL est l'origine du back-end Django (schéma + hôte, sans slash final
/// ni préfixe /api). Sans valeur fournie, on pointe sur l'API Render en HTTPS.
/// Pour un back-end local (debug uniquement, voir
/// android/app/src/debug/res/xml/network_security_config.xml) :
///   --dart-define=API_URL=http://10.0.2.2:8000   (émulateur Android)
///   --dart-define=API_URL=http://localhost:8000  (web / desktop)
class AppConfig {
  AppConfig._();

  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://scolix-1-1.onrender.com',
  );

  /// Base de tous les appels dio : les chemins des repositories commencent
  /// par "/" (ex. '/auth/login/') et le préfixe /api n'est ajouté qu'ici.
  static String get apiBaseUrl {
    final origin = apiUrl.endsWith('/') ? apiUrl.substring(0, apiUrl.length - 1) : apiUrl;
    return origin.endsWith('/api') ? origin : '$origin/api';
  }

  static const bool isProd = bool.fromEnvironment('PROD', defaultValue: false);
}
