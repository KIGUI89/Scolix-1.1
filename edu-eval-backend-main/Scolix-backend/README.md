"# edu-eval" 
# Edu-Eval Backend

Edu-Eval est une API backend développée avec **Django REST Framework** pour une plateforme d’évaluation des enseignants.

Elle permet de gérer les utilisateurs, les enseignants, les étudiants, les campagnes d’évaluation, les formulaires anonymes, les scores, les statistiques, les notifications et les rapports.

---

## Stack technique

- Django REST Framework
- PostgreSQL
- JWT Authentication
- Redis / Celery
- Swagger / OpenAPI

---

## Installation après clonage

```bash
git clone https://github.com/Akb-debug/edu-eval.git
cd edu-eval

Créer et activer l’environnement virtuel :

python -m venv venv
venv\Scripts\activate

Installer les dépendances :

pip install -r requirements.txt

Créer le fichier .env à partir de .env.example, puis lancer :

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

API locale :

http://127.0.0.1:8000/
Organisation Git

La branche principale est :

main

Elle doit rester stable.

Chaque développeur travaille uniquement sur sa branche personnelle :

allode_dev
kigui_dev
nika_dev
Répartition des branches
Développeur	Branche	Responsabilité
ALLODE Kany Benjamin	allode_dev	Architecture, modèles, campagnes, notifications, rapports, intégration
KIGUI	kigui_dev	Authentification, rôles, évaluations, critères, présence
NIKA Reine	nika_dev	Analytics, tableaux de bord, IA, audit logs
Règles de travail
Ne jamais coder directement sur main
Chaque dev travaille sur sa branche personnelle
Avant de commencer, récupérer la dernière version de main
Faire des commits clairs
Pousser son travail sur GitHub
Le chef vérifie avant de fusionner dans main
Commandes Git pour chaque dev
1. Cloner le projet
git clone https://github.com/Akb-debug/edu-eval.git
cd edu-eval
2. Créer sa branche personnelle

Pour ALLODE :

git checkout -b allode_dev

Pour KIGUI :

git checkout -b kigui_dev

Pour NIKA :

git checkout -b nika_dev
3. Envoyer la branche sur GitHub
git push -u origin nom_branche

Exemple :

git push -u origin allode_dev
Travailler chaque jour

Avant de coder :

git checkout main
git pull origin main
git checkout nom_branche
git merge main

Exemple :

git checkout main
git pull origin main
git checkout kigui_dev
git merge main

Après avoir codé :

git status
git add .
git commit -m "feat(module): description"
git push origin nom_branche

Exemple :

git commit -m "feat(auth): add jwt login"
git push origin kigui_dev
Fusion vers main

Quand un dev termine une tâche :

Il pousse sa branche sur GitHub
Il crée une Pull Request vers main
Le chef relit le code
Le chef merge si tout est correct
Convention de commit

Format :

type(module): description

Exemples :

git commit -m "feat(auth): add login endpoint"
git commit -m "feat(evaluations): add evaluation model"
git commit -m "fix(campaigns): correct token generation"
git commit -m "docs(readme): update setup guide"

Types utiles :

feat  : nouvelle fonctionnalité
fix   : correction
docs  : documentation
chore : configuration
test  : tests



Répartition du travail

ALLODE — allode_dev
Configuration du projet
Structure des apps
Modèles principaux
Campagnes d’évaluation
Notifications
Rapports PDF / Excel
Revue et intégration

KIGUI — kigui_dev
Authentification JWT
Gestion des rôles
Permissions
Formulaires d’évaluation
Critères d’évaluation
Présence et ponctualité

NIKA — nika_dev
Dashboard
Statistiques
Classements
Audit logs
IA / recommandations


Objectif de la V1
Authentification
Gestion enseignants / étudiants / cours
Campagnes
Évaluations anonymes
Calcul des scores
Dashboard simple
Documentation API
