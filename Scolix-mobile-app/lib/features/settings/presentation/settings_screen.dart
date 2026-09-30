import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/application/auth_controller.dart';
import '../../auth/data/models/app_user.dart';
import '../../teacher/application/teacher_providers.dart';

/// Écran Paramètres — informations personnelles du compte connecté et
/// déconnexion. Sans équivalent dans la maquette (Scolix Mobile.dc.html) :
/// ajouté à la demande explicite de l'utilisateur, seul endroit de l'app où
/// se déconnecter — la session (tokens JWT en stockage sécurisé) reste
/// sinon active indéfiniment entre les lancements de l'app tant que le
/// refresh token n'a pas expiré (voir AuthController.build / TokenStorage).
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Se déconnecter ?'),
        content: const Text('Vous devrez ressaisir votre email et votre mot de passe pour vous reconnecter.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Annuler')),
          FilledButton(onPressed: () => Navigator.of(context).pop(true), child: const Text('Se déconnecter')),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(authControllerProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Paramètres',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 20),
          if (user != null) _ProfileCard(user: user),
          const SizedBox(height: 24),
          Text('Compte', style: Theme.of(context).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Card(
            child: ListTile(
              leading: Icon(Icons.logout, color: colorScheme.error),
              title: Text('Se déconnecter', style: TextStyle(color: colorScheme.error)),
              onTap: () => _confirmLogout(context, ref),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileCard extends ConsumerWidget {
  const _ProfileCard({required this.user});

  final AppUser user;

  String get _roleLabel => switch (user.role) {
        UserRole.student => 'Étudiant',
        UserRole.teacher => 'Enseignant',
        UserRole.admin => 'Administrateur',
        UserRole.director => 'Direction',
        UserRole.unknown => 'Rôle inconnu',
      };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final teacherProfileAsync = user.role == UserRole.teacher ? ref.watch(teacherProfileProvider) : null;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
                  child: Text(
                    user.displayName.isNotEmpty ? user.displayName[0].toUpperCase() : '?',
                    style: TextStyle(fontWeight: FontWeight.w600, color: colorScheme.primary, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(_roleLabel, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant)),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 28),
            _InfoRow(icon: Icons.mail_outline, label: 'Email', value: user.email),
            const SizedBox(height: 12),
            _InfoRow(
              icon: user.isVerified ? Icons.verified_outlined : Icons.info_outline,
              label: 'Statut du compte',
              value: user.isVerified ? 'Vérifié' : 'Non vérifié',
            ),
            if (user.role == UserRole.student && (user.studentDepartment ?? '').isNotEmpty) ...[
              const SizedBox(height: 12),
              _InfoRow(icon: Icons.school_outlined, label: 'Filière', value: user.studentDepartment!),
            ],
            if (teacherProfileAsync != null)
              teacherProfileAsync.when(
                loading: () => const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                ),
                error: (error, _) => Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'Informations de filière indisponibles pour le moment.',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
                  ),
                ),
                data: (profile) {
                  if (profile == null) return const SizedBox.shrink();
                  final rows = <Widget>[];
                  if ((profile.departmentName ?? '').isNotEmpty) {
                    rows.add(_InfoRow(icon: Icons.school_outlined, label: 'Filière', value: profile.departmentName!));
                  }
                  if ((profile.gradeName ?? '').isNotEmpty) {
                    rows.add(_InfoRow(icon: Icons.workspace_premium_outlined, label: 'Grade', value: profile.gradeName!));
                  }
                  if ((profile.specialty ?? '').isNotEmpty) {
                    rows.add(_InfoRow(icon: Icons.auto_stories_outlined, label: 'Spécialité', value: profile.specialty!));
                  }
                  if (rows.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final row in rows) ...[const SizedBox(height: 12), row],
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: colorScheme.onSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant)),
              Text(value, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}
