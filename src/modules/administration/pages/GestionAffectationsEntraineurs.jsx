import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";

import "./GestionAffectationsEntraineurs.css";

function GestionAffectationsEntraineurs() {
  const [
    groupes,
    setGroupes,
  ] = useState([]);

  const [
    entraineurs,
    setEntraineurs,
  ] = useState([]);

  const [
    affectations,
    setAffectations,
  ] = useState([]);

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    operationEnCours,
    setOperationEnCours,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  // =========================================================
  // CHARGEMENT
  // =========================================================

  useEffect(() => {
    chargerDonnees();
  }, []);

  async function chargerDonnees() {
    setChargement(true);
    setMessage("");

    const [
      resultatGroupes,
      resultatEntraineurs,
      resultatAffectations,
    ] = await Promise.all([
      supabase
        .from("groupes")
        .select(`
          id,
          nom,
          capacite,
          ordre,
          actif,
          cours!inner (
            id,
            nom,
            actif,
            saison_id,
            saisons!inner (
              id,
              nom,
              active
            )
          )
        `)
        .eq("actif", true)
        .eq("cours.actif", true)
        .eq("cours.saisons.active", true)
        .order("ordre"),

      supabase
        .from("profils")
        .select(`
          id,
          prenom,
          nom,
          actif,
          est_entraineur
        `)
        .eq("est_entraineur", true)
        .eq("actif", true)
        .order("nom")
        .order("prenom"),

      supabase
        .from("entraineurs_groupes")
        .select(`
          id,
          entraineur_id,
          groupe_id,
          actif
        `)
        .eq("actif", true),
    ]);

    if (resultatGroupes.error) {
      console.error(
        resultatGroupes.error
      );
    }

    if (resultatEntraineurs.error) {
      console.error(
        resultatEntraineurs.error
      );
    }

    if (resultatAffectations.error) {
      console.error(
        resultatAffectations.error
      );
    }

    if (
      resultatGroupes.error ||
      resultatEntraineurs.error ||
      resultatAffectations.error
    ) {
      setMessage(
        "Impossible de charger les affectations."
      );
    }

    setGroupes(
      resultatGroupes.data ?? []
    );

    setEntraineurs(
      resultatEntraineurs.data ?? []
    );

    setAffectations(
      resultatAffectations.data ?? []
    );

    setChargement(false);
  }

  // =========================================================
  // VÉRIFIER UNE AFFECTATION
  // =========================================================

  function estAffecte(
    entraineurId,
    groupeId
  ) {
    return affectations.some(
      (affectation) =>
        affectation.entraineur_id ===
          entraineurId &&
        affectation.groupe_id ===
          groupeId &&
        affectation.actif
    );
  }

  // =========================================================
  // MODIFIER UNE AFFECTATION
  // =========================================================

  async function basculerAffectation(
    entraineur,
    groupe
  ) {
    const dejaAffecte =
      estAffecte(
        entraineur.id,
        groupe.id
      );

    const cleOperation =
      `${entraineur.id}-${groupe.id}`;

    setOperationEnCours(
      cleOperation
    );

    setMessage("");

    const fonction =
      dejaAffecte
        ? "retirer_affectation_entraineur"
        : "affecter_entraineur_groupe";

    const { error } =
      await supabase.rpc(
        fonction,
        {
          p_entraineur_id:
            entraineur.id,

          p_groupe_id:
            groupe.id,
        }
      );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible de modifier l'affectation."
      );

      return;
    }

    await chargerDonnees();
  }

  // =========================================================
  // OBTENIR LES ENTRAÎNEURS D'UN GROUPE
  // =========================================================

  function obtenirEntraineursAffectes(
    groupeId
  ) {
    return entraineurs.filter(
      (entraineur) =>
        estAffecte(
          entraineur.id,
          groupeId
        )
    );
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <section className="affectations-entraineurs">
      <div className="affectations-entraineurs-entete">
        <div>
          <h1>
            Affectations des entraîneurs
          </h1>

          <p>
            Affectez les entraîneurs aux
            groupes de la saison active.
          </p>
        </div>
      </div>

      {message && (
        <div className="affectations-entraineurs-message">
          {message}
        </div>
      )}

      {chargement ? (
        <div className="affectations-entraineurs-vide">
          Chargement...
        </div>
      ) : groupes.length === 0 ? (
        <div className="affectations-entraineurs-vide">
          <h2>
            Aucun groupe disponible
          </h2>

          <p>
            Aucun groupe actif n'est
            disponible dans la saison active.
          </p>
        </div>
      ) : (
        <div className="affectations-entraineurs-liste">
          {groupes.map(
            (groupe) => {
              const affectes =
                obtenirEntraineursAffectes(
                  groupe.id
                );

              return (
                <article
                  key={groupe.id}
                  className="affectations-entraineurs-carte"
                >
                  <div className="affectations-entraineurs-carte-entete">
                    <div>
                      <span className="affectations-entraineurs-cours">
                        {groupe.cours?.nom}
                      </span>

                      <h2>
                        {groupe.nom}
                      </h2>

                      <p>
                        {
                          groupe.cours
                            ?.saisons?.nom
                        }
                      </p>
                    </div>

                    <div className="affectations-entraineurs-nombre">
                      {affectes.length}{" "}
                      entraîneur
                      {affectes.length !== 1
                        ? "s"
                        : ""}
                    </div>
                  </div>

                  {entraineurs.length ===
                  0 ? (
                    <div className="affectations-entraineurs-aucun">
                      Aucun entraîneur actif.
                    </div>
                  ) : (
                    <div className="affectations-entraineurs-choix">
                      {entraineurs.map(
                        (
                          entraineur
                        ) => {
                          const affecte =
                            estAffecte(
                              entraineur.id,
                              groupe.id
                            );

                          const cle =
                            `${entraineur.id}-${groupe.id}`;

                          return (
                            <button
                              key={
                                entraineur.id
                              }
                              type="button"
                              className={
                                affecte
                                  ? "affectations-entraineurs-personne selectionnee"
                                  : "affectations-entraineurs-personne"
                              }
                              disabled={
                                operationEnCours ===
                                cle
                              }
                              onClick={() =>
                                basculerAffectation(
                                  entraineur,
                                  groupe
                                )
                              }
                            >
                              <span className="affectations-entraineurs-avatar">
                                {(
                                  entraineur
                                    .prenom?.[0] ??
                                  ""
                                ).toUpperCase()}

                                {(
                                  entraineur
                                    .nom?.[0] ??
                                  ""
                                ).toUpperCase()}
                              </span>

                              <span className="affectations-entraineurs-nom">
                                {
                                  entraineur.prenom
                                }{" "}
                                {
                                  entraineur.nom
                                }
                              </span>

                              <span className="affectations-entraineurs-etat">
                                {operationEnCours ===
                                cle
                                  ? "..."
                                  : affecte
                                    ? "✓ Affecté"
                                    : "+ Affecter"}
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default GestionAffectationsEntraineurs;