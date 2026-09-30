import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/widgets/error_state.dart';
import '../application/student_providers.dart';
import '../data/models/teacher_report.dart';

const _monthsFr = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

String _fmtDate(DateTime d) => '${d.day.toString().padLeft(2, '0')} ${_monthsFr[d.month - 1]} ${d.year}';

/// Onglet Rapport — équivalent de la page web « Rapport » (/mes-rapports) :
/// signalements de l'étudiant sur ses enseignants, avec leur statut
/// (nouveau / lu / traité) et la réponse de l'administration, plus la
/// création d'un nouveau signalement.
class StudentReportScreen extends ConsumerWidget {
  const StudentReportScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(myTeacherReportsProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      floatingActionButton: FloatingActionButton(
        tooltip: 'Nouveau rapport',
        onPressed: () => showModalBottomSheet<void>(
          context: context,
          isScrollControlled: true,
          showDragHandle: true,
          builder: (_) => const _NewReportSheet(),
        ),
        child: const Icon(Icons.add),
      ),
      body: SafeArea(
        child: reportsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, _) => ErrorState(
            message: apiErrorMessage(error, fallback: 'Impossible de charger vos rapports.'),
            onRetry: () => ref.invalidate(myTeacherReportsProvider),
          ),
          data: (reports) {
            final sorted = [...reports]..sort((a, b) => b.createdAt.compareTo(a.createdAt));
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(myTeacherReportsProvider),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 88),
                children: [
                  Text(
                    'Rapport',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 16),
                  if (sorted.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          'Vous n\'avez rédigé aucun rapport pour le moment. Utilisez le bouton « + » pour en créer un.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                      ),
                    ),
                  for (final r in sorted) ...[
                    _ReportCard(report: r),
                    const SizedBox(height: 10),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  const _ReportCard({required this.report});

  final TeacherReport report;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final statusColor = switch (report.status) {
      'TREATED' => colorScheme.primary,
      'READ' => colorScheme.tertiary,
      _ => colorScheme.onSurfaceVariant,
    };

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(report.title, style: textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600))),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: statusColor),
                  ),
                  child: Text(report.statusLabel, style: textTheme.labelSmall?.copyWith(color: statusColor)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${report.teacherName} · ${_fmtDate(report.createdAt)}',
              style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 10),
            Text(report.description, style: textTheme.bodyMedium),
            const Divider(height: 24),
            if (report.adminResponse != null && report.adminResponse!.isNotEmpty) ...[
              Text(
                'Réponse de l\'administration${report.responseAt != null ? ' — ${_fmtDate(report.responseAt!)}' : ''}',
                style: textTheme.labelSmall?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 4),
              Text(report.adminResponse!, style: textTheme.bodyMedium),
            ] else
              Text(
                'Aucune réponse de l\'administration pour le moment.',
                style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
          ],
        ),
      ),
    );
  }
}

class _NewReportSheet extends ConsumerStatefulWidget {
  const _NewReportSheet();

  @override
  ConsumerState<_NewReportSheet> createState() => _NewReportSheetState();
}

class _NewReportSheetState extends ConsumerState<_NewReportSheet> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  String? _teacherId;
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await ref.read(studentRepositoryProvider).createTeacherReport(
            teacherId: _teacherId!,
            title: _title.text.trim(),
            description: _description.text.trim(),
          );
      ref.invalidate(myTeacherReportsProvider);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() => _error = apiErrorMessage(e, fallback: 'Impossible d\'enregistrer ce rapport.'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final teachersAsync = ref.watch(reportableTeachersProvider);

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Nouveau rapport', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 16),
            teachersAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text(apiErrorMessage(e, fallback: 'Impossible de charger vos enseignants.')),
              data: (teachers) => teachers.isEmpty
                  ? const Text('Aucun enseignant trouvé dans vos inscriptions.')
                  : DropdownButtonFormField<String>(
                      initialValue: _teacherId,
                      isExpanded: true,
                      decoration: const InputDecoration(labelText: 'Enseignant concerné'),
                      items: [
                        for (final t in teachers)
                          DropdownMenuItem(value: t.teacherId, child: Text(t.teacherName, overflow: TextOverflow.ellipsis)),
                      ],
                      onChanged: (v) => setState(() => _teacherId = v),
                      validator: (v) => v == null ? 'Choisissez un enseignant.' : null,
                    ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _title,
              maxLength: 200,
              decoration: const InputDecoration(labelText: 'Titre'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Titre requis.' : null,
            ),
            TextFormField(
              controller: _description,
              minLines: 4,
              maxLines: 8,
              decoration: const InputDecoration(labelText: 'Contenu'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Contenu requis.' : null,
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Enregistrer'),
            ),
          ],
        ),
      ),
    );
  }
}
