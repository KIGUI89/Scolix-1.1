import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'scolix_colors.dart';

/// Thème Material 3 dérivé de la charte Scolix (fichier de design
/// `Plateforme Évaluation Enseignants.dc.html`) : typo Inter, accent bleu
/// #3B82F6, coins à 8/10px, palettes claire et sombre dédiées.
class ScolixTheme {
  ScolixTheme._();

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: ScolixColors.accent,
      onPrimary: Colors.white,
      secondary: ScolixColors.accent,
      onSecondary: Colors.white,
      surface: isDark ? ScolixColors.darkSurface : ScolixColors.lightSurface,
      onSurface: isDark ? ScolixColors.darkText : ScolixColors.lightText,
      error: const Color(0xFFDC2626),
      onError: Colors.white,
      outline: isDark ? ScolixColors.darkDivider : ScolixColors.lightDivider,
      surfaceContainerHighest:
          isDark ? ScolixColors.darkNeutral100 : ScolixColors.lightNeutral100,
      onSurfaceVariant:
          isDark ? ScolixColors.darkNeutral600 : ScolixColors.lightNeutral600,
      errorContainer: const Color(0xFFFEE2E2),
      onErrorContainer: const Color(0xFF991B1B),
    );

    final textTheme = GoogleFonts.interTextTheme(
      isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: isDark ? ScolixColors.darkBg : ScolixColors.lightBg,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? ScolixColors.darkBg : ScolixColors.lightBg,
        foregroundColor: isDark ? ScolixColors.darkText : ScolixColors.lightText,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: isDark ? ScolixColors.darkSurface : ScolixColors.lightSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ScolixColors.radiusMd),
          borderSide: BorderSide(
            color: isDark ? ScolixColors.darkDivider : ScolixColors.lightDivider,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: ScolixColors.accent,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(ScolixColors.radiusMd),
          ),
        ),
      ),
      cardTheme: CardThemeData(
        color: isDark ? ScolixColors.darkSurface : ScolixColors.lightSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(ScolixColors.radiusLg),
          side: BorderSide(
            color: isDark ? ScolixColors.darkDivider : ScolixColors.lightDivider,
          ),
        ),
      ),
    );
  }
}
