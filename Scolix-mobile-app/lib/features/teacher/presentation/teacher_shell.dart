import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/role_tab_scaffold.dart';

/// Coquille de l'espace enseignant — barre d'onglets Tableau/Fiches/Modules/
/// Bilan (conforme aux 4 items de la maquette, Scolix Mobile.dc.html) +
/// Paramètres, ajouté à la demande de l'utilisateur (infos personnelles et
/// déconnexion — voir SettingsScreen).
class TeacherShell extends StatelessWidget {
  const TeacherShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return RoleTabScaffold(
      navigationShell: navigationShell,
      spaceLabel: 'Espace Enseignant',
      destinations: const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Tableau'),
        NavigationDestination(icon: Icon(Icons.forum_outlined), selectedIcon: Icon(Icons.forum), label: 'Fiches'),
        NavigationDestination(icon: Icon(Icons.view_module_outlined), selectedIcon: Icon(Icons.view_module), label: 'Modules'),
        NavigationDestination(icon: Icon(Icons.summarize_outlined), selectedIcon: Icon(Icons.summarize), label: 'Bilan'),
        NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Paramètres'),
      ],
    );
  }
}
