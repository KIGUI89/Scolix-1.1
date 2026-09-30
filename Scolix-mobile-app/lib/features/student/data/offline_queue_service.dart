import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'models/pending_submission.dart';

/// Persistance locale des soumissions en attente (formulaire d'évaluation
/// hors-ligne, écran 03 de la maquette) — un simple JSON dans
/// SharedPreferences suffit au volume de données concerné (quelques
/// soumissions en attente au plus), sans dépendance à une base embarquée.
class OfflineQueueService {
  static const _key = 'scolix_pending_submissions';

  Future<List<PendingSubmission>> loadAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    final list = jsonDecode(raw) as List;
    return list
        .map((e) => PendingSubmission.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }

  Future<void> _saveAll(List<PendingSubmission> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, jsonEncode(items.map((e) => e.toJson()).toList()));
  }

  Future<void> enqueue(PendingSubmission submission) async {
    final items = await loadAll();
    items.add(submission);
    await _saveAll(items);
  }

  Future<void> remove(String localId) async {
    final items = await loadAll();
    items.removeWhere((e) => e.localId == localId);
    await _saveAll(items);
  }
}
