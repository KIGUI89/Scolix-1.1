import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Bascule clair/sombre manuelle — la maquette Scolix affiche ce bouton
/// sur chaque écran (login compris), en plus de suivre le thème système.
class ThemeModeController extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.system;

  void toggle() {
    final isCurrentlyDark = switch (state) {
      ThemeMode.dark => true,
      ThemeMode.light => false,
      ThemeMode.system =>
        WidgetsBinding.instance.platformDispatcher.platformBrightness == Brightness.dark,
    };
    state = isCurrentlyDark ? ThemeMode.light : ThemeMode.dark;
  }
}

final themeModeProvider = NotifierProvider<ThemeModeController, ThemeMode>(
  ThemeModeController.new,
);
