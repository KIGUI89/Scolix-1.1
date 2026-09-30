-- Extrait 2 : création des tables des évaluations et des réponses

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
