-- ============================================================
-- Script de création de la base de données Scolix (PostgreSQL)
-- Version documentée : noms des tables et des colonnes en français
-- 31 tables, 39 clés étrangères
-- ============================================================

-- ------------------------------------------------------------
-- 1. Création des tables
-- ------------------------------------------------------------

CREATE TABLE utilisateurs (
    mot_de_passe         character varying(128) NOT NULL,
    derniere_connexion   timestamp with time zone,
    est_superutilisateur boolean NOT NULL,
    id                   uuid NOT NULL,
    email                character varying(254) NOT NULL,
    role                 character varying(20) NOT NULL,
    est_actif            boolean NOT NULL,
    est_personnel        boolean NOT NULL,
    est_verifie          boolean NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    date_modification    timestamp with time zone NOT NULL,
    profil_etudiant_id   uuid,
    profil_enseignant_id uuid,
    CONSTRAINT pk_utilisateurs PRIMARY KEY (id),
    CONSTRAINT uq_utilisateurs_email UNIQUE (email),
    CONSTRAINT uq_utilisateurs_profil_etudiant_id UNIQUE (profil_etudiant_id),
    CONSTRAINT uq_utilisateurs_profil_enseignant_id UNIQUE (profil_enseignant_id)
);

CREATE TABLE departements (
    id                   uuid NOT NULL,
    code                 character varying(30) NOT NULL,
    nom                  character varying(150) NOT NULL,
    description          text,
    est_actif            boolean NOT NULL,
    date_synchronisation timestamp with time zone NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    CONSTRAINT pk_departements PRIMARY KEY (id),
    CONSTRAINT uq_departements_code UNIQUE (code)
);

CREATE TABLE semestres (
    id                   uuid NOT NULL,
    nom                  character varying(150) NOT NULL,
    annee_academique     character varying(20) NOT NULL,
    date_debut           date NOT NULL,
    date_fin             date NOT NULL,
    est_actif            boolean NOT NULL,
    date_synchronisation timestamp with time zone NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    CONSTRAINT pk_semestres PRIMARY KEY (id)
);

CREATE TABLE grades (
    id                   uuid NOT NULL,
    date_synchronisation timestamp with time zone NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    nom                  character varying(100) NOT NULL,
    description          text,
    rang                 integer NOT NULL,
    est_actif            boolean NOT NULL,
    CONSTRAINT pk_grades PRIMARY KEY (id),
    CONSTRAINT uq_grades_nom UNIQUE (nom),
    CONSTRAINT ck_grades_rang CHECK (rang >= 0)
);

CREATE TABLE enseignants (
    id                     uuid NOT NULL,
    identifiant_universite character varying(80) NOT NULL,
    matricule              character varying(80) NOT NULL,
    prenom                 character varying(100) NOT NULL,
    nom                    character varying(100) NOT NULL,
    email                  character varying(254) NOT NULL,
    telephone              character varying(30),
    specialite             character varying(150),
    est_actif              boolean NOT NULL,
    date_synchronisation   timestamp with time zone NOT NULL,
    date_creation          timestamp with time zone NOT NULL,
    departement_id         uuid NOT NULL,
    grade_id               uuid,
    CONSTRAINT pk_enseignants PRIMARY KEY (id),
    CONSTRAINT uq_enseignants_email UNIQUE (email),
    CONSTRAINT uq_enseignants_matricule UNIQUE (matricule),
    CONSTRAINT uq_enseignants_identifiant_universite UNIQUE (identifiant_universite)
);

CREATE TABLE etudiants (
    id                     uuid NOT NULL,
    identifiant_universite character varying(80) NOT NULL,
    code_etudiant          character varying(80) NOT NULL,
    prenom                 character varying(100) NOT NULL,
    nom                    character varying(100) NOT NULL,
    email                  character varying(254) NOT NULL,
    telephone              character varying(30),
    niveau                 character varying(50) NOT NULL,
    cohorte                character varying(80) NOT NULL,
    est_actif              boolean NOT NULL,
    date_synchronisation   timestamp with time zone NOT NULL,
    date_creation          timestamp with time zone NOT NULL,
    departement_id         uuid NOT NULL,
    annee_academique       character varying(20) NOT NULL,
    CONSTRAINT pk_etudiants PRIMARY KEY (id),
    CONSTRAINT uq_etudiants_email UNIQUE (email),
    CONSTRAINT uq_etudiants_code_etudiant UNIQUE (code_etudiant),
    CONSTRAINT uq_etudiants_identifiant_universite UNIQUE (identifiant_universite)
);

CREATE TABLE cours (
    id                     uuid NOT NULL,
    identifiant_universite character varying(80) NOT NULL,
    code                   character varying(80) NOT NULL,
    intitule               character varying(180) NOT NULL,
    description            text,
    niveau                 character varying(50) NOT NULL,
    cohorte                character varying(80) NOT NULL,
    credits                integer NOT NULL,
    est_actif              boolean NOT NULL,
    date_synchronisation   timestamp with time zone NOT NULL,
    date_creation          timestamp with time zone NOT NULL,
    semestre_id            uuid NOT NULL,
    departement_id         uuid NOT NULL,
    enseignant_id          uuid NOT NULL,
    grade_id               uuid,
    CONSTRAINT pk_cours PRIMARY KEY (id),
    CONSTRAINT uq_cours_code UNIQUE (code),
    CONSTRAINT uq_cours_identifiant_universite UNIQUE (identifiant_universite),
    CONSTRAINT ck_cours_credits CHECK (credits >= 0)
);

CREATE TABLE cours_enseignants_secondaires (
    id            bigint NOT NULL,
    cours_id      uuid NOT NULL,
    enseignant_id uuid NOT NULL,
    CONSTRAINT pk_cours_enseignants_secondaires PRIMARY KEY (id),
    CONSTRAINT uq_cours_enseignants_secondaires_cours_id_enseignant_id UNIQUE (cours_id, enseignant_id)
);

CREATE TABLE inscriptions (
    id                   uuid NOT NULL,
    est_actif            boolean NOT NULL,
    date_inscription     timestamp with time zone NOT NULL,
    date_synchronisation timestamp with time zone NOT NULL,
    cours_id             uuid NOT NULL,
    semestre_id          uuid NOT NULL,
    etudiant_id          uuid NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    CONSTRAINT pk_inscriptions PRIMARY KEY (id),
    CONSTRAINT uq_inscriptions_etudiant_id_cours_id_semestre_id UNIQUE (etudiant_id, cours_id, semestre_id)
);

CREATE TABLE lots_import (
    id               uuid NOT NULL,
    type_entite      character varying(20) NOT NULL,
    nom_fichier      character varying(255) NOT NULL,
    statut           character varying(20) NOT NULL,
    entetes          jsonb NOT NULL,
    lignes           jsonb NOT NULL,
    correspondance   jsonb,
    validation       jsonb,
    date_creation    timestamp with time zone NOT NULL,
    date_integration timestamp with time zone,
    cree_par_id      uuid,
    CONSTRAINT pk_lots_import PRIMARY KEY (id)
);

CREATE TABLE journaux_synchronisation (
    id                   uuid NOT NULL,
    type_synchronisation character varying(20) NOT NULL,
    statut               character varying(20) NOT NULL,
    nb_enseignants       integer NOT NULL,
    nb_etudiants         integer NOT NULL,
    nb_cours             integer NOT NULL,
    nb_inscriptions      integer NOT NULL,
    message              text,
    erreurs              jsonb,
    date_debut           timestamp with time zone NOT NULL,
    date_fin             timestamp with time zone,
    type_entite          character varying(20),
    fichier_source       character varying(255),
    CONSTRAINT pk_journaux_synchronisation PRIMARY KEY (id),
    CONSTRAINT ck_journaux_synchronisation_nb_cours CHECK (nb_cours >= 0),
    CONSTRAINT ck_journaux_synchronisation_nb_inscriptions CHECK (nb_inscriptions >= 0),
    CONSTRAINT ck_journaux_synchronisation_nb_etudiants CHECK (nb_etudiants >= 0),
    CONSTRAINT ck_journaux_synchronisation_nb_enseignants CHECK (nb_enseignants >= 0)
);

CREATE TABLE campagnes (
    id                uuid NOT NULL,
    titre             character varying(180) NOT NULL,
    description       text,
    date_debut        timestamp with time zone NOT NULL,
    date_fin          timestamp with time zone NOT NULL,
    statut            character varying(20) NOT NULL,
    date_creation     timestamp with time zone NOT NULL,
    date_modification timestamp with time zone NOT NULL,
    cree_par_id       uuid NOT NULL,
    semestre_id       uuid NOT NULL,
    est_supprimee     boolean NOT NULL,
    date_relance      timestamp with time zone,
    CONSTRAINT pk_campagnes PRIMARY KEY (id)
);

CREATE TABLE criteres (
    id                uuid NOT NULL,
    nom               character varying(150) NOT NULL,
    description       text,
    categorie         character varying(30) NOT NULL,
    est_actif         boolean NOT NULL,
    version           integer NOT NULL,
    date_creation     timestamp with time zone NOT NULL,
    date_modification timestamp with time zone NOT NULL,
    CONSTRAINT pk_criteres PRIMARY KEY (id),
    CONSTRAINT ck_criteres_version CHECK (version >= 0)
);

CREATE TABLE ponderations (
    id            uuid NOT NULL,
    pourcentage   numeric(5,2) NOT NULL,
    date_creation timestamp with time zone NOT NULL,
    campagne_id   uuid NOT NULL,
    critere_id    uuid NOT NULL,
    CONSTRAINT pk_ponderations PRIMARY KEY (id),
    CONSTRAINT uq_ponderations_campagne_id_critere_id UNIQUE (campagne_id, critere_id)
);

CREATE TABLE evaluations (
    id                   uuid NOT NULL,
    statut               character varying(20) NOT NULL,
    score_global         numeric(5,2) NOT NULL,
    date_soumission      timestamp with time zone NOT NULL,
    date_creation        timestamp with time zone NOT NULL,
    date_modification    timestamp with time zone NOT NULL,
    campagne_id          uuid NOT NULL,
    cours_id             uuid NOT NULL,
    etudiant_id          uuid NOT NULL,
    score_recommandation smallint,
    ref_etudiant_hash    character varying(64) NOT NULL,
    enseignant_id        uuid NOT NULL,
    CONSTRAINT pk_evaluations PRIMARY KEY (id),
    CONSTRAINT uq_evaluations_campagne_id_cours_id_etudiant_id_enseignant_id UNIQUE (campagne_id, cours_id, etudiant_id, enseignant_id),
    CONSTRAINT ck_evaluations_score_recommandation CHECK (score_recommandation >= 0)
);

CREATE TABLE reponses (
    id            uuid NOT NULL,
    score         smallint NOT NULL,
    commentaire   text,
    date_creation timestamp with time zone NOT NULL,
    critere_id    uuid NOT NULL,
    evaluation_id uuid NOT NULL,
    CONSTRAINT pk_reponses PRIMARY KEY (id),
    CONSTRAINT uq_reponses_evaluation_id_critere_id UNIQUE (evaluation_id, critere_id),
    CONSTRAINT ck_reponses_score CHECK (score >= 0)
);

CREATE TABLE signalements (
    id             uuid NOT NULL,
    titre          character varying(200) NOT NULL,
    description    text NOT NULL,
    date_creation  timestamp with time zone NOT NULL,
    departement_id uuid,
    etudiant_id    uuid NOT NULL,
    enseignant_id  uuid NOT NULL,
    CONSTRAINT pk_signalements PRIMARY KEY (id)
);

CREATE TABLE auto_evaluations (
    id                uuid NOT NULL,
    date_soumission   timestamp with time zone NOT NULL,
    date_creation     timestamp with time zone NOT NULL,
    date_modification timestamp with time zone NOT NULL,
    semestre_id       uuid NOT NULL,
    enseignant_id     uuid NOT NULL,
    CONSTRAINT pk_auto_evaluations PRIMARY KEY (id),
    CONSTRAINT uq_auto_evaluations_enseignant_id_semestre_id UNIQUE (enseignant_id, semestre_id)
);

CREATE TABLE reponses_auto_evaluation (
    id                 uuid NOT NULL,
    score              smallint NOT NULL,
    auto_evaluation_id uuid CONSTRAINT evaluations_teacher_self_assessment_resp_assessment_id_not_null NOT NULL,
    critere_id         uuid CONSTRAINT evaluations_teacher_self_assessment_respon_criteria_id_not_null NOT NULL,
    CONSTRAINT pk_reponses_auto_evaluation PRIMARY KEY (id),
    CONSTRAINT uq_reponses_auto_evaluation_auto_evaluation_id_critere_id UNIQUE (auto_evaluation_id, critere_id),
    CONSTRAINT ck_reponses_auto_evaluation_score CHECK (score >= 0)
);

CREATE TABLE presences (
    id                uuid NOT NULL,
    heure_prevue      timestamp with time zone NOT NULL,
    heure_reelle      timestamp with time zone,
    statut            character varying(20) NOT NULL,
    minutes_retard    integer NOT NULL,
    justification     text,
    est_justifiee     boolean NOT NULL,
    date_creation     timestamp with time zone NOT NULL,
    date_modification timestamp with time zone NOT NULL,
    enseignant_id     uuid NOT NULL,
    cours_id          uuid NOT NULL,
    CONSTRAINT pk_presences PRIMARY KEY (id),
    CONSTRAINT ck_presences_minutes_retard CHECK (minutes_retard >= 0)
);

CREATE TABLE alertes_presence (
    id              uuid NOT NULL,
    type_alerte     character varying(30) NOT NULL,
    statut          character varying(20) NOT NULL,
    periode         character varying(10) NOT NULL,
    nombre          integer NOT NULL,
    message         text,
    date_creation   timestamp with time zone NOT NULL,
    date_resolution timestamp with time zone,
    enseignant_id   uuid NOT NULL,
    CONSTRAINT pk_alertes_presence PRIMARY KEY (id),
    CONSTRAINT ck_alertes_presence_nombre CHECK (nombre >= 0)
);

CREATE TABLE notifications (
    id                     uuid NOT NULL,
    type_notification      character varying(30) NOT NULL,
    canal                  character varying(20) NOT NULL,
    statut                 character varying(20) NOT NULL,
    titre                  character varying(200) NOT NULL,
    message                text NOT NULL,
    ressource_liee         character varying(100),
    id_ressource_liee      character varying(100),
    date_envoi             timestamp with time zone,
    date_lecture           timestamp with time zone,
    date_creation          timestamp with time zone NOT NULL,
    destinataire_id        uuid NOT NULL,
    donnees                jsonb NOT NULL,
    email_destinataire     character varying(254),
    telephone_destinataire character varying(30),
    CONSTRAINT pk_notifications PRIMARY KEY (id)
);

CREATE TABLE demandes_rapport (
    id             uuid NOT NULL,
    type_rapport   character varying(30) NOT NULL,
    format         character varying(10) NOT NULL,
    statut         character varying(20) NOT NULL,
    parametres     jsonb NOT NULL,
    erreur         text,
    date_creation  timestamp with time zone NOT NULL,
    date_fin       timestamp with time zone,
    demande_par_id uuid NOT NULL,
    CONSTRAINT pk_demandes_rapport PRIMARY KEY (id)
);

CREATE TABLE journal_audit (
    id                uuid NOT NULL,
    action            character varying(20) NOT NULL,
    ressource         character varying(100) NOT NULL,
    id_ressource      character varying(100),
    detail            text,
    adresse_ip        inet,
    agent_utilisateur text,
    horodatage        timestamp with time zone NOT NULL,
    utilisateur_id    uuid,
    CONSTRAINT pk_journal_audit PRIMARY KEY (id)
);

CREATE TABLE config_classification (
    id                 bigint NOT NULL,
    seuil_exceptionnel numeric(5,2) NOT NULL,
    seuil_progression  numeric(5,2) NOT NULL,
    date_modification  timestamp with time zone NOT NULL,
    CONSTRAINT pk_config_classification PRIMARY KEY (id)
);

CREATE TABLE resultats_clustering (
    id          uuid NOT NULL,
    semestre_id uuid,
    k           smallint NOT NULL,
    clusters    jsonb NOT NULL,
    date_calcul timestamp with time zone NOT NULL,
    CONSTRAINT pk_resultats_clustering PRIMARY KEY (id),
    CONSTRAINT ck_resultats_clustering_k CHECK (k >= 0)
);

CREATE TABLE resultats_detection_biais (
    id          uuid NOT NULL,
    semestre_id uuid,
    resultats   jsonb NOT NULL,
    date_calcul timestamp with time zone NOT NULL,
    CONSTRAINT pk_resultats_detection_biais PRIMARY KEY (id)
);

CREATE TABLE resultats_biais_evaluateur (
    id          uuid NOT NULL,
    semestre_id uuid,
    resultats   jsonb NOT NULL,
    date_calcul timestamp with time zone NOT NULL,
    CONSTRAINT pk_resultats_biais_evaluateur PRIMARY KEY (id)
);

CREATE TABLE config_biais_evaluateur (
    id                   bigint NOT NULL,
    normalisation_active boolean NOT NULL,
    date_modification    timestamp with time zone NOT NULL,
    CONSTRAINT pk_config_biais_evaluateur PRIMARY KEY (id)
);

CREATE TABLE formations (
    id            uuid NOT NULL,
    titre         character varying(200) NOT NULL,
    description   text,
    categorie     character varying(20) NOT NULL,
    fournisseur   character varying(20) NOT NULL,
    url           character varying(200),
    est_actif     boolean NOT NULL,
    date_creation timestamp with time zone NOT NULL,
    CONSTRAINT pk_formations PRIMARY KEY (id)
);

CREATE TABLE predictions_score (
    id                uuid NOT NULL,
    score_predit      numeric(5,2),
    pente             numeric(8,4),
    coefficient_r2    numeric(5,4),
    nb_points_donnees smallint NOT NULL,
    details           jsonb NOT NULL,
    date_calcul       timestamp with time zone NOT NULL,
    enseignant_id     uuid NOT NULL,
    CONSTRAINT pk_predictions_score PRIMARY KEY (id),
    CONSTRAINT ck_predictions_score_nb_points_donnees CHECK (nb_points_donnees >= 0)
);

-- ------------------------------------------------------------
-- 2. Clés étrangères
-- ------------------------------------------------------------

ALTER TABLE utilisateurs
    ADD CONSTRAINT fk_utilisateurs_profil_etudiant_id FOREIGN KEY (profil_etudiant_id)
    REFERENCES etudiants (id);

ALTER TABLE utilisateurs
    ADD CONSTRAINT fk_utilisateurs_profil_enseignant_id FOREIGN KEY (profil_enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE enseignants
    ADD CONSTRAINT fk_enseignants_departement_id FOREIGN KEY (departement_id)
    REFERENCES departements (id);

ALTER TABLE enseignants
    ADD CONSTRAINT fk_enseignants_grade_id FOREIGN KEY (grade_id)
    REFERENCES grades (id);

ALTER TABLE etudiants
    ADD CONSTRAINT fk_etudiants_departement_id FOREIGN KEY (departement_id)
    REFERENCES departements (id);

ALTER TABLE cours
    ADD CONSTRAINT fk_cours_departement_id FOREIGN KEY (departement_id)
    REFERENCES departements (id);

ALTER TABLE cours
    ADD CONSTRAINT fk_cours_grade_id FOREIGN KEY (grade_id)
    REFERENCES grades (id);

ALTER TABLE cours
    ADD CONSTRAINT fk_cours_semestre_id FOREIGN KEY (semestre_id)
    REFERENCES semestres (id);

ALTER TABLE cours
    ADD CONSTRAINT fk_cours_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE cours_enseignants_secondaires
    ADD CONSTRAINT fk_cours_enseignants_secondaires_cours_id FOREIGN KEY (cours_id)
    REFERENCES cours (id);

ALTER TABLE cours_enseignants_secondaires
    ADD CONSTRAINT fk_cours_enseignants_secondaires_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE inscriptions
    ADD CONSTRAINT fk_inscriptions_cours_id FOREIGN KEY (cours_id)
    REFERENCES cours (id);

ALTER TABLE inscriptions
    ADD CONSTRAINT fk_inscriptions_semestre_id FOREIGN KEY (semestre_id)
    REFERENCES semestres (id);

ALTER TABLE inscriptions
    ADD CONSTRAINT fk_inscriptions_etudiant_id FOREIGN KEY (etudiant_id)
    REFERENCES etudiants (id);

ALTER TABLE lots_import
    ADD CONSTRAINT fk_lots_import_cree_par_id FOREIGN KEY (cree_par_id)
    REFERENCES utilisateurs (id);

ALTER TABLE campagnes
    ADD CONSTRAINT fk_campagnes_cree_par_id FOREIGN KEY (cree_par_id)
    REFERENCES utilisateurs (id);

ALTER TABLE campagnes
    ADD CONSTRAINT fk_campagnes_semestre_id FOREIGN KEY (semestre_id)
    REFERENCES semestres (id);

ALTER TABLE ponderations
    ADD CONSTRAINT fk_ponderations_campagne_id FOREIGN KEY (campagne_id)
    REFERENCES campagnes (id);

ALTER TABLE ponderations
    ADD CONSTRAINT fk_ponderations_critere_id FOREIGN KEY (critere_id)
    REFERENCES criteres (id);

ALTER TABLE evaluations
    ADD CONSTRAINT fk_evaluations_campagne_id FOREIGN KEY (campagne_id)
    REFERENCES campagnes (id);

ALTER TABLE evaluations
    ADD CONSTRAINT fk_evaluations_cours_id FOREIGN KEY (cours_id)
    REFERENCES cours (id);

ALTER TABLE evaluations
    ADD CONSTRAINT fk_evaluations_etudiant_id FOREIGN KEY (etudiant_id)
    REFERENCES utilisateurs (id);

ALTER TABLE evaluations
    ADD CONSTRAINT fk_evaluations_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE reponses
    ADD CONSTRAINT fk_reponses_critere_id FOREIGN KEY (critere_id)
    REFERENCES criteres (id);

ALTER TABLE reponses
    ADD CONSTRAINT fk_reponses_evaluation_id FOREIGN KEY (evaluation_id)
    REFERENCES evaluations (id);

ALTER TABLE signalements
    ADD CONSTRAINT fk_signalements_departement_id FOREIGN KEY (departement_id)
    REFERENCES departements (id);

ALTER TABLE signalements
    ADD CONSTRAINT fk_signalements_etudiant_id FOREIGN KEY (etudiant_id)
    REFERENCES utilisateurs (id);

ALTER TABLE signalements
    ADD CONSTRAINT fk_signalements_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE auto_evaluations
    ADD CONSTRAINT fk_auto_evaluations_semestre_id FOREIGN KEY (semestre_id)
    REFERENCES semestres (id);

ALTER TABLE auto_evaluations
    ADD CONSTRAINT fk_auto_evaluations_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE reponses_auto_evaluation
    ADD CONSTRAINT fk_reponses_auto_evaluation_auto_evaluation_id FOREIGN KEY (auto_evaluation_id)
    REFERENCES auto_evaluations (id);

ALTER TABLE reponses_auto_evaluation
    ADD CONSTRAINT fk_reponses_auto_evaluation_critere_id FOREIGN KEY (critere_id)
    REFERENCES criteres (id);

ALTER TABLE presences
    ADD CONSTRAINT fk_presences_cours_id FOREIGN KEY (cours_id)
    REFERENCES cours (id);

ALTER TABLE presences
    ADD CONSTRAINT fk_presences_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE alertes_presence
    ADD CONSTRAINT fk_alertes_presence_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

ALTER TABLE notifications
    ADD CONSTRAINT fk_notifications_destinataire_id FOREIGN KEY (destinataire_id)
    REFERENCES utilisateurs (id);

ALTER TABLE demandes_rapport
    ADD CONSTRAINT fk_demandes_rapport_demande_par_id FOREIGN KEY (demande_par_id)
    REFERENCES utilisateurs (id);

ALTER TABLE journal_audit
    ADD CONSTRAINT fk_journal_audit_utilisateur_id FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs (id);

ALTER TABLE predictions_score
    ADD CONSTRAINT fk_predictions_score_enseignant_id FOREIGN KEY (enseignant_id)
    REFERENCES enseignants (id);

-- ------------------------------------------------------------
-- 3. Index
-- ------------------------------------------------------------

CREATE INDEX idx_predictions_score_enseignant_id_date_calcul ON predictions_score (enseignant_id, date_calcul);
CREATE INDEX idx_predictions_score_enseignant_id ON predictions_score (enseignant_id);
CREATE INDEX idx_presences_cours_id ON presences (cours_id);
CREATE INDEX idx_alertes_presence_periode ON alertes_presence (periode);
CREATE INDEX idx_presences_heure_prevue ON presences (heure_prevue);
CREATE INDEX idx_presences_statut ON presences (statut);
CREATE INDEX idx_alertes_presence_statut ON alertes_presence (statut);
CREATE INDEX idx_presences_enseignant_id ON presences (enseignant_id);
CREATE INDEX idx_alertes_presence_enseignant_id ON alertes_presence (enseignant_id);
CREATE INDEX idx_journal_audit_action ON journal_audit (action);
CREATE INDEX idx_journal_audit_ressource ON journal_audit (ressource);
CREATE INDEX idx_journal_audit_horodatage ON journal_audit (horodatage);
CREATE INDEX idx_journal_audit_utilisateur_id ON journal_audit (utilisateur_id);
CREATE INDEX idx_campagnes_est_supprimee ON campagnes (est_supprimee);
CREATE INDEX idx_campagnes_semestre_id ON campagnes (semestre_id);
CREATE INDEX idx_campagnes_date_debut_date_fin ON campagnes (date_debut, date_fin);
CREATE INDEX idx_campagnes_statut ON campagnes (statut);
CREATE INDEX idx_campagnes_cree_par_id ON campagnes (cree_par_id);
CREATE INDEX idx_evaluations_campagne_id ON evaluations (campagne_id);
CREATE INDEX idx_ponderations_campagne_id ON ponderations (campagne_id);
CREATE INDEX idx_ponderations_critere_id ON ponderations (critere_id);
CREATE INDEX idx_criteres_categorie ON criteres (categorie);
CREATE INDEX idx_evaluations_cours_id ON evaluations (cours_id);
CREATE INDEX idx_reponses_critere_id ON reponses (critere_id);
CREATE INDEX idx_criteres_est_actif ON criteres (est_actif);
CREATE INDEX idx_reponses_evaluation_id ON reponses (evaluation_id);
CREATE INDEX idx_evaluations_statut ON evaluations (statut);
CREATE INDEX idx_evaluations_etudiant_id ON evaluations (etudiant_id);
CREATE INDEX idx_signalements_etudiant_id ON signalements (etudiant_id);
CREATE INDEX idx_evaluations_enseignant_id ON evaluations (enseignant_id);
CREATE INDEX idx_signalements_enseignant_id ON signalements (enseignant_id);
CREATE INDEX idx_signalements_departement_id ON signalements (departement_id);
CREATE INDEX idx_reponses_auto_evaluation_auto_evaluation_id ON reponses_auto_evaluation (auto_evaluation_id);
CREATE INDEX idx_reponses_auto_evaluation_critere_id ON reponses_auto_evaluation (critere_id);
CREATE INDEX idx_auto_evaluations_semestre_id ON auto_evaluations (semestre_id);
CREATE INDEX idx_auto_evaluations_enseignant_id ON auto_evaluations (enseignant_id);
CREATE INDEX idx_notifications_canal ON notifications (canal);
CREATE INDEX idx_notifications_type_notification ON notifications (type_notification);
CREATE INDEX idx_notifications_destinataire_id ON notifications (destinataire_id);
CREATE INDEX idx_notifications_statut ON notifications (statut);
CREATE INDEX idx_demandes_rapport_demande_par_id ON demandes_rapport (demande_par_id);
CREATE INDEX idx_cours_code ON cours (code);
CREATE INDEX idx_cours_departement_id ON cours (departement_id);
CREATE INDEX idx_cours_semestre_id ON cours (semestre_id);
CREATE INDEX idx_cours_enseignant_id ON cours (enseignant_id);
CREATE INDEX idx_cours_identifiant_universite ON cours (identifiant_universite);
CREATE INDEX idx_cours_grade_id ON cours (grade_id);
CREATE INDEX idx_cours_enseignants_secondaires_cours_id ON cours_enseignants_secondaires (cours_id);
CREATE INDEX idx_cours_enseignants_secondaires_enseignant_id ON cours_enseignants_secondaires (enseignant_id);
CREATE INDEX idx_lots_import_cree_par_id ON lots_import (cree_par_id);
CREATE INDEX idx_inscriptions_cours_id ON inscriptions (cours_id);
CREATE INDEX idx_etudiants_email ON etudiants (email);
CREATE INDEX idx_etudiants_niveau_cohorte ON etudiants (niveau, cohorte);
CREATE INDEX idx_inscriptions_semestre_id ON inscriptions (semestre_id);
CREATE INDEX idx_etudiants_code_etudiant ON etudiants (code_etudiant);
CREATE INDEX idx_inscriptions_etudiant_id ON inscriptions (etudiant_id);
CREATE INDEX idx_etudiants_identifiant_universite ON etudiants (identifiant_universite);
CREATE INDEX idx_etudiants_departement_id ON etudiants (departement_id);
CREATE INDEX idx_enseignants_email ON enseignants (email);
CREATE INDEX idx_enseignants_matricule ON enseignants (matricule);
CREATE INDEX idx_enseignants_identifiant_universite ON enseignants (identifiant_universite);
CREATE INDEX idx_enseignants_departement_id ON enseignants (departement_id);
CREATE INDEX idx_enseignants_grade_id ON enseignants (grade_id);
