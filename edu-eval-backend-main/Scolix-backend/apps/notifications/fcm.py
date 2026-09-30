"""Envoi de notifications push via Firebase Cloud Messaging (API HTTP v1).

Authentification OAuth 2.0 par compte de service : la clé JSON est lue depuis
le chemin FCM_SERVICE_ACCOUNT_FILE (fichier .env, hors du dépôt Git).
"""
import logging
import threading

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
ANDROID_CHANNEL_ID = "scolix_default"

_credentials = None
_lock = threading.Lock()


class FcmNotConfigured(Exception):
    pass


class FcmInvalidToken(Exception):
    """Le jeton n'est plus valide (application désinstallée, jeton renouvelé…)."""


def is_configured():
    return bool(settings.FCM_PROJECT_ID and settings.FCM_SERVICE_ACCOUNT_FILE)


def _access_token():
    global _credentials
    from google.auth.transport.requests import Request
    from google.oauth2 import service_account

    with _lock:
        if _credentials is None:
            _credentials = service_account.Credentials.from_service_account_file(
                settings.FCM_SERVICE_ACCOUNT_FILE, scopes=[FCM_SCOPE]
            )
        if not _credentials.valid:
            _credentials.refresh(Request())
        return _credentials.token


def send_to_token(token, *, title, body, data=None):
    """Envoie un message à un appareil. Lève FcmInvalidToken si FCM déclare le
    jeton invalide, FcmNotConfigured si le projet n'est pas configuré, et
    requests.HTTPError pour toute autre erreur."""
    if not is_configured():
        raise FcmNotConfigured("FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_FILE absents du .env")

    message = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            # Les valeurs de `data` doivent toutes être des chaînes.
            "data": {k: str(v) for k, v in (data or {}).items()},
            "android": {
                "priority": "HIGH",
                "notification": {"channel_id": ANDROID_CHANNEL_ID},
            },
        }
    }
    response = requests.post(
        f"https://fcm.googleapis.com/v1/projects/{settings.FCM_PROJECT_ID}/messages:send",
        json=message,
        headers={"Authorization": f"Bearer {_access_token()}"},
        timeout=10,
    )
    if response.status_code in (400, 404):
        details = response.json().get("error", {}).get("details", [])
        codes = {d.get("errorCode") for d in details}
        if codes & {"UNREGISTERED", "INVALID_ARGUMENT"}:
            raise FcmInvalidToken(response.text)
    response.raise_for_status()
    return response.json().get("name")
