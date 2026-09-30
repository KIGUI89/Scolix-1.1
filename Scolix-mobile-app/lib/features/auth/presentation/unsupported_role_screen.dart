import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/auth_controller.dart';

/// Scolix mobile ne couvre que les rôles étudiant et professeur — les
/// comptes ADMIN/DIRECTOR restent réservés à l'interface web. On ne les
/// laisse pas silencieusement échouer : on explique pourquoi et on
/// propose de se déconnecter.
class UnsupportedRoleScreen extends ConsumerWidget {
  const UnsupportedRoleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.block_outlined,
                  size: 56,
                  color: Theme.of(context).colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Rôle non pris en charge',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  "L'application mobile Scolix est réservée aux comptes "
                  "étudiant et professeur. Les comptes administrateur/"
                  "direction doivent utiliser l'interface web.",
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                  child: const Text('Se déconnecter'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
