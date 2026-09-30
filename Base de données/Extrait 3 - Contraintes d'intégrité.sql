-- Extrait 3 : clés étrangères de la table des évaluations

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
