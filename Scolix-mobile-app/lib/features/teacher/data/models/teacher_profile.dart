/// Miroir de TeacherSyncSerializer (apps/sync/serializers.py) —
/// GET /api/teachers/{teacher_id}/, auto-accès confirmé pour TEACHER (voir
/// TeacherDetailView::is_own). Utilisé uniquement pour enrichir l'écran
/// Paramètres avec la filière/le grade/la spécialité, absents de
/// GET /auth/me/ (voir plan étape 2 fonctionnalité 9).
class TeacherProfile {
  const TeacherProfile({
    required this.departmentName,
    required this.gradeName,
    required this.specialty,
    required this.matricule,
  });

  factory TeacherProfile.fromJson(Map<String, dynamic> json) => TeacherProfile(
        departmentName: json['department_name'] as String?,
        gradeName: json['grade_name'] as String?,
        specialty: json['specialty'] as String?,
        matricule: json['matricule'] as String?,
      );

  final String? departmentName;
  final String? gradeName;
  final String? specialty;
  final String? matricule;
}
