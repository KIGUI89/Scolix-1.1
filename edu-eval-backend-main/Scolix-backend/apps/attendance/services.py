from typing import Optional
from django.db import transaction
from django.db.models import Avg
from .models import AttendanceRecord, AttendanceAlert
from apps.sync.models import TeacherSync

LATE_THRESHOLD = 3
ABSENCE_THRESHOLD = 2


class AttendanceService:

    @staticmethod
    def compute_punctuality_rate(teacher, period=None):
        qs = AttendanceRecord.objects.filter(teacher=teacher)
        if period:
            year, month = period.split("-")
            qs = qs.filter(scheduled_at__year=int(year), scheduled_at__month=int(month))
        total   = qs.count()
        on_time = qs.filter(status=AttendanceRecord.Status.ON_TIME).count()
        late    = qs.filter(status=AttendanceRecord.Status.LATE).count()
        absent  = qs.filter(status=AttendanceRecord.Status.ABSENT).count()
        avg_delay = qs.filter(status=AttendanceRecord.Status.LATE).aggregate(avg=Avg("delay_minutes"))["avg"] or 0
        return {
            "total": total, "on_time": on_time, "late": late, "absent": absent,
            "punctuality_rate": round((on_time / total) * 100, 2) if total else 0.0,
            "avg_delay_minutes": round(avg_delay, 1),
        }

    @staticmethod
    @transaction.atomic
    def check_and_create_alerts(teacher, period):
        year, month = period.split("-")
        qs = AttendanceRecord.objects.filter(
            teacher=teacher, scheduled_at__year=int(year), scheduled_at__month=int(month))
        late_count   = qs.filter(status=AttendanceRecord.Status.LATE).count()
        absent_count = qs.filter(status=AttendanceRecord.Status.ABSENT).count()
        new_alerts = []

        if late_count >= LATE_THRESHOLD:
            alert, created = AttendanceAlert.objects.get_or_create(
                teacher=teacher, alert_type=AttendanceAlert.AlertType.LATE_THRESHOLD, period=period,
                defaults={"count": late_count, "message": f"{teacher.full_name} : {late_count} retard(s) en {period}."},
            )
            if created:
                new_alerts.append(alert)
                try:
                    from apps.notifications.services import NotificationService
                    NotificationService.notify_attendance_alert(alert)
                except Exception:
                    pass

        if absent_count >= ABSENCE_THRESHOLD:
            alert, created = AttendanceAlert.objects.get_or_create(
                teacher=teacher, alert_type=AttendanceAlert.AlertType.ABSENCE_THRESHOLD, period=period,
                defaults={"count": absent_count, "message": f"{teacher.full_name} : {absent_count} absence(s) en {period}."},
            )
            if created:
                new_alerts.append(alert)
                try:
                    from apps.notifications.services import NotificationService
                    NotificationService.notify_attendance_alert(alert)
                except Exception:
                    pass

        return new_alerts
