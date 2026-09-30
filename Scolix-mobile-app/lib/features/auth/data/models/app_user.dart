/// Rôles pris en charge côté web (voir apps/authentication/models.py::User.Role).
/// L'app mobile ne couvre QUE student/teacher — admin/director restent web only.
enum UserRole { admin, teacher, student, director, unknown }

UserRole userRoleFromString(String value) {
  switch (value) {
    case 'ADMIN':
      return UserRole.admin;
    case 'TEACHER':
      return UserRole.teacher;
    case 'STUDENT':
      return UserRole.student;
    case 'DIRECTOR':
      return UserRole.director;
    default:
      return UserRole.unknown;
  }
}

/// Miroir de UserSerializer (apps/authentication/serializers.py) côté backend.
class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    required this.isActive,
    required this.isVerified,
    this.teacherName,
    this.studentName,
    this.studentDepartment,
    this.teacherProfileId,
    this.studentProfileId,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: userRoleFromString(json['role'] as String),
        isActive: json['is_active'] as bool? ?? true,
        isVerified: json['is_verified'] as bool? ?? false,
        teacherName: json['teacher_name'] as String?,
        studentName: json['student_name'] as String?,
        studentDepartment: json['student_department'] as String?,
        teacherProfileId: json['teacher_profile_id'] as String?,
        studentProfileId: json['student_profile_id'] as String?,
      );

  final String id;
  final String email;
  final UserRole role;
  final bool isActive;
  final bool isVerified;
  final String? teacherName;
  final String? studentName;

  /// Filière de l'étudiant — seule information de profil disponible sans
  /// appel supplémentaire (GET /auth/me/), voir plan étape 2 fonctionnalité 9.
  final String? studentDepartment;

  /// Id du profil ERP lié (TeacherSync/StudentSync) — nécessaire pour les
  /// endpoints /teachers/{id}/... en auto-accès (voir is_own côté backend,
  /// apps/evaluations/teacher_views.py). Distinct de [id], qui est l'id du
  /// compte User.
  final String? teacherProfileId;
  final String? studentProfileId;

  /// Nom d'affichage lisible — même logique que userDisplayName() côté web.
  String get displayName => teacherName ?? studentName ?? email;
}
