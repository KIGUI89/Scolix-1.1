# Documentation API Edu-Eval

## Introduction

Edu-Eval est une API backend développée avec **Django REST Framework** pour une plateforme d'évaluation des enseignants. Elle permet de gérer les utilisateurs, les enseignants, les étudiants, les campagnes d'évaluation, les formulaires anonymes, les scores, les statistiques, les notifications et les rapports.

## Base URL

```
http://127.0.0.1:8000/api/
```

## Authentification

L'API utilise **JWT Authentication**. La plupart des endpoints nécessitent un token d'accès dans l'en-tête :

```
Authorization: Bearer <access_token>
```

---

## 1. Authentification (`/api/auth/`)

### 1.1 Connexion
**POST** `/api/auth/login/`

Permet à un utilisateur de se connecter avec son email et mot de passe.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "STUDENT|TEACHER|ADMIN|DIRECTOR",
    "is_active": true,
    "is_verified": true,
    "teacher_profile_id": null,
    "teacher_name": null,
    "student_profile_id": "uuid",
    "student_name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Errors:**
- 400: Email ou mot de passe incorrect
- 400: Ce compte est désactivé

---

### 1.2 Rafraîchir le Token
**POST** `/api/auth/refresh/`

Permet de rafraîchir le token d'accès en utilisant le refresh token.

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### 1.3 Informations Utilisateur
**GET** `/api/auth/me/`

Retourne les informations de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "STUDENT|TEACHER|ADMIN|DIRECTOR",
  "is_active": true,
  "is_verified": true,
  "teacher_profile_id": null,
  "teacher_name": null,
  "student_profile_id": "uuid",
  "student_name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### 1.4 Gestion des Utilisateurs (Admin uniquement)
**GET** `/api/auth/users/`
**POST** `/api/auth/users/`
**GET** `/api/auth/users/{id}/`
**PUT** `/api/auth/users/{id}/`
**PATCH** `/api/auth/users/{id}/`
**DELETE** `/api/auth/users/{id}/**

Gestion complète des utilisateurs (réservée aux administrateurs).

**Request Body (POST):**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "role": "TEACHER",
  "teacher_profile_id": "uuid-teacher",
  "student_profile_id": null,
  "is_active": true,
  "is_verified": true
}
```

**Query Parameters:**
- `search`: Recherche par email, rôle, nom
- `ordering`: Tri par email, rôle, created_at

---

## 2. Synchronisation (`/api/sync/`)

### 2.1 Départements
**GET** `/api/sync/departments/`
**POST** `/api/sync/departments/`
**GET** `/api/sync/departments/{id}/`
**PUT** `/api/sync/departments/{id}/`
**PATCH** `/api/sync/departments/{id}/`
**DELETE** `/api/sync/departments/{id}/`

Gestion des départements académiques.

**Request Body (POST):**
```json
{
  "code": "INFO",
  "name": "Informatique",
  "description": "Département d'informatique"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "code": "INFO",
  "name": "Informatique",
  "description": "Département d'informatique",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Query Parameters:**
- `search`: Recherche par code, nom
- `ordering`: Tri par nom, code, created_at

---

### 2.2 Semestres Académiques
**GET** `/api/sync/semesters/`
**POST** `/api/sync/semesters/`
**GET** `/api/sync/semesters/{id}/`
**PUT** `/api/sync/semesters/{id}/`
**PATCH** `/api/sync/semesters/{id}/`
**DELETE** `/api/sync/semesters/{id}/`

Gestion des semestres académiques.

**Request Body (POST):**
```json
{
  "name": "Semestre 1 2024",
  "academic_year": "2023-2024",
  "start_date": "2024-01-15",
  "end_date": "2024-05-15",
  "is_active": true
}
```

**Query Parameters:**
- `search`: Recherche par nom, année académique
- `ordering`: Tri par start_date, end_date, name

---

### 2.3 Enseignants
**GET** `/api/sync/teachers/`
**POST** `/api/sync/teachers/`
**GET** `/api/sync/teachers/{id}/`
**PUT** `/api/sync/teachers/{id}/`
**PATCH** `/api/sync/teachers/{id}/`
**DELETE** `/api/sync/teachers/{id}/`

Gestion des enseignants synchronisés depuis l'ERP.

**Request Body (POST):**
```json
{
  "university_id": "EMP001",
  "matricule": "MAT001",
  "first_name": "Jean",
  "last_name": "Dupont",
  "email": "jean.dupont@university.edu",
  "department": "uuid-department",
  "grade": "Professeur",
  "specialty": "Informatique",
  "is_active": true
}
```

**Query Parameters:**
- `search`: Recherche par ID, matricule, nom, email, département, grade, spécialité
- `ordering`: Tri par nom, prénom, email, created_at

---

### 2.4 Étudiants
**GET** `/api/sync/students/`
**POST** `/api/sync/students/`
**GET** `/api/sync/students/{id}/`
**PUT** `/api/sync/students/{id}/`
**PATCH** `/api/sync/students/{id}/`
**DELETE** `/api/sync/students/{id}/`

Gestion des étudiants synchronisés depuis l'ERP.

**Request Body (POST):**
```json
{
  "university_id": "STU001",
  "student_code": "CODE001",
  "first_name": "Marie",
  "last_name": "Martin",
  "email": "marie.martin@university.edu",
  "department": "uuid-department",
  "level": "L3",
  "cohort": "2023-2024",
  "is_active": true
}
```

**Query Parameters:**
- `search`: Recherche par ID, code, nom, email, département, niveau, cohorte
- `ordering`: Tri par nom, prénom, code, created_at

---

### 2.5 Cours
**GET** `/api/sync/courses/`
**POST** `/api/sync/courses/`
**GET** `/api/sync/courses/{id}/`
**PUT** `/api/sync/courses/{id}/`
**PATCH** `/api/sync/courses/{id}/`
**DELETE** `/api/sync/courses/{id}/`

Gestion des cours synchronisés depuis l'ERP.

**Request Body (POST):**
```json
{
  "university_id": "COURSE001",
  "code": "INFO101",
  "name": "Introduction à l'informatique",
  "teacher": "uuid-teacher",
  "department": "uuid-department",
  "semester": "uuid-semester",
  "level": "L1",
  "cohort": "2023-2024",
  "credits": 6,
  "is_active": true
}
```

**Query Parameters:**
- `search`: Recherche par ID, code, nom, enseignant, département, semestre, niveau, cohorte
- `ordering`: Tri par code, nom, created_at

---

### 2.6 Inscriptions aux Cours
**GET** `/api/sync/enrollments/`
**POST** `/api/sync/enrollments/`
**GET** `/api/sync/enrollments/{id}/`
**PUT** `/api/sync/enrollments/{id}/`
**PATCH** `/api/sync/enrollments/{id}/`
**DELETE** `/api/sync/enrollments/{id}/`

Gestion des inscriptions des étudiants aux cours.

**Request Body (POST):**
```json
{
  "student": "uuid-student",
  "course": "uuid-course",
  "semester": "uuid-semester",
  "is_active": true
}
```

**Query Parameters:**
- `search`: Recherche par code étudiant, nom, code cours, nom cours, semestre
- `ordering`: Tri par enrolled_at, synced_at

---

### 2.7 Logs de Synchronisation
**GET** `/api/sync/logs/`
**GET** `/api/sync/logs/{id}/`

Consultation des logs de synchronisation (lecture seule).

**Response (200):**
```json
{
  "id": "uuid",
  "sync_type": "TEACHERS",
  "status": "SUCCESS|FAILED|IN_PROGRESS",
  "message": "Synchronisation réussie",
  "started_at": "2024-01-01T00:00:00Z",
  "ended_at": "2024-01-01T00:05:00Z",
  "records_processed": 150,
  "errors": []
}
```

**Query Parameters:**
- `search`: Recherche par type, statut, message
- `ordering`: Tri par started_at, ended_at

---

## 3. Campagnes d'Évaluation (`/api/campaigns/`)

### 3.1 Gestion des Campagnes
**GET** `/api/campaigns/`
**POST** `/api/campaigns/`
**GET** `/api/campaigns/{id}/`
**PUT** `/api/campaigns/{id}/`
**PATCH** `/api/campaigns/{id}/`
**DELETE** `/api/campaigns/{id}/`

Gestion des campagnes d'évaluation (Admin/Directeur uniquement).

**Request Body (POST):**
```json
{
  "title": "Évaluation Semestre 1 2024",
  "description": "Campagne d'évaluation des enseignants pour le semestre 1",
  "semester": "uuid-semester",
  "start_date": "2024-02-01",
  "end_date": "2024-02-29"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Évaluation Semestre 1 2024",
  "description": "Campagne d'évaluation des enseignants pour le semestre 1",
  "semester": "uuid-semester",
  "semester_name": "Semestre 1 2024",
  "start_date": "2024-02-01",
  "end_date": "2024-02-29",
  "status": "DRAFT|ACTIVE|CLOSED|CANCELLED",
  "is_open": true,
  "created_by": "uuid-admin",
  "created_by_email": "admin@university.edu",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Query Parameters:**
- `search`: Recherche par titre, description, semestre, statut
- `ordering`: Tri par titre, statut, start_date, end_date, created_at

---

### 3.2 Activer une Campagne
**POST** `/api/campaigns/{id}/activate/`

Active une campagne d'évaluation.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "is_open": true,
  ...
}
```

**Errors:**
- 400: Impossible d'activer cette campagne
- 400: La campagne est déjà active

---

### 3.3 Clôturer une Campagne
**POST** `/api/campaigns/{id}/close/`

Clôture une campagne d'évaluation.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "CLOSED",
  "is_open": false,
  ...
}
```

**Errors:**
- 400: Impossible de clôturer cette campagne
- 400: La campagne est déjà clôturée

---

### 3.4 Annuler une Campagne
**POST** `/api/campaigns/{id}/cancel/`

Annule une campagne d'évaluation.

**Response (200):**
```json
{
  "id": "uuid",
  "status": "CANCELLED",
  "is_open": false,
  ...
}
```

**Errors:**
- 400: Impossible d'annuler cette campagne
- 400: La campagne est déjà annulée

---

## 4. Évaluations (`/api/evaluations/`)

### 4.1 Critères d'Évaluation
**GET** `/api/evaluations/criteria/`
**POST** `/api/evaluations/criteria/`
**GET** `/api/evaluations/criteria/{id}/`
**PUT** `/api/evaluations/criteria/{id}/`
**PATCH** `/api/evaluations/criteria/{id}/`
**DELETE** `/api/evaluations/criteria/{id}/`

Gestion des critères d'évaluation (Admin/Directeur uniquement).

**Request Body (POST):**
```json
{
  "name": "Qualité pédagogique",
  "description": "Évalue la qualité de l'enseignement",
  "category": "Pédagogie",
  "weight": 25.5,
  "is_active": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Qualité pédagogique",
  "description": "Évalue la qualité de l'enseignement",
  "category": "Pédagogie",
  "weight": 25.5,
  "is_active": true,
  "version": 1,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Query Parameters:**
- `search`: Recherche par nom, description, catégorie
- `ordering`: Tri par nom, catégorie, poids, created_at

---

### 4.2 Soumissions d'Évaluation
**GET** `/api/evaluations/submissions/`
**POST** `/api/evaluations/submissions/`
**GET** `/api/evaluations/submissions/{id}/`
**PUT** `/api/evaluations/submissions/{id}/`
**PATCH** `/api/evaluations/submissions/{id}/`
**DELETE** `/api/evaluations/submissions/{id}/`

Gestion des soumissions d'évaluation.

**Request Body (POST):**
```json
{
  "campaign_id": "uuid-campaign",
  "course_id": "uuid-course",
  "responses": [
    {
      "criteria_id": "uuid-criteria-1",
      "score": 4,
      "comment": "Très bon enseignant"
    },
    {
      "criteria_id": "uuid-criteria-2",
      "score": 5,
      "comment": "Cours très intéressant"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "campaign": "uuid-campaign",
  "campaign_title": "Évaluation Semestre 1 2024",
  "course": "uuid-course",
  "course_name": "Introduction à l'informatique",
  "course_code": "INFO101",
  "teacher_name": "Jean Dupont",
  "student": "uuid-student",
  "student_email": "marie.martin@university.edu",
  "status": "SUBMITTED|DRAFT",
  "global_score": 4.5,
  "submitted_at": "2024-02-15T10:30:00Z",
  "created_at": "2024-02-15T10:30:00Z",
  "updated_at": "2024-02-15T10:30:00Z",
  "responses": [
    {
      "id": "uuid-response-1",
      "criteria": "uuid-criteria-1",
      "criteria_name": "Qualité pédagogique",
      "criteria_category": "Pédagogie",
      "score": 4,
      "comment": "Très bon enseignant",
      "created_at": "2024-02-15T10:30:00Z"
    }
  ]
}
```

**Permissions:**
- **ADMIN/DIRECTOR**: Accès à toutes les soumissions
- **STUDENT**: Accès uniquement à ses soumissions
- **TEACHER**: Accès aux soumissions de ses cours

---

### 4.3 Mes Cours Évaluables
**GET** `/api/evaluations/my-courses/`

Retourne la liste des cours qu'un étudiant peut évaluer dans les campagnes actives.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
[
  {
    "course_id": "uuid-course",
    "course_code": "INFO101",
    "course_name": "Introduction à l'informatique",
    "teacher_name": "Jean Dupont",
    "semester_id": "uuid-semester",
    "semester_name": "Semestre 1 2024",
    "campaign_id": "uuid-campaign",
    "campaign_title": "Évaluation Semestre 1 2024",
    "already_submitted": false
  }
]
```

**Permissions:**
- **STUDENT**: Uniquement les cours où il est inscrit

**Errors:**
- 403: Seuls les étudiants peuvent accéder à cette ressource

---

## 5. Documentation Swagger

L'API dispose d'une documentation interactive Swagger/OpenAPI disponible à :

**URL:** `http://127.0.0.1:8000/api/docs/`

Cette documentation permet de :
- Tester directement les endpoints
- Voir les schémas de requêtes/réponses
- Générer des clients API

---

## 6. Schéma OpenAPI

Le schéma OpenAPI est accessible à :

**URL:** `http://127.0.0.1:8000/api/schema/`

Format JSON pour une intégration dans des outils tiers.

---

## 7. Gestion des Erreurs

### Format des Erreurs
```json
{
  "detail": "Message d'erreur détaillé"
}
```

### Codes d'Erreur Communs
- **400**: Bad Request - Données invalides
- **401**: Unauthorized - Non authentifié
- **403**: Forbidden - Permissions insuffisantes
- **404**: Not Found - Ressource introuvable
- **500**: Internal Server Error - Erreur serveur

---

## 8. Permissions

### Rôles Utilisateurs
- **ADMIN**: Accès complet à toutes les ressources
- **DIRECTOR**: Accès aux campagnes, critères, et rapports
- **TEACHER**: Accès à ses évaluations et cours
- **STUDENT**: Accès à ses cours et soumissions d'évaluation

### Permissions par Endpoint
| Endpoint | Admin | Director | Teacher | Student |
|----------|-------|----------|---------|---------|
| `/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `/auth/me` | ✅ | ✅ | ✅ | ✅ |
| `/auth/users` | ✅ | ❌ | ❌ | ❌ |
| `/campaigns` | ✅ | ✅ | ❌ | ❌ |
| `/evaluations/criteria` | ✅ | ✅ | ❌ | ❌ |
| `/evaluations/submissions` | ✅ | ✅ | ✅ | ✅* |
| `/evaluations/my-courses` | ❌ | ❌ | ❌ | ✅ |
| `/sync/*` | ✅ | ✅ | ✅ | ✅ |

*Les étudiants ne voient que leurs propres soumissions

---

## 9. Validation des Données

### Contraintes Principales
- **Email**: Format email valide
- **Password**: Minimum 8 caractères
- **Score**: Entre 1 et 5
- **Weight**: Entre 0 et 100
- **Dates**: start_date < end_date

### Validation Métier
- Un étudiant ne peut soumettre qu'une seule évaluation par cours/campagne
- Les campagnes ne peuvent être activées que si les dates sont valides
- Les poids des critères doivent être positifs

---

## 10. Exemples d'Utilisation

### Scénario Complet : Évaluation d'un Enseignant

1. **Connexion Étudiant**
```bash
POST /api/auth/login/
{
  "email": "student@university.edu",
  "password": "password123"
}
```

2. **Récupérer les Cours Évaluables**
```bash
GET /api/evaluations/my-courses/
Authorization: Bearer <token>
```

3. **Soumettre une Évaluation**
```bash
POST /api/evaluations/submissions/
Authorization: Bearer <token>
{
  "campaign_id": "uuid-campaign",
  "course_id": "uuid-course",
  "responses": [
    {
      "criteria_id": "uuid-criteria-1",
      "score": 4,
      "comment": "Excellent enseignant"
    }
  ]
}
```

4. **Voir les Soumissions (Admin)**
```bash
GET /api/evaluations/submissions/
Authorization: Bearer <admin-token>
```

---

## 11. Développement

### Installation Locale
```bash
git clone https://github.com/Akb-debug/edu-eval.git
cd edu-eval
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Technologies Utilisées
- **Django REST Framework**: Framework API
- **PostgreSQL**: Base de données
- **JWT**: Authentification
- **Redis/Celery**: Tâches asynchrones
- **Swagger/OpenAPI**: Documentation API

---

## 12. Support

Pour toute question ou problème technique :
- Consulter la documentation Swagger: `/api/docs/`
- Vérifier les logs de synchronisation: `/api/sync/logs/`
- Contacter l'administrateur système

---

*Cette documentation couvre tous les endpoints disponibles dans la version actuelle de l'API Edu-Eval.*
