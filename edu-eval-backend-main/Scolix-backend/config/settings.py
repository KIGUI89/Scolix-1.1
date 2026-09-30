"""
Django settings for config project.
"""

from datetime import timedelta
from pathlib import Path

from decouple import config

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "Edu-Eval <noreply@edu-eval.local>"


BASE_DIR = Path(__file__).resolve().parent.parent


# SECURITY — DEV ONLY
SECRET_KEY = "django-insecure-4-4ryxsuvj^+dj9up*2*ng-29*$kep(o1d66pzgw+%@40-xq3j"
DEBUG = True

ALLOWED_HOSTS = ["*"]


# APPLICATIONS
INSTALLED_APPS = [
    # Django apps
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party apps
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "drf_spectacular_sidecar",
    "corsheaders",

    # Local apps
    "apps.authentication",
    "apps.sync",
    "apps.campaigns",
    "apps.evaluations",
    "apps.attendance",
    "apps.analytics",
    "apps.ai_engine",
    "apps.notifications",
    "apps.reports",
    "apps.audit",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"


# DATABASE — SUPABASE POSTGRESQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT", default="5432"),
    }
}


# CUSTOM USER MODEL
AUTH_USER_MODEL = "authentication.User"


# PASSWORD VALIDATION
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# INTERNATIONALIZATION
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# STATIC FILES
STATIC_URL = "static/"


# DJANGO REST FRAMEWORK
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}


# SIMPLE JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    # Refresh token kept effectively indefinite: the mobile/web session must
    # only end when the user explicitly logs out, never by silent expiry.
    "REFRESH_TOKEN_LIFETIME": timedelta(days=3650),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# SWAGGER / OPENAPI
SPECTACULAR_SETTINGS = {
    "TITLE": "Edu-Eval API",
    "DESCRIPTION": "API backend pour la plateforme d’évaluation des enseignants.",
    "VERSION": "1.0.0",
    "SWAGGER_UI_DIST": "SIDECAR",
    "SWAGGER_UI_FAVICON_HREF": "SIDECAR",
    "REDOC_DIST": "SIDECAR",
    "COMPONENT_SPLIT_REQUEST": True,
    "SERVE_INCLUDE_SCHEMA": False,
}


# CORS — REACT WEB + FLUTTER WEB
CORS_ALLOWED_ORIGINS = [
    # React CRA
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    # React Vite
    "http://localhost:5173",
    "http://127.0.0.1:5173",

    # Flutter Web
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",

    # Backend local / Swagger
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

if DEBUG:
    # `flutter run -d chrome` (surtout lancé depuis un IDE comme Android
    # Studio) choisit un port aléatoire à chaque lancement plutôt que l'un
    # des ports fixes listés ci-dessus dans CORS_ALLOWED_ORIGINS — sans
    # cette regex, chaque nouveau port bloque silencieusement les requêtes
    # (échec CORS, remonté côté Flutter comme une simple erreur de connexion).
    # Restreint à DEBUG=True : ne s'applique jamais en production.
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
    ]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]


# CSRF — utile pour les clients web si cookies/session utilisés
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]


# DEVELOPMENT HELPERS
# Pour tester Flutter sur téléphone réel :
# 1. ajoute l'IP locale de ton PC dans ALLOWED_HOSTS
#    exemple : ALLOWED_HOSTS += ["192.168.1.10"]
# 2. lance le serveur avec :
#    python manage.py runserver 0.0.0.0:8000
#
# Ne pas activer en production :
# CORS_ALLOW_ALL_ORIGINS = True


EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = f"Edu-Eval <{EMAIL_HOST_USER}>"


# Notifications push — Firebase Cloud Messaging (API HTTP v1).
# Les deux valeurs viennent du fichier .env (jamais dans le code ni dans Git) :
#   FCM_PROJECT_ID           : identifiant du projet Firebase
#   FCM_SERVICE_ACCOUNT_FILE : chemin absolu de la clé JSON du compte de
#                              service, stockée hors du dépôt
# Sans elles, les notifications PUSH sont marquées « échouées » (aucun envoi).
FCM_PROJECT_ID = config("FCM_PROJECT_ID", default="")
FCM_SERVICE_ACCOUNT_FILE = config("FCM_SERVICE_ACCOUNT_FILE", default="")