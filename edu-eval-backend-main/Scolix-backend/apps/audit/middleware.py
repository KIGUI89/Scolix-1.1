"""
Middleware qui logue automatiquement chaque requête mutante (POST/PUT/PATCH/DELETE)
dans la table audit_logs.
"""
import logging

logger = logging.getLogger(__name__)

TRACKED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SKIP_PATHS = {"/api/auth/login/", "/api/auth/refresh/", "/api/schema/", "/api/docs/"}


def _get_ip(request):
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _resource_from_path(path: str) -> tuple[str, str | None]:
    """Déduit le nom de la ressource et l'id depuis le path."""
    parts = [p for p in path.strip("/").split("/") if p]
    # ex: ["api", "evaluations", "submissions", "<uuid>"]
    resource = parts[2] if len(parts) >= 3 else (parts[1] if len(parts) >= 2 else path)
    resource_id = parts[3] if len(parts) >= 4 else None
    return resource.replace("-", "_"), resource_id


class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.method not in TRACKED_METHODS:
            return response

        if request.path in SKIP_PATHS:
            return response

        if response.status_code >= 500:
            return response

        try:
            from .models import AuditLog

            action_map = {
                "POST":   AuditLog.Action.CREATE,
                "PUT":    AuditLog.Action.UPDATE,
                "PATCH":  AuditLog.Action.UPDATE,
                "DELETE": AuditLog.Action.DELETE,
            }
            action = action_map.get(request.method, AuditLog.Action.ACCESS)
            resource, resource_id = _resource_from_path(request.path)

            user = getattr(request, "user", None)
            if user and not user.is_authenticated:
                user = None

            AuditLog.objects.create(
                user=user,
                action=action,
                resource=resource,
                resource_id=resource_id,
                ip_address=_get_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
                detail=f"{request.method} {request.path} → {response.status_code}",
            )
        except Exception as exc:
            logger.warning("AuditMiddleware error: %s", exc)

        return response
