import 'dart:io' show Platform;

import 'package:flutter/foundation.dart' show kIsWeb;

/// Configuration d'environnement, injectée à la compilation via --dart-define
/// (jamais en dur dans le code) :
///
///   flutter run --dart-define=API_BASE_URL=https://api.scolix.example/api
///
/// Sans valeur fournie, on retombe sur des défauts de développement local
/// cohérents avec le backend Django lancé sur la machine hôte (voir
/// edu-eval-backend : `python manage.py runserver 0.0.0.0:8000`) :
///   - Web/desktop : http://localhost:8000/api
///   - Téléphone physique (Wi-Fi ou USB avec `adb reverse`) : IP locale du PC
///     hôte sur le réseau (ex. http://192.168.1.65:8000/api)
///   - Émulateur Android : http://10.0.2.2:8000/api (alias de l'hôte) —
///     à passer explicitement via --dart-define si besoin
///   - Simulateur iOS : http://localhost:8000/api
class AppConfig {
  AppConfig._();

  static const String _override = String.fromEnvironment('API_BASE_URL');

  /// IP locale du PC de développement sur le réseau Wi-Fi (même routeur que
  /// le téléphone). À adapter si l'IP du PC change (voir `ipconfig`).
  static const String _devHostLanIp = 'https://scolix-1-1.onrender.com';

  static String get apiBaseUrl {
    if (_override.isNotEmpty) return _override;
    if (kIsWeb) return 'https://scolix-1-1.onrender.com/api';
    if (Platform.isAndroid) return 'http://$_devHostLanIp/api';
    return 'https://scolix-1-1.onrender.com/api';
  }

  static const bool isProd = bool.fromEnvironment('PROD', defaultValue: false);
}
