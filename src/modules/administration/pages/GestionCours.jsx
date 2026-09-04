import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import ModalCours from "../../../components/ModalCours";
import "./GestionCours.css";

function GestionCours() {
  const [cours, setCours] = useState([]);
  const [saisons, setSaisons] = useState([]);
  const [gymnases, setGymnases] = useState([]);
  const [anneesScolaires, setAnneesScolaires] = useState([]);
  const [niveauxVolleyball, setNiveauxVolleyball] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [afficherModal, setAfficherModal] = useState(false);
  const [coursEnModification, setCoursEnModification] = useState(null);

  // =========================================================
  // CHARGEMENT
  // =========================================================

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);

    const [
      resultatCours,
      resultatSaisons,
      resultatGymnases,
      resultatAnnees,
      resultatNiveaux,
      resultatStatistiques,
    ] = await Promise.all([
      supabase
        .from("cours")
        .select(`
          id,
          saison_id,
          nom,
          description,
          prix,
          sexe_admissible,
          demander_niveau_volleyball,
          autoriser_cumul_saison,
          type_acces,
          inscriptions_ouvertes,
          actif,
          date_creation
        `)
        .order("date_creation", { ascending: false }),

      supabase
        .from("saisons")
        .select("*")
        .order("date_debut", { ascending: false }),

      supabase
        .from("gymnases")
        .select("*")
        .order("nom"),

      supabase
        .from("annees_scolaires")
        .select("*")
        .order("ordre"),

      supabase
        .from("niveaux_volleyball")
        .select("*")
        .order("ordre"),

      supabase.rpc("lister_statistiques_cours_admin"),
    ]);

    if (resultatCours.error) {
      console.error(resultatCours.error);
    }

    if (resultatSaisons.error) {
      console.error(resultatSaisons.error);
    }

    if (resultatGymnases.error) {
      console.error(resultatGymnases.error);
    }

    if (resultatAnnees.error) {
      console.error(resultatAnnees.error);
    }

    if (resultatNiveaux.error) {
      console.error(resultatNiveaux.error);
    }

    if (resultatStatistiques.error) {
      console.error(resultatStatistiques.error);
    }

    const statistiquesParCours = new Map();

    for (const statistique of resultatStatistiques.data ?? []) {
      if (!statistiquesParCours.has(statistique.cours_id)) {
        statistiquesParCours.set(statistique.cours_id, []);
      }

      if (statistique.groupe_id) {
        statistiquesParCours
          .get(statistique.cours_id)
          .push({
            groupe_id: statistique.groupe_id,
            groupe_nom: statistique.groupe_nom,
            capacite: Number(statistique.capacite ?? 0),
            nombre_inscriptions: Number(
              statistique.nombre_inscriptions ?? 0
            ),
            nombre_liste_attente: Number(
              statistique.nombre_liste_attente ?? 0
            ),
          });
      }
    }

    const coursAvecStatistiques = (resultatCours.data ?? []).map(
      (element) => {
        const groupes = statistiquesParCours.get(element.id) ?? [];

        const capaciteTotale = groupes.reduce(
          (total, groupe) => total + groupe.capacite,
          0
        );

        const nombreInscriptions = groupes.reduce(
          (total, groupe) =>
            total + groupe.nombre_inscriptions,
          0
        );

        const nombreListeAttente = groupes.reduce(
          (total, groupe) =>
            total + groupe.nombre_liste_attente,
          0
        );

        return {
          ...element,
          statistiques_groupes: groupes,
          capacite_totale: capaciteTotale,
          nombre_inscriptions: nombreInscriptions,
          nombre_liste_attente: nombreListeAttente,
        };
      }
    );

    setCours(coursAvecStatistiques);
    setSaisons(resultatSaisons.data ?? []);
    setGymnases(resultatGymnases.data ?? []);
    setAnneesScolaires(resultatAnnees.data ?? []);
    setNiveauxVolleyball(resultatNiveaux.data ?? []);
    setChargement(false);
  }

  // =========================================================
  // NOUVEAU COURS
  // =========================================================

  function ouvrirNouveauCours() {
    setCoursEnModification(null);
    setAfficherModal(true);
  }

  // =========================================================
  // MODIFIER
  // =========================================================

  async function ouvrirModification(coursSelectionne) {
    const [
      resultatAnnees,
      resultatNiveaux,
      resultatGroupes,
    ] = await Promise.all([
      supabase
        .from("cours_annees_scolaires")
        .select(`
          annee_scolaire_id,
          type
        `)
        .eq("cours_id", coursSelectionne.id),

      supabase
        .from("cours_niveaux_volleyball")
        .select("niveau_id")
        .eq("cours_id", coursSelectionne.id),

      supabase
        .from("groupes")
        .select(`
          id,
          nom,
          capacite,
          ordre,
          actif,
          horaires_groupes (
            id,
            jour_semaine,
            heure_debut,
            heure_fin,
            gymnase_id,
            ordre
          )
        `)
        .eq("cours_id", coursSelectionne.id)
        .eq("actif", true)
        .order("ordre"),
    ]);

    if (
      resultatAnnees.error ||
      resultatNiveaux.error ||
      resultatGroupes.error
    ) {
      console.error(
        resultatAnnees.error ||
          resultatNiveaux.error ||
          resultatGroupes.error
      );

      alert("Impossible de charger le cours.");
      return;
    }

    const groupes = (resultatGroupes.data ?? []).map(
      (groupe) => ({
        ...groupe,
        horaires: (groupe.horaires_groupes ?? [])
          .sort(
            (a, b) =>
              (a.ordre ?? 0) - (b.ordre ?? 0)
          )
          .map((horaire) => ({
            id: horaire.id,
            jour_semaine: horaire.jour_semaine,
            heure_debut:
              horaire.heure_debut?.slice(0, 5) ?? "",
            heure_fin:
              horaire.heure_fin?.slice(0, 5) ?? "",
            gymnase_id: horaire.gymnase_id ?? "",
            ordre: horaire.ordre,
          })),
      })
    );

    setCoursEnModification({
      ...coursSelectionne,
      annees_scolaires: resultatAnnees.data ?? [],
      niveaux_volleyball: (
        resultatNiveaux.data ?? []
      ).map((element) => element.niveau_id),
      groupes,
    });

    setAfficherModal(true);
  }

  // =========================================================
  // SAUVEGARDE TERMINÉE
  // =========================================================

  async function gererEnregistrement() {
    setAfficherModal(false);
    setCoursEnModification(null);
    await chargerDonnees();
  }

  // =========================================================
  // NOM SAISON
  // =========================================================

  function obtenirNomSaison(saisonId) {
    return (
      saisons.find(
        (saison) => saison.id === saisonId
      )?.nom ?? "Saison inconnue"
    );
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <section className="gestion-cours">
      <div className="gestion-cours-entete">
        <div>
          <h1>Cours</h1>
          <p>
            Gérez les activités offertes, leurs groupes et leurs
            horaires.
          </p>
        </div>

        <button
          type="button"
          className="admin-bouton admin-bouton-principal"
          onClick={ouvrirNouveauCours}
        >
          + Nouveau cours
        </button>
      </div>

      {chargement ? (
        <div className="gestion-cours-vide">
          Chargement...
        </div>
      ) : cours.length === 0 ? (
        <div className="gestion-cours-vide">
          <h2>Aucun cours</h2>
          <p>
            Créez votre premier cours pour commencer.
          </p>
        </div>
      ) : (
        <div className="gestion-cours-liste">
          {cours.map((element) => (
            <article
              key={element.id}
              className="gestion-cours-carte"
            >
              <div className="gestion-cours-carte-principale">
                <div>
                  <div className="gestion-cours-badges">
                    <span
                      className={
                        element.actif
                          ? "gestion-cours-badge actif"
                          : "gestion-cours-badge inactif"
                      }
                    >
                      {element.actif
                        ? "Actif"
                        : "Inactif"}
                    </span>

                    <span className="gestion-cours-badge">
                      {element.inscriptions_ouvertes
                        ? "Inscriptions ouvertes"
                        : "Inscriptions fermées"}
                    </span>
                  </div>

                  <h2>{element.nom}</h2>

                  <p className="gestion-cours-saison">
                    {obtenirNomSaison(
                      element.saison_id
                    )}
                  </p>

                  {element.description && (
                    <p className="gestion-cours-description">
                      {element.description}
                    </p>
                  )}
                </div>

                <div className="gestion-cours-prix">
                  {Number(element.prix).toFixed(2)} $
                </div>
              </div>

              <div className="gestion-cours-statistiques">
                <div className="gestion-cours-statistiques-total">
                  <span>
                    Inscriptions :{" "}
                    <strong>
                      {element.nombre_inscriptions} /{" "}
                      {element.capacite_totale}
                    </strong>
                  </span>

                  {element.nombre_liste_attente > 0 && (
                    <span>
                      Liste d&apos;attente :{" "}
                      <strong>
                        {element.nombre_liste_attente}
                      </strong>
                    </span>
                  )}
                </div>

                {element.statistiques_groupes.map(
                  (groupe) => (
                    <div
                      key={groupe.groupe_id}
                      className="gestion-cours-statistique-groupe"
                    >
                      <span>
                        {groupe.groupe_nom} :{" "}
                        <strong>
                          {groupe.nombre_inscriptions} /{" "}
                          {groupe.capacite}
                        </strong>
                      </span>

                      {groupe.nombre_liste_attente > 0 && (
                        <span>
                          Liste d&apos;attente :{" "}
                          <strong>
                            {groupe.nombre_liste_attente}
                          </strong>
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>

              <div className="gestion-cours-pied">
                <div>
                  <span>
                    Accès :{" "}
                    <strong>
                      {element.type_acces === "code"
                        ? "Par code"
                        : "Public"}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  className="admin-bouton admin-bouton-secondaire"
                  onClick={() =>
                    ouvrirModification(element)
                  }
                >
                  Modifier
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {afficherModal && (
        <ModalCours
          cours={coursEnModification}
          saisons={saisons}
          gymnases={gymnases}
          anneesScolaires={anneesScolaires}
          niveauxVolleyball={niveauxVolleyball}
          onFermer={() => {
            setAfficherModal(false);
            setCoursEnModification(null);
          }}
          onEnregistre={gererEnregistrement}
        />
      )}
    </section>
  );
}

export default GestionCours;