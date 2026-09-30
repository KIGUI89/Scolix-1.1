-- Extrait 1 : création des tables des utilisateurs et des campagnes

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
