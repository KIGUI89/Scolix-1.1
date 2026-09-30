import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/role_tab_scaffold.dart';

/// Coquille de l'espace étudiant — barre d'onglets Accueil/Évaluer/Rapport/
/// Classement (conforme aux 4 items de la maquette, Scolix Mobile.dc.html)
/// + Paramètres, ajouté à la demande de l'utilisateur (infos personnelles
/// et déconnexion — voir SettingsScreen).
class StudentShell extends StatelessWidget {
  const StudentShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return RoleTabScaffold(
      navigationShell: navigationShell,
      spaceLabel: 'Espace Étudiant',
      destinations: const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
        NavigationDestination(icon: Icon(Icons.rate_review_outlined), selectedIcon: Icon(Icons.rate_review), label: 'Évaluer'),
        NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: 'Rapport'),
        NavigationDestination(icon: Icon(Icons.emoji_events_outlined), selectedIcon: Icon(Icons.emoji_events), label: 'Classement'),
        NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Paramètres'),
      ],
    );
  }
}
