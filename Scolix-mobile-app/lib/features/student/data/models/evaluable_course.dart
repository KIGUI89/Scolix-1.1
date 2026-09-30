/// Miroir de MyEvaluableCourseSerializer (apps/evaluations/serializers.py) —
/// une ligne = un cours à évaluer par l'étudiant connecté, dans une campagne
/// active.
class EvaluableCourse {
  const EvaluableCourse({
    required this.courseId,
    required this.courseCode,
    required this.courseName,
    required this.teacherId,
    required this.teacherName,
    required this.isSecondaryTeacher,
    required this.semesterId,
    required this.semesterName,
    required this.campaignId,
    required this.campaignTitle,
    required this.campaignEndDate,
    required this.alreadySubmitted,
    required this.hasDraft,
  });

  factory EvaluableCourse.fromJson(Map<String, dynamic> json) => EvaluableCourse(
        courseId: json['course_id'] as String,
        courseCode: json['course_code'] as String,
        courseName: json['course_name'] as String,
        teacherId: json['teacher_id'] as String,
        teacherName: json['teacher_name'] as String,
        isSecondaryTeacher: json['is_secondary_teacher'] as bool? ?? false,
        semesterId: json['semester_id'] as String,
        semesterName: json['semester_name'] as String,
        campaignId: json['campaign_id'] as String,
        campaignTitle: json['campaign_title'] as String,
        campaignEndDate: DateTime.parse(json['campaign_end_date'] as String),
        alreadySubmitted: json['already_submitted'] as bool,
        hasDraft: json['has_draft'] as bool? ?? false,
      );

  final String courseId;
  final String courseCode;
  final String courseName;
  final String teacherId;
  final String teacherName;
  final bool isSecondaryTeacher;
  final String semesterId;
  final String semesterName;
  final String campaignId;
  final String campaignTitle;
  final DateTime campaignEndDate;
  final bool alreadySubmitted;
  final bool hasDraft;

  /// Identifiant unique de la tâche : un cours avec un prof secondaire produit
  /// deux entrées distinctes dans /evaluations/my-courses/ (une par teacherId).
  String get taskId => '$courseId:$teacherId';

  /// Jours restants avant la clôture (négatif si déjà clôturée).
  int get daysUntilClose => campaignEndDate.difference(DateTime.now()).inDays;
}
