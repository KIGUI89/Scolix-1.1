import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/scolix_logo.dart';

/// Coquille commune espace étudiant / espace enseignant : barre du haut
/// (logo + libellé d'espace) et barre d'onglets du bas, pilotées par un
/// [StatefulNavigationShell] de go_router (un onglet = une branche de
/// route, état conservé en arrière-plan). La déconnexion vit dans l'onglet
/// Paramètres (SettingsScreen), pas ici — voir _confirmLogout là-bas.
class RoleTabScaffold extends StatelessWidget {
  const RoleTabScaffold({
    super.key,
    required this.navigationShell,
    required this.spaceLabel,
    required this.destinations,
  });

  final StatefulNavigationShell navigationShell;
  final String spaceLabel;
  final List<NavigationDestination> destinations;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ScolixLogo(ScolixLogoAsset.icon, height: 18),
            const SizedBox(width: 8),
            Text('›', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(width: 8),
            Text(spaceLabel),
          ],
        ),
      ),
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
        destinations: destinations,
      ),
    );
  }
}
