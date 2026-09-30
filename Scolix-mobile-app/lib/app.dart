import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/scolix_theme.dart';
import 'core/theme/theme_mode_provider.dart';

class ScolixApp extends ConsumerWidget {
  const ScolixApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title: 'Scolix',
      debugShowCheckedModeBanner: false,
      theme: ScolixTheme.light(),
      darkTheme: ScolixTheme.dark(),
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}
