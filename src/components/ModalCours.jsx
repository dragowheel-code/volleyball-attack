import { useState } from "react";

import { supabase } from "../lib/supabaseClient";

const JOURS = [
  {
    valeur: 1,
    nom: "Lundi",
  },
  {
    valeur: 2,
    nom: "Mardi",
  },
  {
    valeur: 3,
    nom: "Mercredi",
  },
  {
    valeur: 4,
    nom: "Jeudi",
  },
  {
    valeur: 5,
    nom: "Vendredi",
  },
  {
    valeur: 6,
    nom: "Samedi",
  },
  {
    valeur: 7,
    nom: "Dimanche",
  },
];

function creerHoraire() {
  return {
    jour_semaine: 1,
    heure_debut: "",
    heure_fin: "",
    gymnase_id: "",
  };
}

function creerGroupe(numero = 1) {
  return {
    nom: `Groupe ${numero}`,
    capacite: "",
    actif: true,
    horaires: [creerHoraire()],
  };
}

function ModalCours({
  cours,
  saisons,
  gymnases,
  anneesScolaires,
  niveauxVolleyball,
  onFermer,
  onEnregistre,
}) {
  const saisonActive =
    saisons.find(
      (saison) => saison.active
    );

  const [
    enregistrementEnCours,
    setEnregistrementEnCours,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [formulaire, setFormulaire] =
    useState(() => ({
      saison_id:
        cours?.saison_id ??
        saisonActive?.id ??
        saisons[0]?.id ??
        "",

      nom: cours?.nom ?? "",

      description:
        cours?.description ?? "",

      prix:
        cours?.prix?.toString() ?? "",

      sexe_admissible:
        cours?.sexe_admissible ??
        "tous",

      demander_niveau_volleyball:
        cours?.demander_niveau_volleyball ??
        false,

      autoriser_cumul_saison:
        cours?.autoriser_cumul_saison ??
        false,

      type_acces:
        cours?.type_acces ??
        "public",

      code_acces: "",

      inscriptions_ouvertes:
        cours?.inscriptions_ouvertes ??
        true,

      actif:
        cours?.actif ?? true,

      annees_scolaires:
        cours?.annees_scolaires ??
        [],

      niveaux_volleyball:
        cours?.niveaux_volleyball ??
        [],

      groupes:
        cours?.groupes?.length
          ? cours.groupes
          : [creerGroupe(1)],
    }));

  // =========================================================
  // CHAMPS DE BASE
  // =========================================================

  function modifierChamp(
    nom,
    valeur
  ) {
    setFormulaire((ancien) => ({
      ...ancien,
      [nom]: valeur,
    }));
  }

  // =========================================================
  // ANNÉES SCOLAIRES
  // =========================================================

  function anneeEstSelectionnee(id) {
    return formulaire.annees_scolaires.some(
      (element) =>
        (element.annee_scolaire_id ??
          element.id) === id
    );
  }

  function obtenirTypeAnnee(id) {
    return (
      formulaire.annees_scolaires.find(
        (element) =>
          (element.annee_scolaire_id ??
            element.id) === id
      )?.type ?? "reguliere"
    );
  }

  function basculerAnnee(id) {
    setFormulaire((ancien) => {
      const existe =
        ancien.annees_scolaires.some(
          (element) =>
            (element.annee_scolaire_id ??
              element.id) === id
        );

      return {
        ...ancien,

        annees_scolaires: existe
          ? ancien.annees_scolaires.filter(
              (element) =>
                (element.annee_scolaire_id ??
                  element.id) !== id
            )
          : [
              ...ancien.annees_scolaires,
              {
                id,
                type: "reguliere",
              },
            ],
      };
    });
  }

  function modifierTypeAnnee(
    id,
    type
  ) {
    setFormulaire((ancien) => ({
      ...ancien,

      annees_scolaires:
        ancien.annees_scolaires.map(
          (element) => {
            const elementId =
              element.annee_scolaire_id ??
              element.id;

            if (elementId !== id) {
              return element;
            }

            return {
              id,
              type,
            };
          }
        ),
    }));
  }

  // =========================================================
  // NIVEAUX
  // =========================================================

  function basculerNiveau(id) {
    setFormulaire((ancien) => {
      const existe =
        ancien.niveaux_volleyball.includes(
          id
        );

      return {
        ...ancien,

        niveaux_volleyball: existe
          ? ancien.niveaux_volleyball.filter(
              (elementId) =>
                elementId !== id
            )
          : [
              ...ancien.niveaux_volleyball,
              id,
            ],
      };
    });
  }

  // =========================================================
  // GROUPES
  // =========================================================

  function ajouterGroupe() {
    setFormulaire((ancien) => ({
      ...ancien,

      groupes: [
        ...ancien.groupes,
        creerGroupe(
          ancien.groupes.length + 1
        ),
      ],
    }));
  }

  function supprimerGroupe(index) {
    if (
      formulaire.groupes.length <= 1
    ) {
      return;
    }

    setFormulaire((ancien) => ({
      ...ancien,

      groupes: ancien.groupes.filter(
        (_, position) =>
          position !== index
      ),
    }));
  }

  function modifierGroupe(
    index,
    champ,
    valeur
  ) {
    setFormulaire((ancien) => ({
      ...ancien,

      groupes: ancien.groupes.map(
        (groupe, position) =>
          position === index
            ? {
                ...groupe,
                [champ]: valeur,
              }
            : groupe
      ),
    }));
  }

  // =========================================================
  // HORAIRES
  // =========================================================

  function ajouterHoraire(indexGroupe) {
    setFormulaire((ancien) => ({
      ...ancien,

      groupes: ancien.groupes.map(
        (groupe, position) =>
          position === indexGroupe
            ? {
                ...groupe,

                horaires: [
                  ...groupe.horaires,
                  creerHoraire(),
                ],
              }
            : groupe
      ),
    }));
  }

  function supprimerHoraire(
    indexGroupe,
    indexHoraire
  ) {
    const groupe =
      formulaire.groupes[
        indexGroupe
      ];

    if (
      groupe.horaires.length <= 1
    ) {
      return;
    }

    setFormulaire((ancien) => ({
      ...ancien,

      groupes: ancien.groupes.map(
        (element, position) =>
          position === indexGroupe
            ? {
                ...element,

                horaires:
                  element.horaires.filter(
                    (_, index) =>
                      index !==
                      indexHoraire
                  ),
              }
            : element
      ),
    }));
  }

  function modifierHoraire(
    indexGroupe,
    indexHoraire,
    champ,
    valeur
  ) {
    setFormulaire((ancien) => ({
      ...ancien,

      groupes: ancien.groupes.map(
        (groupe, positionGroupe) =>
          positionGroupe ===
          indexGroupe
            ? {
                ...groupe,

                horaires:
                  groupe.horaires.map(
                    (
                      horaire,
                      positionHoraire
                    ) =>
                      positionHoraire ===
                      indexHoraire
                        ? {
                            ...horaire,
                            [champ]:
                              valeur,
                          }
                        : horaire
                  ),
              }
            : groupe
      ),
    }));
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  function validerFormulaire() {
    if (!formulaire.saison_id) {
      return "La saison est obligatoire.";
    }

    if (!formulaire.nom.trim()) {
      return "Le nom du cours est obligatoire.";
    }

    if (
      formulaire.prix === "" ||
      Number(formulaire.prix) < 0
    ) {
      return "Le prix est invalide.";
    }

    if (
      formulaire.type_acces ===
        "code" &&
      !cours &&
      !formulaire.code_acces.trim()
    ) {
      return "Le code d'accès est obligatoire.";
    }

    if (
      formulaire.annees_scolaires
        .length === 0
    ) {
      return "Sélectionnez au moins une année scolaire.";
    }

    if (
      formulaire
        .demander_niveau_volleyball &&
      formulaire.niveaux_volleyball
        .length === 0
    ) {
      return "Sélectionnez au moins un niveau de volleyball.";
    }

    for (
      let i = 0;
      i < formulaire.groupes.length;
      i += 1
    ) {
      const groupe =
        formulaire.groupes[i];

      if (!groupe.nom.trim()) {
        return `Le nom du groupe ${
          i + 1
        } est obligatoire.`;
      }

      if (
        !groupe.capacite ||
        Number(groupe.capacite) <= 0
      ) {
        return `La capacité du groupe ${
          i + 1
        } est invalide.`;
      }

      for (
        let j = 0;
        j < groupe.horaires.length;
        j += 1
      ) {
        const horaire =
          groupe.horaires[j];

        if (
          !horaire.heure_debut ||
          !horaire.heure_fin ||
          !horaire.gymnase_id
        ) {
          return `L'horaire ${
            j + 1
          } du groupe ${
            i + 1
          } est incomplet.`;
        }

        if (
          horaire.heure_fin <=
          horaire.heure_debut
        ) {
          return `L'heure de fin doit être après l'heure de début dans le groupe ${
            i + 1
          }.`;
        }
      }
    }

    return null;
  }

  // =========================================================
  // ENREGISTRER
  // =========================================================

  async function enregistrer(e) {
    e.preventDefault();

    setMessage("");

    const erreur =
      validerFormulaire();

    if (erreur) {
      setMessage(erreur);
      return;
    }

    setEnregistrementEnCours(true);

    const annees =
      formulaire.annees_scolaires.map(
        (element) => ({
          id:
            element.annee_scolaire_id ??
            element.id,

          type:
            element.type ??
            "reguliere",
        })
      );

    const groupes =
      formulaire.groupes.map(
        (groupe, indexGroupe) => ({
          id: groupe.id ?? null,

          nom: groupe.nom.trim(),

          capacite: Number(
            groupe.capacite
          ),

          ordre: indexGroupe + 1,

          actif:
            groupe.actif ?? true,

          horaires:
            groupe.horaires.map(
              (
                horaire,
                indexHoraire
              ) => ({
                jour_semaine:
                  Number(
                    horaire.jour_semaine
                  ),

                heure_debut:
                  horaire.heure_debut,

                heure_fin:
                  horaire.heure_fin,

                gymnase_id:
                  horaire.gymnase_id,

                ordre:
                  indexHoraire + 1,
              })
            ),
        })
      );

    const { error } =
      await supabase.rpc(
        "enregistrer_cours_admin",
        {
          p_cours_id:
            cours?.id ?? null,

          p_saison_id:
            formulaire.saison_id,

          p_nom:
            formulaire.nom.trim(),

          p_description:
            formulaire.description.trim() ||
            null,

          p_prix:
            Number(formulaire.prix),

          p_sexe_admissible:
            formulaire.sexe_admissible,

          p_demander_niveau_volleyball:
            formulaire
              .demander_niveau_volleyball,

          p_autoriser_cumul_saison:
            formulaire
              .autoriser_cumul_saison,

          p_type_acces:
            formulaire.type_acces,

          p_code_acces:
            formulaire.code_acces.trim() ||
            null,

          p_inscriptions_ouvertes:
            formulaire
              .inscriptions_ouvertes,

          p_actif:
            formulaire.actif,

          p_annees_scolaires:
            annees,

          p_niveaux_volleyball:
            formulaire
              .niveaux_volleyball,

          p_groupes:
            groupes,
        }
      );

    setEnregistrementEnCours(false);

    if (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible d'enregistrer le cours."
      );

      return;
    }

    await onEnregistre();
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <div
      className="cours-fond-modal"
      onMouseDown={() => {
        if (!enregistrementEnCours) {
          onFermer();
        }
      }}
    >
      <section
        className="cours-modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="cours-modal-entete">
          <div>
            <h2>
              {cours
                ? "Modifier le cours"
                : "Nouveau cours"}
            </h2>

            <p>
              Informations, admissibilité,
              groupes et horaires.
            </p>
          </div>

          <button
            type="button"
            className="cours-modal-fermer"
            onClick={onFermer}
            disabled={
              enregistrementEnCours
            }
          >
            ×
          </button>
        </div>

        <form
          onSubmit={enregistrer}
          className="cours-formulaire"
        >
          {/* ============================= */}
          {/* INFORMATIONS */}
          {/* ============================= */}

          <section className="cours-section">
            <h3>
              Informations générales
            </h3>

            <div className="cours-grille-2">
              <div className="cours-champ">
                <label>Saison</label>

                <select
                  value={
                    formulaire.saison_id
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "saison_id",
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Sélectionner
                  </option>

                  {saisons.map(
                    (saison) => (
                      <option
                        key={saison.id}
                        value={saison.id}
                      >
                        {saison.nom}
                        {saison.active
                          ? " — Active"
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="cours-champ">
                <label>
                  Nom du cours
                </label>

                <input
                  type="text"
                  value={formulaire.nom}
                  onChange={(e) =>
                    modifierChamp(
                      "nom",
                      e.target.value
                    )
                  }
                  required
                />
              </div>
            </div>

            <div className="cours-champ">
              <label>Description</label>

              <textarea
                rows="3"
                value={
                  formulaire.description
                }
                onChange={(e) =>
                  modifierChamp(
                    "description",
                    e.target.value
                  )
                }
              />
            </div>

            <div className="cours-grille-3">
              <div className="cours-champ">
                <label>Prix</label>

                <div className="cours-prix-champ">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      formulaire.prix
                    }
                    onChange={(e) =>
                      modifierChamp(
                        "prix",
                        e.target.value
                      )
                    }
                    required
                  />

                  <span>$</span>
                </div>
              </div>

              <div className="cours-champ">
                <label>
                  Sexe admissible
                </label>

                <select
                  value={
                    formulaire
                      .sexe_admissible
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "sexe_admissible",
                      e.target.value
                    )
                  }
                >
                  <option value="tous">
                    Tous
                  </option>

                  <option value="fille">
                    Filles
                  </option>

                  <option value="garcon">
                    Garçons
                  </option>
                </select>
              </div>

              <div className="cours-champ">
                <label>
                  Type d'accès
                </label>

                <select
                  value={
                    formulaire.type_acces
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "type_acces",
                      e.target.value
                    )
                  }
                >
                  <option value="public">
                    Public
                  </option>

                  <option value="code">
                    Code d'accès
                  </option>
                </select>
              </div>
            </div>

            {formulaire.type_acces ===
              "code" && (
              <div className="cours-champ">
                <label>
                  Code d'accès
                </label>

                <input
                  type="text"
                  value={
                    formulaire.code_acces
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "code_acces",
                      e.target.value
                    )
                  }
                  placeholder={
                    cours
                      ? "Laisser vide pour conserver le code actuel"
                      : "Entrer le code d'accès"
                  }
                />
              </div>
            )}

            <div className="cours-options">
              <label>
                <input
                  type="checkbox"
                  checked={
                    formulaire
                      .inscriptions_ouvertes
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "inscriptions_ouvertes",
                      e.target.checked
                    )
                  }
                />

                Inscriptions ouvertes
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    formulaire.actif
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "actif",
                      e.target.checked
                    )
                  }
                />

                Cours actif
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={
                    formulaire
                      .autoriser_cumul_saison
                  }
                  onChange={(e) =>
                    modifierChamp(
                      "autoriser_cumul_saison",
                      e.target.checked
                    )
                  }
                />

                Autoriser plusieurs cours
                durant la saison
              </label>
            </div>
          </section>

          {/* ============================= */}
          {/* ANNÉES SCOLAIRES */}
          {/* ============================= */}

          <section className="cours-section">
            <h3>
              Années scolaires admissibles
            </h3>

            <div className="cours-admissibilites">
              {anneesScolaires
                .filter(
                  (annee) =>
                    annee.actif
                )
                .map((annee) => {
                  const selectionnee =
                    anneeEstSelectionnee(
                      annee.id
                    );

                  return (
                    <div
                      key={annee.id}
                      className={
                        selectionnee
                          ? "cours-admissibilite selectionnee"
                          : "cours-admissibilite"
                      }
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={
                            selectionnee
                          }
                          onChange={() =>
                            basculerAnnee(
                              annee.id
                            )
                          }
                        />

                        <strong>
                          {annee.nom}
                        </strong>
                      </label>

                      {selectionnee && (
                        <select
                          value={obtenirTypeAnnee(
                            annee.id
                          )}
                          onChange={(e) =>
                            modifierTypeAnnee(
                              annee.id,
                              e.target.value
                            )
                          }
                        >
                          <option value="reguliere">
                            Régulière
                          </option>

                          <option value="conditionnelle">
                            Conditionnelle
                          </option>
                        </select>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          {/* ============================= */}
          {/* NIVEAUX */}
          {/* ============================= */}

          <section className="cours-section">
            <label className="cours-option-principale">
              <input
                type="checkbox"
                checked={
                  formulaire
                    .demander_niveau_volleyball
                }
                onChange={(e) =>
                  modifierChamp(
                    "demander_niveau_volleyball",
                    e.target.checked
                  )
                }
              />

              Demander le niveau de
              volleyball
            </label>

            {formulaire
              .demander_niveau_volleyball && (
              <div className="cours-niveaux">
                {niveauxVolleyball
                  .filter(
                    (niveau) =>
                      niveau.actif
                  )
                  .map((niveau) => (
                    <label
                      key={niveau.id}
                    >
                      <input
                        type="checkbox"
                        checked={formulaire.niveaux_volleyball.includes(
                          niveau.id
                        )}
                        onChange={() =>
                          basculerNiveau(
                            niveau.id
                          )
                        }
                      />

                      {niveau.nom}
                    </label>
                  ))}
              </div>
            )}
          </section>

          {/* ============================= */}
          {/* GROUPES */}
          {/* ============================= */}

          <section className="cours-section">
            <div className="cours-section-entete">
              <div>
                <h3>Groupes</h3>

                <p>
                  Un cours doit contenir au
                  moins un groupe.
                </p>
              </div>

              <button
                type="button"
                className="cours-petit-bouton"
                onClick={ajouterGroupe}
              >
                + Groupe
              </button>
            </div>

            <div className="cours-groupes">
              {formulaire.groupes.map(
                (
                  groupe,
                  indexGroupe
                ) => (
                  <div
                    key={
                      groupe.id ??
                      indexGroupe
                    }
                    className="cours-groupe"
                  >
                    <div className="cours-groupe-entete">
                      <strong>
                        Groupe{" "}
                        {indexGroupe + 1}
                      </strong>

                      <button
                        type="button"
                        className="cours-bouton-supprimer"
                        disabled={
                          formulaire.groupes
                            .length <= 1
                        }
                        onClick={() =>
                          supprimerGroupe(
                            indexGroupe
                          )
                        }
                      >
                        −
                      </button>
                    </div>

                    <div className="cours-grille-2">
                      <div className="cours-champ">
                        <label>
                          Nom du groupe
                        </label>

                        <input
                          type="text"
                          value={
                            groupe.nom
                          }
                          onChange={(e) =>
                            modifierGroupe(
                              indexGroupe,
                              "nom",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                      <div className="cours-champ">
                        <label>
                          Capacité
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={
                            groupe.capacite
                          }
                          onChange={(e) =>
                            modifierGroupe(
                              indexGroupe,
                              "capacite",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="cours-horaires-entete">
                      <strong>
                        Horaire du groupe
                      </strong>

                      <button
                        type="button"
                        className="cours-petit-bouton"
                        onClick={() =>
                          ajouterHoraire(
                            indexGroupe
                          )
                        }
                      >
                        + Horaire
                      </button>
                    </div>

                    <div className="cours-horaires">
                      {groupe.horaires.map(
                        (
                          horaire,
                          indexHoraire
                        ) => (
                          <div
                            key={
                              horaire.id ??
                              indexHoraire
                            }
                            className="cours-horaire"
                          >
                            <div className="cours-champ">
                              <label>
                                Jour
                              </label>

                              <select
                                value={
                                  horaire.jour_semaine
                                }
                                onChange={(
                                  e
                                ) =>
                                  modifierHoraire(
                                    indexGroupe,
                                    indexHoraire,
                                    "jour_semaine",
                                    Number(
                                      e
                                        .target
                                        .value
                                    )
                                  )
                                }
                              >
                                {JOURS.map(
                                  (
                                    jour
                                  ) => (
                                    <option
                                      key={
                                        jour.valeur
                                      }
                                      value={
                                        jour.valeur
                                      }
                                    >
                                      {
                                        jour.nom
                                      }
                                    </option>
                                  )
                                )}
                              </select>
                            </div>

                            <div className="cours-champ">
                              <label>
                                Début
                              </label>

                              <input
                                type="time"
                                value={
                                  horaire.heure_debut
                                }
                                onChange={(
                                  e
                                ) =>
                                  modifierHoraire(
                                    indexGroupe,
                                    indexHoraire,
                                    "heure_debut",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </div>

                            <div className="cours-champ">
                              <label>
                                Fin
                              </label>

                              <input
                                type="time"
                                value={
                                  horaire.heure_fin
                                }
                                onChange={(
                                  e
                                ) =>
                                  modifierHoraire(
                                    indexGroupe,
                                    indexHoraire,
                                    "heure_fin",
                                    e.target
                                      .value
                                  )
                                }
                              />
                            </div>

                            <div className="cours-champ">
                              <label>
                                Gymnase
                              </label>

                              <select
                                value={
                                  horaire.gymnase_id
                                }
                                onChange={(
                                  e
                                ) =>
                                  modifierHoraire(
                                    indexGroupe,
                                    indexHoraire,
                                    "gymnase_id",
                                    e.target
                                      .value
                                  )
                                }
                              >
                                <option value="">
                                  Sélectionner
                                </option>

                                {gymnases
                                  .filter(
                                    (
                                      gymnase
                                    ) =>
                                      gymnase.actif ||
                                      gymnase.id ===
                                        horaire.gymnase_id
                                  )
                                  .map(
                                    (
                                      gymnase
                                    ) => (
                                      <option
                                        key={
                                          gymnase.id
                                        }
                                        value={
                                          gymnase.id
                                        }
                                      >
                                        {
                                          gymnase.nom
                                        }
                                      </option>
                                    )
                                  )}
                              </select>
                            </div>

                            <button
                              type="button"
                              className="cours-bouton-supprimer cours-bouton-supprimer-horaire"
                              disabled={
                                groupe
                                  .horaires
                                  .length <=
                                1
                              }
                              onClick={() =>
                                supprimerHoraire(
                                  indexGroupe,
                                  indexHoraire
                                )
                              }
                            >
                              −
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {message && (
            <div className="cours-message-erreur">
              {message}
            </div>
          )}

          <div className="cours-actions">
            <button
              type="button"
              className="admin-bouton admin-bouton-secondaire"
              onClick={onFermer}
              disabled={
                enregistrementEnCours
              }
            >
              Annuler
            </button>

            <button
              type="submit"
              className="admin-bouton admin-bouton-principal"
              disabled={
                enregistrementEnCours
              }
            >
              {enregistrementEnCours
                ? "Enregistrement..."
                : cours
                  ? "Enregistrer les modifications"
                  : "Créer le cours"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalCours;