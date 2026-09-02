import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

import "./EspaceEntraineur.css";

function EspaceEntraineur({ profil }) {
  const [groupes, setGroupes] = useState([]);
  const [groupeSelectionne, setGroupeSelectionne] = useState(null);
  const [vueGroupe, setVueGroupe] = useState("accueil");

  const [joueuses, setJoueuses] = useState([]);
  const [seances, setSeances] = useState([]);
  const [seanceSelectionnee, setSeanceSelectionnee] = useState(null);
  const [presences, setPresences] = useState([]);

  const [horaires, setHoraires] = useState([]);
  const [afficherCreationSeance, setAfficherCreationSeance] = useState(false);
  const [dateNouvelleSeance, setDateNouvelleSeance] = useState("");
  const [horaireNouvelleSeance, setHoraireNouvelleSeance] = useState("");
  const [commentaireNouvelleSeance, setCommentaireNouvelleSeance] =
    useState("");

  const [chargement, setChargement] = useState(true);
  const [chargementJoueuses, setChargementJoueuses] = useState(false);
  const [chargementSeances, setChargementSeances] = useState(false);
  const [chargementPresences, setChargementPresences] = useState(false);
  const [chargementHoraires, setChargementHoraires] = useState(false);
  const [enregistrementPresences, setEnregistrementPresences] =
    useState(false);
  const [creationSeanceEnCours, setCreationSeanceEnCours] = useState(false);
  const [annulationSeanceId, setAnnulationSeanceId] = useState(null);

  const [seanceEnModification, setSeanceEnModification] = useState(null);
  const [dateSeanceModifiee, setDateSeanceModifiee] = useState("");
  const [horaireSeanceModifie, setHoraireSeanceModifie] = useState("");
  const [commentaireSeanceModifie, setCommentaireSeanceModifie] =
    useState("");
  const [modificationSeanceEnCours, setModificationSeanceEnCours] =
    useState(false);

  const [erreur, setErreur] = useState("");
  const [erreurJoueuses, setErreurJoueuses] = useState("");
  const [erreurSeances, setErreurSeances] = useState("");
  const [erreurPresences, setErreurPresences] = useState("");
  const [erreurCreationSeance, setErreurCreationSeance] = useState("");
  const [erreurAnnulationSeance, setErreurAnnulationSeance] = useState("");
  const [erreurModificationSeance, setErreurModificationSeance] =
    useState("");
  const [messagePresences, setMessagePresences] = useState("");

  useEffect(() => {
    async function chargerGroupes() {
      setChargement(true);
      setErreur("");

      const { data, error } = await supabase
        .from("entraineurs_groupes")
        .select(`
          id,
          groupe_id,
          groupes (
            id,
            nom,
            ordre,
            actif,
            cours (
              id,
              nom,
              saison_id,
              saisons (
                id,
                nom,
                active
              )
            )
          )
        `)
        .eq("entraineur_id", profil.id);

      if (error) {
        console.error(
          "Erreur lors du chargement des groupes :",
          error
        );

        setErreur("Impossible de charger vos groupes.");
        setGroupes([]);
        setChargement(false);
        return;
      }

      const groupesActifs = (data ?? [])
        .filter(
          (affectation) =>
            affectation.groupes?.actif === true &&
            affectation.groupes?.cours?.saisons?.active === true
        )
        .sort((a, b) => {
          const coursA = a.groupes?.cours?.nom ?? "";
          const coursB = b.groupes?.cours?.nom ?? "";

          const comparaisonCours = coursA.localeCompare(
            coursB,
            "fr"
          );

          if (comparaisonCours !== 0) {
            return comparaisonCours;
          }

          return (
            (a.groupes?.ordre ?? 0) -
            (b.groupes?.ordre ?? 0)
          );
        });

      setGroupes(groupesActifs);
      setChargement(false);
    }

    chargerGroupes();
  }, [profil.id]);

  async function deconnexion() {
    await supabase.auth.signOut();
  }

  function ouvrirGroupe(affectation) {
    setGroupeSelectionne(affectation);
    setVueGroupe("accueil");

    setJoueuses([]);
    setSeances([]);
    setSeanceSelectionnee(null);
    setPresences([]);
    setAfficherCreationSeance(false);
    setSeanceEnModification(null);
    setHoraires([]);

    setErreurJoueuses("");
    setErreurSeances("");
    setErreurPresences("");
    setErreurCreationSeance("");
    setErreurAnnulationSeance("");
    setErreurModificationSeance("");
    setMessagePresences("");
  }

  function retourGroupes() {
    setGroupeSelectionne(null);
    setVueGroupe("accueil");

    setJoueuses([]);
    setSeances([]);
    setSeanceSelectionnee(null);
    setPresences([]);
    setAfficherCreationSeance(false);
    setSeanceEnModification(null);
    setHoraires([]);

    setErreurJoueuses("");
    setErreurSeances("");
    setErreurPresences("");
    setErreurCreationSeance("");
    setErreurAnnulationSeance("");
    setErreurModificationSeance("");
    setMessagePresences("");
  }

  function retourGestionGroupe() {
    setVueGroupe("accueil");
    setSeanceSelectionnee(null);
    setPresences([]);
    setAfficherCreationSeance(false);
    setErreurJoueuses("");
    setErreurSeances("");
    setErreurPresences("");
    setErreurCreationSeance("");
    setErreurAnnulationSeance("");
    setErreurModificationSeance("");
    setMessagePresences("");
  }

  async function ouvrirJoueuses() {
    if (!groupeSelectionne?.groupes?.id) {
      return;
    }

    setVueGroupe("joueuses");
    setChargementJoueuses(true);
    setErreurJoueuses("");
    setJoueuses([]);

    const { data, error } = await supabase.rpc(
      "lister_joueuses_groupe_entraineur",
      {
        p_groupe_id: groupeSelectionne.groupes.id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement des joueuses :",
        error
      );

      setErreurJoueuses(
        "Impossible de charger les joueuses de ce groupe."
      );

      setChargementJoueuses(false);
      return;
    }

    setJoueuses(data ?? []);
    setChargementJoueuses(false);
  }

  async function ouvrirSeances() {
    if (!groupeSelectionne?.groupes?.id) {
      return;
    }

    setVueGroupe("seances");
    setChargementSeances(true);
    setErreurSeances("");
    setSeances([]);

    const { data, error } = await supabase.rpc(
      "lister_seances_groupe_entraineur",
      {
        p_groupe_id: groupeSelectionne.groupes.id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement des séances :",
        error
      );

      setErreurSeances(
        "Impossible de charger les séances de ce groupe."
      );

      setChargementSeances(false);
      return;
    }

    setSeances(data ?? []);
    setChargementSeances(false);
  }

  async function ouvrirCreationSeance() {
    if (!groupeSelectionne?.groupes?.id) {
      return;
    }

    setAfficherCreationSeance(true);
    setSeanceEnModification(null);
    setErreurModificationSeance("");
    setChargementHoraires(true);
    setErreurCreationSeance("");
    setDateNouvelleSeance("");
    setHoraireNouvelleSeance("");
    setCommentaireNouvelleSeance("");

    const { data, error } = await supabase.rpc(
      "lister_horaires_groupe_entraineur",
      {
        p_groupe_id: groupeSelectionne.groupes.id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement des horaires :",
        error
      );
      setHoraires([]);
      setErreurCreationSeance(
        "Impossible de charger les horaires de ce groupe."
      );
      setChargementHoraires(false);
      return;
    }

    const horairesCharges = data ?? [];
    setHoraires(horairesCharges);

    if (horairesCharges.length === 1) {
      setHoraireNouvelleSeance(
        horairesCharges[0].horaire_groupe_id
      );
    }

    setChargementHoraires(false);
  }

  function fermerCreationSeance() {
    if (creationSeanceEnCours) {
      return;
    }

    setAfficherCreationSeance(false);
    setErreurCreationSeance("");
  }

  async function creerSeance(event) {
    event.preventDefault();

    if (!groupeSelectionne?.groupes?.id) {
      return;
    }

    if (!dateNouvelleSeance) {
      setErreurCreationSeance(
        "Choisis la date de la séance."
      );
      return;
    }

    if (!horaireNouvelleSeance) {
      setErreurCreationSeance(
        "Choisis l'horaire de la séance."
      );
      return;
    }

    setCreationSeanceEnCours(true);
    setErreurCreationSeance("");

    const { error } = await supabase.rpc(
      "creer_seance_entraineur",
      {
        p_groupe_id: groupeSelectionne.groupes.id,
        p_horaire_groupe_id: horaireNouvelleSeance,
        p_date_seance: dateNouvelleSeance,
        p_commentaire: commentaireNouvelleSeance || null,
      }
    );

    if (error) {
      console.error(
        "Erreur lors de la création de la séance :",
        error
      );
      setErreurCreationSeance(
        error.message || "Impossible de créer la séance."
      );
      setCreationSeanceEnCours(false);
      return;
    }

    setCreationSeanceEnCours(false);
    setAfficherCreationSeance(false);
    setDateNouvelleSeance("");
    setHoraireNouvelleSeance("");
    setCommentaireNouvelleSeance("");

    await ouvrirSeances();
  }

  async function ouvrirModificationSeance(seance) {
    if (
      !groupeSelectionne?.groupes?.id ||
      !seance?.seance_id ||
      seance.annulee
    ) {
      return;
    }

    setAfficherCreationSeance(false);
    setSeanceEnModification(seance);
    setDateSeanceModifiee(seance.date_seance ?? "");
    setCommentaireSeanceModifie(seance.commentaire ?? "");
    setHoraireSeanceModifie("");
    setErreurModificationSeance("");
    setChargementHoraires(true);

    const { data, error } = await supabase.rpc(
      "lister_horaires_groupe_entraineur",
      {
        p_groupe_id: groupeSelectionne.groupes.id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement des horaires pour la modification :",
        error
      );
      setHoraires([]);
      setErreurModificationSeance(
        "Impossible de charger les horaires de ce groupe."
      );
      setChargementHoraires(false);
      return;
    }

    const horairesCharges = data ?? [];
    setHoraires(horairesCharges);

    const horaireActuel = horairesCharges.find(
      (horaire) =>
        formaterHeure(horaire.heure_debut) ===
          formaterHeure(seance.heure_debut) &&
        formaterHeure(horaire.heure_fin) ===
          formaterHeure(seance.heure_fin) &&
        horaire.gymnase_id === seance.gymnase_id
    );

    if (horaireActuel) {
      setHoraireSeanceModifie(
        horaireActuel.horaire_groupe_id
      );
    } else if (horairesCharges.length === 1) {
      setHoraireSeanceModifie(
        horairesCharges[0].horaire_groupe_id
      );
    }

    setChargementHoraires(false);
  }

  function fermerModificationSeance() {
    if (modificationSeanceEnCours) {
      return;
    }

    setSeanceEnModification(null);
    setDateSeanceModifiee("");
    setHoraireSeanceModifie("");
    setCommentaireSeanceModifie("");
    setErreurModificationSeance("");
  }

  async function modifierSeance(event) {
    event.preventDefault();

    if (!seanceEnModification?.seance_id) {
      return;
    }

    if (!dateSeanceModifiee) {
      setErreurModificationSeance(
        "Choisis la date de la séance."
      );
      return;
    }

    if (!horaireSeanceModifie) {
      setErreurModificationSeance(
        "Choisis l'horaire de la séance."
      );
      return;
    }

    setModificationSeanceEnCours(true);
    setErreurModificationSeance("");

    const { error } = await supabase.rpc(
      "modifier_seance_entraineur",
      {
        p_seance_id: seanceEnModification.seance_id,
        p_horaire_groupe_id: horaireSeanceModifie,
        p_date_seance: dateSeanceModifiee,
        p_commentaire: commentaireSeanceModifie || null,
      }
    );

    if (error) {
      console.error(
        "Erreur lors de la modification de la séance :",
        error
      );
      setErreurModificationSeance(
        error.message || "Impossible de modifier la séance."
      );
      setModificationSeanceEnCours(false);
      return;
    }

    setModificationSeanceEnCours(false);
    setSeanceEnModification(null);
    setDateSeanceModifiee("");
    setHoraireSeanceModifie("");
    setCommentaireSeanceModifie("");

    await ouvrirSeances();
  }

  async function annulerSeance(seance) {
    if (!seance?.seance_id || seance.annulee) {
      return;
    }

    const confirmation = window.confirm(
      `Voulez-vous vraiment annuler la séance du ${formaterDate(
        seance.date_seance
      )} à ${formaterHeure(seance.heure_debut)} ?`
    );

    if (!confirmation) {
      return;
    }

    const commentaire = window.prompt(
      "Raison ou commentaire d'annulation (facultatif) :",
      seance.commentaire ?? ""
    );

    if (commentaire === null) {
      return;
    }

    setAnnulationSeanceId(seance.seance_id);
    setErreurAnnulationSeance("");

    const { error } = await supabase.rpc(
      "annuler_seance_entraineur",
      {
        p_seance_id: seance.seance_id,
        p_commentaire: commentaire || null,
      }
    );

    if (error) {
      console.error(
        "Erreur lors de l'annulation de la séance :",
        error
      );
      setErreurAnnulationSeance(
        error.message || "Impossible d'annuler la séance."
      );
      setAnnulationSeanceId(null);
      return;
    }

    setAnnulationSeanceId(null);
    await ouvrirSeances();
  }

  async function ouvrirPresencesSeance(seance) {
    if (!seance?.seance_id || seance.annulee) {
      return;
    }

    setSeanceSelectionnee(seance);
    setVueGroupe("presences");
    setChargementPresences(true);
    setErreurPresences("");
    setMessagePresences("");
    setPresences([]);

    const { data, error } = await supabase.rpc(
      "lister_presences_seance_entraineur",
      {
        p_seance_id: seance.seance_id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement des présences :",
        error
      );
      setErreurPresences(
        "Impossible de charger les présences de cette séance."
      );
      setChargementPresences(false);
      return;
    }

    setPresences(
      (data ?? []).map((presence) => ({
        ...presence,
        statut_presence:
          presence.statut_presence ?? "presente",
        commentaire: presence.commentaire ?? "",
      }))
    );

    setChargementPresences(false);
  }

  function modifierPresence(inscriptionId, champ, valeur) {
    setPresences((presencesActuelles) =>
      presencesActuelles.map((presence) =>
        presence.inscription_id === inscriptionId
          ? {
              ...presence,
              [champ]: valeur,
            }
          : presence
      )
    );

    setMessagePresences("");
  }

  async function enregistrerPresences() {
    if (
      !seanceSelectionnee?.seance_id ||
      presences.length === 0
    ) {
      return;
    }

    setEnregistrementPresences(true);
    setErreurPresences("");
    setMessagePresences("");

    for (const presence of presences) {
      const { error } = await supabase.rpc(
        "enregistrer_presence_entraineur",
        {
          p_seance_id: seanceSelectionnee.seance_id,
          p_inscription_id: presence.inscription_id,
          p_statut: presence.statut_presence,
          p_commentaire: presence.commentaire || null,
        }
      );

      if (error) {
        console.error(
          "Erreur lors de l'enregistrement des présences :",
          error
        );
        setErreurPresences(
          "Une erreur est survenue pendant l'enregistrement des présences."
        );
        setEnregistrementPresences(false);
        return;
      }
    }

    setMessagePresences("Présences enregistrées.");
    setEnregistrementPresences(false);
  }

  function formaterJourSemaine(jour) {
    const jours = {
      1: "Lundi",
      2: "Mardi",
      3: "Mercredi",
      4: "Jeudi",
      5: "Vendredi",
      6: "Samedi",
      7: "Dimanche",
    };

    return jours[jour] ?? `Jour ${jour}`;
  }

  function formaterDate(date) {
    if (!date) {
      return "—";
    }

    const [annee, mois, jour] = date.split("-");

    if (!annee || !mois || !jour) {
      return date;
    }

    return `${jour}/${mois}/${annee}`;
  }

  function formaterHeure(heure) {
    if (!heure) {
      return "—";
    }

    return heure.slice(0, 5);
  }

  function formaterConsentementPhotos(reponse) {
    if (!reponse) {
      return {
        texte: "Non renseigné",
        classe: "espace-entraineur-consentement-inconnu",
      };
    }

    const valeur = reponse.toLowerCase();

    if (
      valeur === "oui" ||
      valeur === "accepte" ||
      valeur === "autorise"
    ) {
      return {
        texte: "✓ Autorisé",
        classe: "espace-entraineur-consentement-oui",
      };
    }

    if (
      valeur === "non" ||
      valeur === "refuse"
    ) {
      return {
        texte: "✕ Refusé",
        classe: "espace-entraineur-consentement-non",
      };
    }

    return {
      texte: reponse,
      classe: "espace-entraineur-consentement-inconnu",
    };
  }

  if (groupeSelectionne) {
    const groupe = groupeSelectionne.groupes;

    if (vueGroupe === "joueuses") {
      return (
        <main className="espace-entraineur">
          <header className="espace-entraineur-entete">
            <div>
              <button
                type="button"
                className="espace-entraineur-retour"
                onClick={retourGestionGroupe}
              >
                ← Gestion du groupe
              </button>

              <p className="espace-entraineur-surtitle">
                {groupe.cours?.nom}
              </p>

              <h1>{groupe.nom}</h1>

              <p className="espace-entraineur-description">
                Joueuses inscrites
              </p>
            </div>

            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={deconnexion}
            >
              Déconnexion
            </button>
          </header>

          <section className="espace-entraineur-section">
            <div className="espace-entraineur-section-entete">
              <div>
                <h2>Joueuses</h2>
                <p>{groupe.cours?.saisons?.nom}</p>
              </div>
            </div>

            {chargementJoueuses && (
              <div className="espace-entraineur-message">
                Chargement des joueuses...
              </div>
            )}

            {!chargementJoueuses && erreurJoueuses && (
              <div className="espace-entraineur-erreur">
                {erreurJoueuses}
              </div>
            )}

            {!chargementJoueuses &&
              !erreurJoueuses &&
              joueuses.length === 0 && (
                <div className="espace-entraineur-message">
                  Aucune joueuse confirmée dans ce groupe.
                </div>
              )}

            {!chargementJoueuses &&
              !erreurJoueuses &&
              joueuses.length > 0 && (
                <div className="espace-entraineur-liste-joueuses">
                  <div className="espace-entraineur-tableau-conteneur">
                    <table className="espace-entraineur-tableau">
                      <thead>
                        <tr>
                          <th>Joueuse</th>
                          <th>Date de naissance</th>
                          <th>Sexe</th>
                          <th>Année scolaire</th>
                          <th>Photos / vidéos</th>
                          <th>Contact d'urgence</th>
                          <th>Lien</th>
                          <th>Téléphone</th>
                        </tr>
                      </thead>

                      <tbody>
                        {joueuses.map((joueuse) => {
                          const consentement =
                            formaterConsentementPhotos(
                              joueuse.consentement_photos_videos
                            );

                          return (
                            <tr key={joueuse.enfant_id}>
                              <td>
                                <strong>
                                  {joueuse.prenom} {joueuse.nom}
                                </strong>
                              </td>

                              <td>
                                {formaterDate(
                                  joueuse.date_naissance
                                )}
                              </td>

                              <td>{joueuse.sexe || "—"}</td>

                              <td>
                                {joueuse.annee_scolaire_nom || "—"}
                              </td>

                              <td>
                                <span className={consentement.classe}>
                                  {consentement.texte}
                                </span>
                              </td>

                              <td>
                                {joueuse.contact_urgence_prenom ||
                                joueuse.contact_urgence_nom ? (
                                  <>
                                    {joueuse.contact_urgence_prenom}{" "}
                                    {joueuse.contact_urgence_nom}
                                  </>
                                ) : (
                                  "—"
                                )}
                              </td>

                              <td>
                                {joueuse.contact_urgence_lien || "—"}
                              </td>

                              <td>
                                {joueuse.contact_urgence_telephone ? (
                                  <div>
                                    <a
                                      href={`tel:${joueuse.contact_urgence_telephone}`}
                                      className="espace-entraineur-telephone"
                                    >
                                      {joueuse.contact_urgence_telephone}
                                    </a>

                                    {joueuse.contact_urgence_telephone_secondaire && (
                                      <div className="espace-entraineur-telephone-secondaire">
                                        <a
                                          href={`tel:${joueuse.contact_urgence_telephone_secondaire}`}
                                          className="espace-entraineur-telephone"
                                        >
                                          {
                                            joueuse.contact_urgence_telephone_secondaire
                                          }
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <p className="espace-entraineur-total">
                    {joueuses.length}{" "}
                    {joueuses.length === 1
                      ? "joueuse"
                      : "joueuses"}
                  </p>
                </div>
              )}
          </section>
        </main>
      );
    }

    if (vueGroupe === "presences" && seanceSelectionnee) {
      return (
        <main className="espace-entraineur">
          <header className="espace-entraineur-entete">
            <div>
              <button
                type="button"
                className="espace-entraineur-retour"
                onClick={ouvrirSeances}
              >
                ← Séances
              </button>

              <p className="espace-entraineur-surtitle">
                {groupe.cours?.nom} — {groupe.nom}
              </p>

              <h1>Présences</h1>

              <p className="espace-entraineur-description">
                {formaterDate(seanceSelectionnee.date_seance)}
                {" — "}
                {formaterHeure(seanceSelectionnee.heure_debut)}
                {" à "}
                {formaterHeure(seanceSelectionnee.heure_fin)}
              </p>
            </div>

            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={deconnexion}
            >
              Déconnexion
            </button>
          </header>

          <section className="espace-entraineur-section">
            <div className="espace-entraineur-section-entete">
              <div>
                <h2>Joueuses</h2>
                <p>
                  {seanceSelectionnee.gymnase_nom ||
                    "Gymnase non précisé"}
                </p>
              </div>
            </div>

            {chargementPresences && (
              <div className="espace-entraineur-message">
                Chargement des présences...
              </div>
            )}

            {!chargementPresences && erreurPresences && (
              <div className="espace-entraineur-erreur">
                {erreurPresences}
              </div>
            )}

            {!chargementPresences &&
              !erreurPresences &&
              presences.length === 0 && (
                <div className="espace-entraineur-message">
                  Aucune joueuse confirmée pour cette séance.
                </div>
              )}

            {!chargementPresences &&
              presences.length > 0 && (
                <>
                  <div className="espace-entraineur-presences-liste">
                    {presences.map((presence) => (
                      <article
                        key={presence.inscription_id}
                        className="espace-entraineur-presence"
                      >
                        <div className="espace-entraineur-presence-joueuse">
                          <strong>
                            {presence.prenom} {presence.nom}
                          </strong>
                        </div>

                        <div className="espace-entraineur-presence-statuts">
                          <label>
                            <input
                              type="radio"
                              name={`presence-${presence.inscription_id}`}
                              value="presente"
                              checked={
                                presence.statut_presence ===
                                "presente"
                              }
                              onChange={(event) =>
                                modifierPresence(
                                  presence.inscription_id,
                                  "statut_presence",
                                  event.target.value
                                )
                              }
                            />
                            Présente
                          </label>

                          <label>
                            <input
                              type="radio"
                              name={`presence-${presence.inscription_id}`}
                              value="absente"
                              checked={
                                presence.statut_presence ===
                                "absente"
                              }
                              onChange={(event) =>
                                modifierPresence(
                                  presence.inscription_id,
                                  "statut_presence",
                                  event.target.value
                                )
                              }
                            />
                            Absente
                          </label>

                          <label>
                            <input
                              type="radio"
                              name={`presence-${presence.inscription_id}`}
                              value="retard"
                              checked={
                                presence.statut_presence ===
                                "retard"
                              }
                              onChange={(event) =>
                                modifierPresence(
                                  presence.inscription_id,
                                  "statut_presence",
                                  event.target.value
                                )
                              }
                            />
                            Retard
                          </label>
                        </div>

                        <input
                          type="text"
                          className="espace-entraineur-presence-commentaire"
                          placeholder="Commentaire facultatif"
                          value={presence.commentaire}
                          onChange={(event) =>
                            modifierPresence(
                              presence.inscription_id,
                              "commentaire",
                              event.target.value
                            )
                          }
                        />
                      </article>
                    ))}
                  </div>

                  {messagePresences && (
                    <div className="espace-entraineur-succes">
                      {messagePresences}
                    </div>
                  )}

                  <div className="espace-entraineur-presences-actions">
                    <button
                      type="button"
                      className="bouton bouton-principal"
                      onClick={enregistrerPresences}
                      disabled={enregistrementPresences}
                    >
                      {enregistrementPresences
                        ? "Enregistrement..."
                        : "Enregistrer les présences"}
                    </button>
                  </div>
                </>
              )}
          </section>
        </main>
      );
    }

    if (vueGroupe === "seances") {
      return (
        <main className="espace-entraineur">
          <header className="espace-entraineur-entete">
            <div>
              <button
                type="button"
                className="espace-entraineur-retour"
                onClick={retourGestionGroupe}
              >
                ← Gestion du groupe
              </button>

              <p className="espace-entraineur-surtitle">
                {groupe.cours?.nom}
              </p>

              <h1>{groupe.nom}</h1>

              <p className="espace-entraineur-description">
                Présences
              </p>
            </div>

            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={deconnexion}
            >
              Déconnexion
            </button>
          </header>

          <section className="espace-entraineur-section">
            <div className="espace-entraineur-section-entete">
              <div>
                <h2>Séances</h2>
                <p>{groupe.cours?.saisons?.nom}</p>
              </div>

              <button
                type="button"
                className="bouton bouton-principal"
                onClick={ouvrirCreationSeance}
              >
                + Créer une séance
              </button>
            </div>

            {afficherCreationSeance && (
              <form
                className="espace-entraineur-creation-seance"
                onSubmit={creerSeance}
              >
                <div className="espace-entraineur-creation-seance-entete">
                  <div>
                    <h3>Nouvelle séance</h3>
                    <p>
                      L'heure et le gymnase proviennent de l'horaire
                      du groupe.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="espace-entraineur-fermer"
                    onClick={fermerCreationSeance}
                    disabled={creationSeanceEnCours}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>

                {chargementHoraires ? (
                  <div className="espace-entraineur-message">
                    Chargement des horaires...
                  </div>
                ) : (
                  <>
                    <div className="espace-entraineur-creation-seance-grille">
                      <label>
                        <span>Date</span>
                        <input
                          type="date"
                          value={dateNouvelleSeance}
                          onChange={(event) =>
                            setDateNouvelleSeance(
                              event.target.value
                            )
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>Horaire du groupe</span>
                        <select
                          value={horaireNouvelleSeance}
                          onChange={(event) =>
                            setHoraireNouvelleSeance(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Choisir un horaire
                          </option>

                          {horaires.map((horaire) => (
                            <option
                              key={horaire.horaire_groupe_id}
                              value={horaire.horaire_groupe_id}
                            >
                              {formaterJourSemaine(
                                horaire.jour_semaine
                              )}
                              {" — "}
                              {formaterHeure(
                                horaire.heure_debut
                              )}
                              {" à "}
                              {formaterHeure(
                                horaire.heure_fin
                              )}
                              {" — "}
                              {horaire.gymnase_nom ||
                                "Gymnase non précisé"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="espace-entraineur-creation-seance-commentaire">
                      <span>Commentaire</span>
                      <textarea
                        rows="3"
                        placeholder="Commentaire facultatif"
                        value={commentaireNouvelleSeance}
                        onChange={(event) =>
                          setCommentaireNouvelleSeance(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    {horaires.length === 0 && (
                      <div className="espace-entraineur-erreur">
                        Aucun horaire n'est défini pour ce groupe.
                      </div>
                    )}

                    {erreurCreationSeance && (
                      <div className="espace-entraineur-erreur">
                        {erreurCreationSeance}
                      </div>
                    )}

                    <div className="espace-entraineur-creation-seance-actions">
                      <button
                        type="button"
                        className="bouton bouton-secondaire"
                        onClick={fermerCreationSeance}
                        disabled={creationSeanceEnCours}
                      >
                        Annuler
                      </button>

                      <button
                        type="submit"
                        className="bouton bouton-principal"
                        disabled={
                          creationSeanceEnCours ||
                          horaires.length === 0
                        }
                      >
                        {creationSeanceEnCours
                          ? "Création..."
                          : "Créer la séance"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {seanceEnModification && (
              <form
                className="espace-entraineur-creation-seance"
                onSubmit={modifierSeance}
              >
                <div className="espace-entraineur-creation-seance-entete">
                  <div>
                    <h3>Modifier la séance</h3>
                    <p>
                      L'heure et le gymnase proviennent de l'horaire
                      du groupe.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="espace-entraineur-fermer"
                    onClick={fermerModificationSeance}
                    disabled={modificationSeanceEnCours}
                    aria-label="Fermer"
                  >
                    ×
                  </button>
                </div>

                {chargementHoraires ? (
                  <div className="espace-entraineur-message">
                    Chargement des horaires...
                  </div>
                ) : (
                  <>
                    <div className="espace-entraineur-creation-seance-grille">
                      <label>
                        <span>Date</span>
                        <input
                          type="date"
                          value={dateSeanceModifiee}
                          onChange={(event) =>
                            setDateSeanceModifiee(
                              event.target.value
                            )
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>Horaire du groupe</span>
                        <select
                          value={horaireSeanceModifie}
                          onChange={(event) =>
                            setHoraireSeanceModifie(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Choisir un horaire
                          </option>

                          {horaires.map((horaire) => (
                            <option
                              key={horaire.horaire_groupe_id}
                              value={horaire.horaire_groupe_id}
                            >
                              {formaterJourSemaine(
                                horaire.jour_semaine
                              )}
                              {" — "}
                              {formaterHeure(
                                horaire.heure_debut
                              )}
                              {" à "}
                              {formaterHeure(
                                horaire.heure_fin
                              )}
                              {" — "}
                              {horaire.gymnase_nom ||
                                "Gymnase non précisé"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="espace-entraineur-creation-seance-commentaire">
                      <span>Commentaire</span>
                      <textarea
                        rows="3"
                        placeholder="Commentaire facultatif"
                        value={commentaireSeanceModifie}
                        onChange={(event) =>
                          setCommentaireSeanceModifie(
                            event.target.value
                          )
                        }
                      />
                    </label>

                    {horaires.length === 0 && (
                      <div className="espace-entraineur-erreur">
                        Aucun horaire n'est défini pour ce groupe.
                      </div>
                    )}

                    {erreurModificationSeance && (
                      <div className="espace-entraineur-erreur">
                        {erreurModificationSeance}
                      </div>
                    )}

                    <div className="espace-entraineur-creation-seance-actions">
                      <button
                        type="button"
                        className="bouton bouton-secondaire"
                        onClick={fermerModificationSeance}
                        disabled={modificationSeanceEnCours}
                      >
                        Annuler
                      </button>

                      <button
                        type="submit"
                        className="bouton bouton-principal"
                        disabled={
                          modificationSeanceEnCours ||
                          horaires.length === 0
                        }
                      >
                        {modificationSeanceEnCours
                          ? "Enregistrement..."
                          : "Enregistrer les modifications"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {erreurAnnulationSeance && (
              <div className="espace-entraineur-erreur">
                {erreurAnnulationSeance}
              </div>
            )}

            {chargementSeances && (
              <div className="espace-entraineur-message">
                Chargement des séances...
              </div>
            )}

            {!chargementSeances && erreurSeances && (
              <div className="espace-entraineur-erreur">
                {erreurSeances}
              </div>
            )}

            {!chargementSeances &&
              !erreurSeances &&
              seances.length === 0 && (
                <div className="espace-entraineur-message">
                  Aucune séance n'est encore créée pour ce groupe.
                </div>
              )}

            {!chargementSeances &&
              !erreurSeances &&
              seances.length > 0 && (
                <div className="espace-entraineur-grille-seances">
                  {seances.map((seance) => (
                    <article
                      key={seance.seance_id}
                      className={`espace-entraineur-seance ${
                        seance.annulee
                          ? "espace-entraineur-seance-annulee"
                          : ""
                      }`}
                    >
                      <div>
                        <p className="espace-entraineur-seance-date">
                          {formaterDate(seance.date_seance)}
                        </p>

                        <h3>
                          {formaterHeure(seance.heure_debut)}
                          {" à "}
                          {formaterHeure(seance.heure_fin)}
                        </h3>

                        <p>
                          {seance.gymnase_nom || "Gymnase non précisé"}
                        </p>

                        {seance.commentaire && (
                          <p className="espace-entraineur-seance-commentaire">
                            {seance.commentaire}
                          </p>
                        )}

                        {seance.annulee && (
                          <span className="espace-entraineur-seance-statut">
                            Séance annulée
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <button
                          type="button"
                          className="bouton bouton-principal"
                          disabled={
                            seance.annulee ||
                            annulationSeanceId === seance.seance_id
                          }
                          onClick={() =>
                            ouvrirPresencesSeance(seance)
                          }
                        >
                          {seance.annulee
                            ? "Séance annulée"
                            : "Prendre les présences"}
                        </button>

                        {!seance.annulee && (
                          <>
                            <button
                              type="button"
                              className="bouton bouton-secondaire"
                              disabled={
                                annulationSeanceId === seance.seance_id ||
                                modificationSeanceEnCours
                              }
                              onClick={() =>
                                ouvrirModificationSeance(seance)
                              }
                            >
                              Modifier la séance
                            </button>

                            <button
                              type="button"
                              className="bouton bouton-secondaire"
                              disabled={
                                annulationSeanceId === seance.seance_id ||
                                modificationSeanceEnCours
                              }
                              onClick={() => annulerSeance(seance)}
                            >
                              {annulationSeanceId === seance.seance_id
                                ? "Annulation..."
                                : "Annuler la séance"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
          </section>
        </main>
      );
    }

    return (
      <main className="espace-entraineur">
        <header className="espace-entraineur-entete">
          <div>
            <button
              type="button"
              className="espace-entraineur-retour"
              onClick={retourGroupes}
            >
              ← Mes groupes
            </button>

            <p className="espace-entraineur-surtitle">
              {groupe.cours?.nom}
            </p>

            <h1>{groupe.nom}</h1>

            <p className="espace-entraineur-description">
              {groupe.cours?.saisons?.nom}
            </p>
          </div>

          <button
            type="button"
            className="bouton bouton-secondaire"
            onClick={deconnexion}
          >
            Déconnexion
          </button>
        </header>

        <section className="espace-entraineur-section">
          <div className="espace-entraineur-section-entete">
            <div>
              <h2>Gestion du groupe</h2>

              <p>
                Consultez les joueuses et gérez les présences du
                groupe.
              </p>
            </div>
          </div>

          <div className="espace-entraineur-options">
            <article className="espace-entraineur-option">
              <div>
                <span className="espace-entraineur-option-icone">
                  👥
                </span>

                <h3>Joueuses</h3>

                <p>
                  Consulter les joueuses inscrites dans ce groupe.
                </p>
              </div>

              <button
                type="button"
                className="bouton bouton-principal"
                onClick={ouvrirJoueuses}
              >
                Voir les joueuses
              </button>
            </article>

            <article className="espace-entraineur-option">
              <div>
                <span className="espace-entraineur-option-icone">
                  ✓
                </span>

                <h3>Présences</h3>

                <p>
                  Prendre les présences lors des séances du groupe.
                </p>
              </div>

              <button
                type="button"
                className="bouton bouton-principal"
                onClick={ouvrirSeances}
              >
                Prendre les présences
              </button>
            </article>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="espace-entraineur">
      <header className="espace-entraineur-entete">
        <div>
          <p className="espace-entraineur-surtitle">
            Espace entraîneur
          </p>

          <h1>Bonjour {profil.prenom}</h1>

          <p className="espace-entraineur-description">
            Voici les groupes qui vous sont actuellement assignés.
          </p>
        </div>

        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={deconnexion}
        >
          Déconnexion
        </button>
      </header>

      <section className="espace-entraineur-section">
        <div className="espace-entraineur-section-entete">
          <div>
            <h2>Mes groupes</h2>
            <p>Saison active</p>
          </div>
        </div>

        {chargement && (
          <div className="espace-entraineur-message">
            Chargement de vos groupes...
          </div>
        )}

        {!chargement && erreur && (
          <div className="espace-entraineur-erreur">
            {erreur}
          </div>
        )}

        {!chargement &&
          !erreur &&
          groupes.length === 0 && (
            <div className="espace-entraineur-message">
              Aucun groupe ne vous est actuellement assigné.
            </div>
          )}

        {!chargement &&
          !erreur &&
          groupes.length > 0 && (
            <div className="espace-entraineur-grille">
              {groupes.map((affectation) => {
                const groupe = affectation.groupes;

                return (
                  <article
                    key={affectation.id}
                    className="espace-entraineur-carte"
                  >
                    <div className="espace-entraineur-carte-entete">
                      <div>
                        <span className="espace-entraineur-cours">
                          {groupe.cours?.nom}
                        </span>

                        <h3>{groupe.nom}</h3>
                      </div>
                    </div>

                    <p className="espace-entraineur-saison">
                      {groupe.cours?.saisons?.nom}
                    </p>

                    <button
                      type="button"
                      className="bouton bouton-principal"
                      onClick={() => ouvrirGroupe(affectation)}
                    >
                      Ouvrir le groupe
                    </button>
                  </article>
                );
              })}
            </div>
          )}
      </section>
    </main>
  );
}

export default EspaceEntraineur;
