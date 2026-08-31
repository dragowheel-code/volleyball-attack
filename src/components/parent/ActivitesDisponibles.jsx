import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../lib/supabaseClient";
import ModalInscription from "./ModalInscription";
import "./ActivitesDisponibles.css";

function ActivitesDisponibles({
  onRetour,
}) {
  const [saison, setSaison] = useState(null);
  const [cours, setCours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [groupeInscription, setGroupeInscription] =
    useState(null);

  useEffect(() => {
    let composantActif = true;

    const timer = setTimeout(async () => {
      const {
        data: saisonActive,
        error: erreurSaison,
      } = await supabase
        .from("saisons")
        .select(`
          id,
          nom,
          date_debut,
          date_fin,
          inscriptions_debut,
          inscriptions_fin
        `)
        .eq("active", true)
        .maybeSingle();

      if (!composantActif) {
        return;
      }

      if (erreurSaison) {
        console.error(erreurSaison);
        setErreur(
          "Impossible de charger la saison active."
        );
        setChargement(false);
        return;
      }

      if (!saisonActive) {
        setSaison(null);
        setCours([]);
        setChargement(false);
        return;
      }

      const {
        data: listeCours,
        error: erreurCours,
      } = await supabase
        .from("cours")
        .select(`
          id,
          nom,
          description,
          prix,
          sexe_admissible,
          demander_niveau_volleyball,
          autoriser_cumul_saison,
          type_acces,
          groupes (
            id,
            nom,
            capacite,
            ordre,
            horaires_groupes (
              id,
              jour_semaine,
              heure_debut,
              heure_fin,
              ordre,
              gymnases (
                id,
                nom
              )
            )
          )
        `)
        .eq("saison_id", saisonActive.id)
        .eq("actif", true)
        .eq("inscriptions_ouvertes", true)
        .order("nom", {
          ascending: true,
        });

      if (!composantActif) {
        return;
      }

      if (erreurCours) {
        console.error(erreurCours);
        setSaison(saisonActive);
        setCours([]);
        setErreur(
          "Impossible de charger les activités disponibles."
        );
        setChargement(false);
        return;
      }

      const listeTriee = (listeCours ?? []).map(
        (coursItem) => ({
          ...coursItem,
          groupes: (coursItem.groupes ?? [])
            .filter((groupe) => groupe !== null)
            .sort(
              (a, b) =>
                (a.ordre ?? 0) - (b.ordre ?? 0)
            )
            .map((groupe) => ({
              ...groupe,
              horaires_groupes:
                (groupe.horaires_groupes ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      (a.ordre ?? 0) -
                      (b.ordre ?? 0)
                  ),
            })),
        })
      );

      setSaison(saisonActive);
      setCours(listeTriee);
      setErreur("");
      setChargement(false);
    }, 0);

    return () => {
      composantActif = false;
      clearTimeout(timer);
    };
  }, []);

  function formaterMontant(montant) {
    return new Intl.NumberFormat(
      "fr-CA",
      {
        style: "currency",
        currency: "CAD",
      }
    ).format(Number(montant ?? 0));
  }

  function nomJour(jour) {
    const jours = {
      1: "Lundi",
      2: "Mardi",
      3: "Mercredi",
      4: "Jeudi",
      5: "Vendredi",
      6: "Samedi",
      7: "Dimanche",
    };

    return jours[jour] ?? "—";
  }

  function formaterHeure(heure) {
    if (!heure) {
      return "";
    }

    return heure.slice(0, 5);
  }

  if (chargement) {
    return (
      <section className="activites-disponibles">
        <p className="etat-vide">
          Chargement des activités...
        </p>
      </section>
    );
  }

  return (
    <section className="activites-disponibles">
      <div className="activites-entete">
        <div>
          <button
            type="button"
            className="bouton bouton-secondaire"
            onClick={onRetour}
          >
            ← Retour
          </button>

          <h1>Activités disponibles</h1>

          {saison && (
            <p>Saison {saison.nom}</p>
          )}
        </div>
      </div>

      {erreur && (
        <div className="activites-erreur">
          {erreur}
        </div>
      )}

      {!saison ? (
        <div className="activites-vide">
          <h2>Aucune saison active</h2>
          <p>
            Il n'y a actuellement aucune activité
            disponible.
          </p>
        </div>
      ) : cours.length === 0 ? (
        <div className="activites-vide">
          <h2>Aucune activité disponible</h2>
          <p>
            Les inscriptions ne sont actuellement
            ouvertes pour aucune activité.
          </p>
        </div>
      ) : (
        <div className="activites-liste">
          {cours.map((coursItem) => (
            <article
              key={coursItem.id}
              className="activite-carte"
            >
              <div className="activite-carte-entete">
                <div>
                  <h2>{coursItem.nom}</h2>

                  {coursItem.description && (
                    <p>{coursItem.description}</p>
                  )}
                </div>

                <strong className="activite-prix">
                  {formaterMontant(coursItem.prix)}
                </strong>
              </div>

              <div className="activite-groupes">
                {coursItem.groupes.length === 0 ? (
                  <p className="etat-vide">
                    Aucun groupe disponible.
                  </p>
                ) : (
                  coursItem.groupes.map((groupe) => (
                    <div
                      key={groupe.id}
                      className="activite-groupe"
                    >
                      {coursItem.groupes.length > 1 && (
                        <h3>{groupe.nom}</h3>
                      )}

                      <div className="activite-horaires">
                        {groupe.horaires_groupes.length === 0 ? (
                          <p>Horaire à déterminer</p>
                        ) : (
                          groupe.horaires_groupes.map(
                            (horaire) => (
                              <div
                                key={horaire.id}
                                className="activite-horaire"
                              >
                                <strong>
                                  {nomJour(
                                    horaire.jour_semaine
                                  )}
                                </strong>

                                <span>
                                  {formaterHeure(
                                    horaire.heure_debut
                                  )}
                                  {" à "}
                                  {formaterHeure(
                                    horaire.heure_fin
                                  )}
                                </span>

                                {horaire.gymnases?.nom && (
                                  <span>
                                    {horaire.gymnases.nom}
                                  </span>
                                )}
                              </div>
                            )
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        className="bouton bouton-principal"
                        onClick={() =>
                          setGroupeInscription({
                            cours: coursItem,
                            groupe,
                          })
                        }
                      >
                        Inscrire un enfant
                      </button>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {groupeInscription && saison && (
        <ModalInscription
          cours={groupeInscription.cours}
          groupe={groupeInscription.groupe}
          saisonId={saison.id}
          onFermer={() =>
            setGroupeInscription(null)
          }
          onInscriptionCreee={() =>
            setGroupeInscription(null)
          }
        />
      )}
    </section>
  );
}

export default ActivitesDisponibles;
