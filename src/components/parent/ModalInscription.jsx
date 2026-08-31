import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../lib/supabaseClient";
import "./ModalInscription.css";

function ModalInscription({
  cours,
  groupe,
  saisonId,
  onFermer,
  onInscriptionCreee,
}) {
  const [enfants, setEnfants] = useState([]);
  const [annees, setAnnees] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [politiques, setPolitiques] = useState([]);

  const [enfantId, setEnfantId] = useState("");
  const [anneeScolaireId, setAnneeScolaireId] = useState("");
  const [niveauVolleyballId, setNiveauVolleyballId] = useState("");
  const [codeAcces, setCodeAcces] = useState("");

  const [reponsesPolitiques, setReponsesPolitiques] = useState({});

  const [chargement, setChargement] = useState(true);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  const demanderNiveau =
    cours?.demander_niveau_volleyball === true;

  const accesParCode =
    cours?.type_acces &&
    cours.type_acces !== "public";

  useEffect(() => {
    let actif = true;

    async function chargerDonnees() {
      try {
        const [
          resultatEnfants,
          resultatAnnees,
          resultatNiveaux,
          resultatPolitiques,
        ] = await Promise.all([
          supabase
            .from("parents_enfants")
            .select(`
              enfant_id,
              enfants (
                id,
                prenom,
                nom,
                date_naissance,
                sexe
              )
            `),

          supabase
            .from("cours_annees_scolaires")
            .select(`
              id,
              type,
              annee_scolaire_id,
              annees_scolaires (
                id,
                code,
                nom,
                ordre,
                actif
              )
            `)
            .eq("cours_id", cours.id),

          supabase
            .from("cours_niveaux_volleyball")
            .select(`
              id,
              niveau_id,
              niveaux_volleyball (
                id,
                code,
                nom,
                ordre,
                actif
              )
            `)
            .eq("cours_id", cours.id),

          supabase
            .from("saisons_politiques")
            .select(`
              id,
              obligatoire,
              refus_autorise,
              politique_versions (
                id,
                version,
                contenu,
                politiques (
                  id,
                  type,
                  titre,
                  active
                )
              )
            `)
            .eq("saison_id", saisonId),
        ]);

        if (!actif) {
          return;
        }

        if (resultatEnfants.error) {
          throw resultatEnfants.error;
        }

        if (resultatAnnees.error) {
          throw resultatAnnees.error;
        }

        if (resultatNiveaux.error) {
          throw resultatNiveaux.error;
        }

        if (resultatPolitiques.error) {
          throw resultatPolitiques.error;
        }

        const listeEnfants = (resultatEnfants.data ?? [])
          .map((ligne) => ligne.enfants)
          .filter((enfant) => enfant?.id);

        const listeAnnees = (resultatAnnees.data ?? [])
          .map((ligne) => ({
            ...ligne.annees_scolaires,
            typeAdmissibilite: ligne.type,
          }))
          .filter((annee) => annee?.id && annee.actif !== false)
          .sort(
            (a, b) =>
              (a.ordre ?? 0) - (b.ordre ?? 0)
          );

        const listeNiveaux = (resultatNiveaux.data ?? [])
          .map((ligne) => ligne.niveaux_volleyball)
          .filter((niveau) => niveau?.id && niveau.actif !== false)
          .sort(
            (a, b) =>
              (a.ordre ?? 0) - (b.ordre ?? 0)
          );

        const listePolitiques = (resultatPolitiques.data ?? [])
          .map((ligne) => {
            const version = ligne.politique_versions;
            const politique = version?.politiques;

            if (!version?.id || !politique?.type) {
              return null;
            }

            return {
              id: ligne.id,
              type: politique.type,
              titre: politique.titre,
              version: version.version,
              contenu: version.contenu,
              obligatoire: ligne.obligatoire,
              refusAutorise: ligne.refus_autorise,
            };
          })
          .filter(Boolean);

        setEnfants(listeEnfants);
        setAnnees(listeAnnees);
        setNiveaux(listeNiveaux);
        setPolitiques(listePolitiques);

        if (listeEnfants.length === 1) {
          setEnfantId(listeEnfants[0].id);
        }

        if (listeAnnees.length === 1) {
          setAnneeScolaireId(listeAnnees[0].id);
        }

        if (demanderNiveau && listeNiveaux.length === 1) {
          setNiveauVolleyballId(listeNiveaux[0].id);
        }
      } catch (error) {
        console.error(
          "Erreur lors du chargement de l'inscription :",
          error
        );

        if (actif) {
          setErreur(
            "Impossible de charger les informations nécessaires à l'inscription."
          );
        }
      } finally {
        if (actif) {
          setChargement(false);
        }
      }
    }

    chargerDonnees();

    return () => {
      actif = false;
    };
  }, [cours.id, demanderNiveau, saisonId]);

  const politiquesParType = useMemo(() => {
    const resultat = {};

    for (const politique of politiques) {
      resultat[politique.type] = politique;
    }

    return resultat;
  }, [politiques]);

  function changerReponsePolitique(type, valeur) {
    setReponsesPolitiques((etatActuel) => ({
      ...etatActuel,
      [type]: valeur,
    }));
  }

  function reponsePolitique(type) {
    return reponsesPolitiques[type];
  }

  function parametrePolitique(type) {
    return reponsesPolitiques[type] === true;
  }

  function validerFormulaire() {
    if (!enfantId) {
      return "Veuillez choisir un enfant.";
    }

    if (!anneeScolaireId) {
      return "Veuillez choisir l'année scolaire de l'enfant.";
    }

    if (demanderNiveau && !niveauVolleyballId) {
      return "Veuillez choisir le niveau de volleyball.";
    }

    if (accesParCode && !codeAcces.trim()) {
      return "Veuillez entrer le code d'accès.";
    }

    const typesRequis = [
      "code_conduite",
      "intervention",
      "photos_videos",
      "remboursement",
    ];

    for (const type of typesRequis) {
      const politique = politiquesParType[type];

      if (!politique) {
        return `La politique « ${type} » n'est pas disponible pour cette saison.`;
      }

      const reponse = reponsePolitique(type);

      if (reponse !== true && reponse !== false) {
        return `Veuillez répondre à la politique « ${politique.titre} ».`;
      }

      if (
        politique.obligatoire &&
        !politique.refusAutorise &&
        reponse !== true
      ) {
        return `Vous devez accepter la politique « ${politique.titre} » pour poursuivre.`;
      }
    }

    return "";
  }

  async function soumettreInscription(event) {
    event.preventDefault();

    if (envoiEnCours) {
      return;
    }

    setErreur("");
    setSucces("");

    const erreurValidation = validerFormulaire();

    if (erreurValidation) {
      setErreur(erreurValidation);
      return;
    }

    setEnvoiEnCours(true);

    const { data, error } = await supabase.rpc(
      "creer_inscription_parent",
      {
        p_enfant_id: enfantId,
        p_groupe_id: groupe.id,
        p_annee_scolaire_id: anneeScolaireId,
        p_niveau_volleyball_id:
          demanderNiveau && niveauVolleyballId
            ? niveauVolleyballId
            : null,
        p_code_acces:
          accesParCode && codeAcces.trim()
            ? codeAcces.trim()
            : null,
        p_accepte_code_conduite:
          parametrePolitique("code_conduite"),
        p_accepte_intervention:
          parametrePolitique("intervention"),
        p_autorise_photos_videos:
          parametrePolitique("photos_videos"),
        p_accepte_remboursement:
          parametrePolitique("remboursement"),
      }
    );

    setEnvoiEnCours(false);

    if (error) {
      console.error(
        "Erreur lors de l'inscription :",
        error
      );

      setErreur(
        error.message ||
          "Impossible de compléter l'inscription."
      );

      return;
    }

    const resultat = Array.isArray(data)
      ? data[0]
      : data;

    if (resultat?.statut === "liste_attente") {
      const position =
        resultat?.position_liste_attente;

      setSucces(
        position
          ? `L'enfant a été ajouté à la liste d'attente en position ${position}.`
          : "L'enfant a été ajouté à la liste d'attente."
      );
    } else {
      setSucces(
        "L'inscription a été créée. Elle est maintenant en attente de paiement."
      );
    }

    if (onInscriptionCreee) {
      onInscriptionCreee(resultat);
    }
  }

  function rendrePolitique(politique) {
    const valeur = reponsePolitique(
      politique.type
    );

    return (
      <div
        key={politique.type}
        className="inscription-politique"
      >
        <div className="inscription-politique-entete">
          <h3>{politique.titre}</h3>
          <span>
            Version {politique.version}
          </span>
        </div>

        <div className="inscription-politique-contenu">
          {politique.contenu}
        </div>

        {politique.refusAutorise ? (
          <div className="inscription-reponses">
            <label>
              <input
                type="radio"
                name={`politique-${politique.type}`}
                checked={valeur === true}
                onChange={() =>
                  changerReponsePolitique(
                    politique.type,
                    true
                  )
                }
              />
              Oui
            </label>

            <label>
              <input
                type="radio"
                name={`politique-${politique.type}`}
                checked={valeur === false}
                onChange={() =>
                  changerReponsePolitique(
                    politique.type,
                    false
                  )
                }
              />
              Non
            </label>
          </div>
        ) : (
          <label className="inscription-acceptation">
            <input
              type="checkbox"
              checked={valeur === true}
              onChange={(event) =>
                changerReponsePolitique(
                  politique.type,
                  event.target.checked
                )
              }
            />
            J'accepte cette politique.
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="modale-inscription-fond">
      <div className="modale-inscription">
        <div className="modale-inscription-entete">
          <div>
            <h2>Inscription</h2>
            <p>
              {cours.nom}
              {groupe?.nom
                ? ` — ${groupe.nom}`
                : ""}
            </p>
          </div>

          <button
            type="button"
            className="bouton bouton-secondaire"
            onClick={onFermer}
            disabled={envoiEnCours}
          >
            Fermer
          </button>
        </div>

        {chargement ? (
          <p className="etat-vide">
            Chargement...
          </p>
        ) : (
          <form
            className="formulaire-inscription"
            onSubmit={soumettreInscription}
          >
            <label>
              Enfant
              <select
                value={enfantId}
                onChange={(event) =>
                  setEnfantId(
                    event.target.value
                  )
                }
                disabled={envoiEnCours}
              >
                <option value="">
                  Choisir un enfant
                </option>

                {enfants.map((enfant) => (
                  <option
                    key={enfant.id}
                    value={enfant.id}
                  >
                    {enfant.prenom}{" "}
                    {enfant.nom}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Année scolaire
              <select
                value={anneeScolaireId}
                onChange={(event) =>
                  setAnneeScolaireId(
                    event.target.value
                  )
                }
                disabled={envoiEnCours}
              >
                <option value="">
                  Choisir l'année scolaire
                </option>

                {annees.map((annee) => (
                  <option
                    key={annee.id}
                    value={annee.id}
                  >
                    {annee.nom}
                    {annee.typeAdmissibilite ===
                    "conditionnelle"
                      ? " — admissibilité conditionnelle"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            {demanderNiveau && (
              <label>
                Niveau de volleyball
                <select
                  value={niveauVolleyballId}
                  onChange={(event) =>
                    setNiveauVolleyballId(
                      event.target.value
                    )
                  }
                  disabled={envoiEnCours}
                >
                  <option value="">
                    Choisir un niveau
                  </option>

                  {niveaux.map((niveau) => (
                    <option
                      key={niveau.id}
                      value={niveau.id}
                    >
                      {niveau.nom}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {accesParCode && (
              <label>
                Code d'accès
                <input
                  type="text"
                  value={codeAcces}
                  onChange={(event) =>
                    setCodeAcces(
                      event.target.value
                    )
                  }
                  disabled={envoiEnCours}
                  autoComplete="off"
                />
              </label>
            )}

            <div className="inscription-politiques">
              <h2>
                Consentements et politiques
              </h2>

              {politiques.length === 0 ? (
                <p className="etat-vide">
                  Aucune politique n'est
                  disponible pour cette saison.
                </p>
              ) : (
                politiques.map(
                  rendrePolitique
                )
              )}
            </div>

            {erreur && (
              <div className="inscription-message inscription-message-erreur">
                {erreur}
              </div>
            )}

            {succes && (
              <div className="inscription-message inscription-message-succes">
                {succes}
              </div>
            )}

            <div className="modale-inscription-actions">
              <button
                type="button"
                className="bouton bouton-secondaire"
                onClick={onFermer}
                disabled={envoiEnCours}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="bouton bouton-principal"
                disabled={
                  envoiEnCours ||
                  Boolean(succes)
                }
              >
                {envoiEnCours
                  ? "Inscription en cours..."
                  : "Confirmer l'inscription"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ModalInscription;
