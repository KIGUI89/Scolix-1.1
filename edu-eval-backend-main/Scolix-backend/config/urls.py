from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),

    # Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/",   SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Auth
    path("api/auth/",          include("apps.authentication.urls")),

    # Sync ERP
    path("api/sync/",          include("apps.sync.urls")),

    # Campagnes
    path("api/campaigns/",     include("apps.campaigns.urls")),

    # Évaluations
    path("api/evaluations/",   include("apps.evaluations.urls")),

    # Enseignants (scores, commentaires, présences)
    path("api/teachers/",      include("apps.evaluations.teacher_urls")),

    # Présences & alertes
    path("api/attendance/",    include("apps.attendance.urls")),

    # Notifications
    path("api/notifications/", include("apps.notifications.urls")),

    # Audit
    path("api/audit/",         include("apps.audit.urls")),

    # Analytics
    path("api/analytics/",     include("apps.analytics.urls")),

    # AI Engine
    path("api/ai/",            include("apps.ai_engine.urls")),

    # Reports (export CSV/Excel/PDF)
    path("api/reports/",       include("apps.reports.urls")),

    #ALLODE NIKA KIGUI
]
