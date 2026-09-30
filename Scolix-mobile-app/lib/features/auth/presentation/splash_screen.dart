import 'package:flutter/material.dart';

import '../../../core/theme/scolix_logo.dart';

/// Écran affiché pendant la restauration de session au démarrage
/// (vérification du token stocké via GET /api/auth/me/).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ScolixLogo(ScolixLogoAsset.icon, height: 56),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
