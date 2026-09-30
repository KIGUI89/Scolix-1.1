import 'package:flutter/material.dart';

/// Jetons de couleur de la charte Scolix, extraits du fichier de design
/// `Plateforme Évaluation Enseignants.dc.html` (thèmes clair et sombre).
/// Ne pas inventer d'autres teintes à côté de celles-ci.
class ScolixColors {
  ScolixColors._();

  static const accent = Color(0xFF3B82F6);

  // ── Statuts sémantiques (tags), communs aux deux thèmes ───────────
  // Repris de la maquette mobile (Scolix Mobile.dc.html) : vert = succès/
  // complet, orange = avertissement/à surveiller, indigo = en progression,
  // jaune = à surveiller (nuance secondaire).
  static const statusSuccess = Color(0xFF22C55E);
  static const statusWarning = Color(0xFFF97316);
  static const statusProgress = Color(0xFF818CF8);
  static const statusCaution = Color(0xFFEAB308);

  // ── Clair ──────────────────────────────────────────────────────
  static const lightBg = Color(0xFFFFFFFF);
  static const lightSurface = Color(0xFFF8F8F9);
  static const lightText = Color(0xFF16181D);
  static const lightDivider = Color(0xFFE6E7EB);
  static const lightAccent700 = Color(0xFF1F53A5);

  static const lightNeutral100 = Color(0xFFF5F6F8);
  static const lightNeutral500 = Color(0xFF9BA0AA);
  static const lightNeutral600 = Color(0xFF6E7480);
  static const lightNeutral900 = Color(0xFF16181D);

  // ── Sombre ─────────────────────────────────────────────────────
  static const darkBg = Color(0xFF0A0A0A);
  static const darkSurface = Color(0xFF161616);
  static const darkText = Color(0xFFF2F2F2);
  static const darkDivider = Color(0xFF242424);
  static const darkAccent700 = Color(0xFF9CC0FB);

  static const darkNeutral100 = Color(0xFF111213);
  static const darkNeutral500 = Color(0xFF5C5C5C);
  static const darkNeutral600 = Color(0xFF8A8A8A);
  static const darkNeutral900 = Color(0xFFF2F2F2);

  static const radiusMd = 8.0;
  static const radiusLg = 10.0;
}
