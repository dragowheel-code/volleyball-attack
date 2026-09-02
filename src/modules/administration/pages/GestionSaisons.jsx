import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function GestionSaisons() {
  const [saisons, setSaisons] = useState([]);
  const [chargement, setChargement] =
    useState(true);

  const [
    afficherFormulaire,
    setAfficherFormulaire,
  ] = useState(false);

  const [
    saisonEnModification,
    setSaisonEnModification,
  ] = useState(null);

  const [
    operationEnCours,
    setOperationEnCours,
  ] = useState(false);

  const [formulaire, setFormulaire] =
    useState({
      nom: "",
      dateDebut: "",
      dateFin: "",
      inscriptionsDebut: "",
      inscriptionsFin: "",
    });

  useEffect(() => {
    chargerSaisons();
  }, []);

  async function chargerSaisons() {
    setChargement(true);

    const { data, error } =
      await supabase
        .from("saisons")
        .select("*")
        .order("date_debut", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Erreur lors du chargement des saisons :",
        error
      );

      setSaisons([]);
      setChargement(false);

      return;
    }

    setSaisons(data || []);
    setChargement(false);
  }

  function modifierChamp(e) {
    const { name, value } = e.target;

    setFormulaire((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  }

  function ouvrirFormulaire() {
    setSaisonEnModification(null);

    setFormulaire({
      nom: "",
      dateDebut: "",
      dateFin: "",
      inscriptionsDebut: "",
      inscriptionsFin: "",
    });

    setAfficherFormulaire(true);
  }

  function ouvrirModification(saison) {
    setSaisonEnModification(saison);

    setFormulaire({
      nom: saison.nom || "",
      dateDebut:
        saison.date_debut || "",
      dateFin:
        saison.date_fin || "",
      inscriptionsDebut:
        saison.inscriptions_debut || "",
      inscriptionsFin:
        saison.inscriptions_fin || "",
    });

    setAfficherFormulaire(true);
  }

  function fermerFormulaire() {
    if (operationEnCours) {
      return;
    }

    setAfficherFormulaire(false);
    setSaisonEnModification(null);
  }

  async function enregistrerSaison(e) {
  e.preventDefault();

  const nom = formulaire.nom.trim();

  if (
    !nom ||
    !formulaire.dateDebut ||
    !formulaire.dateFin
  ) {
    alert(
      "Veuillez remplir les champs obligatoires."
    );

    return;
  }

  if (
    formulaire.dateFin <
    formulaire.dateDebut
  ) {
    alert(
      "La date de fin doit être après la date de début."
    );

    return;
  }

  if (
    formulaire.inscriptionsDebut &&
    formulaire.inscriptionsFin &&
    formulaire.inscriptionsFin <
      formulaire.inscriptionsDebut
  ) {
    alert(
      "La fin des inscriptions doit être après leur date de début."
    );

    return;
  }

  setOperationEnCours(true);

  const donnees = {
    nom,
    date_debut:
      formulaire.dateDebut,

    date_fin:
      formulaire.dateFin,

    inscriptions_debut:
      formulaire.inscriptionsDebut ||
      null,

    inscriptions_fin:
      formulaire.inscriptionsFin ||
      null,
  };

  const resultat = saisonEnModification
    ? await supabase
        .from("saisons")
        .update(donnees)
        .eq(
          "id",
          saisonEnModification.id
        )
    : await supabase
        .from("saisons")
        .insert({
          ...donnees,
          active: false,
        });

  setOperationEnCours(false);

  if (resultat.error) {
    console.error(
      "Erreur lors de l'enregistrement de la saison :",
      resultat.error
    );

    alert(
      `Impossible d'enregistrer la saison : ${resultat.error.message}`
    );

    return;
  }

  setAfficherFormulaire(false);
  setSaisonEnModification(null);

  await chargerSaisons();
}

  async function activerSaison(saison) {
    if (saison.active) {
      return;
    }

    const confirmation =
      window.confirm(
        `Activer la saison ${saison.nom} ?`
      );

    if (!confirmation) {
      return;
    }

    setOperationEnCours(true);

    const {
      error: erreurDesactivation,
    } = await supabase
      .from("saisons")
      .update({
        active: false,
      })
      .eq("active", true);

    if (erreurDesactivation) {
      setOperationEnCours(false);

      console.error(
        "Erreur lors de la désactivation de la saison active :",
        erreurDesactivation
      );

      alert(
        `Impossible de changer la saison active : ${erreurDesactivation.message}`
      );

      return;
    }

    const {
      error: erreurActivation,
    } = await supabase
      .from("saisons")
      .update({
        active: true,
      })
      .eq("id", saison.id);

    setOperationEnCours(false);

    if (erreurActivation) {
      console.error(
        "Erreur lors de l'activation de la saison :",
        erreurActivation
      );

      alert(
        `Impossible d'activer la saison : ${erreurActivation.message}`
      );

      return;
    }

    await chargerSaisons();
  }

  return (
    <section className="carte-administration">
      <div className="entete-carte-parent">
        <div>
          <h1>Saisons</h1>

          <p>
            Créer et gérer les saisons
            d'inscription.
          </p>
        </div>

        <button
          type="button"
          className="bouton bouton-principal"
          onClick={ouvrirFormulaire}
          disabled={operationEnCours}
        >
          + Nouvelle saison
        </button>
      </div>

      {chargement ? (
        <p>Chargement...</p>
      ) : saisons.length === 0 ? (
        <p>
          Aucune saison enregistrée.
        </p>
      ) : (
        <div className="liste-enfants">
          {saisons.map((saison) => (
            <article
              key={saison.id}
              className="fiche-enfant"
            >
              <div>
                <h3>
                  {saison.nom}
                </h3>

                <p>
                  Du{" "}
                  {saison.date_debut} au{" "}
                  {saison.date_fin}
                </p>

                {saison.inscriptions_debut && (
                  <p>
                    Inscriptions du{" "}
                    {
                      saison.inscriptions_debut
                    }{" "}
                    au{" "}
                    {saison.inscriptions_fin ||
                      "—"}
                  </p>
                )}

                <p>
                  Statut :{" "}
                  <strong>
                    {saison.active
                      ? "Active"
                      : "Inactive"}
                  </strong>
                </p>
              </div>

              <div className="actions-fiche">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={() =>
                    ouvrirModification(
                      saison
                    )
                  }
                  disabled={
                    operationEnCours
                  }
                >
                  Modifier
                </button>

                {!saison.active && (
                  <button
                    type="button"
                    className="bouton bouton-principal"
                    onClick={() =>
                      activerSaison(
                        saison
                      )
                    }
                    disabled={
                      operationEnCours
                    }
                  >
                    Activer
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {afficherFormulaire && (
        <div
          className="fond-modale"
          onMouseDown={
            fermerFormulaire
          }
        >
          <section
            className="modale-creation-compte"
            onMouseDown={(e) =>
              e.stopPropagation()
            }
          >
            <div className="entete-modale">
              <h2>
                {saisonEnModification
                  ? "Modifier la saison"
                  : "Nouvelle saison"}
              </h2>

              <button
                type="button"
                className="bouton-fermer-modale"
                onClick={
                  fermerFormulaire
                }
                disabled={
                  operationEnCours
                }
              >
                ×
              </button>
            </div>

            <form
              className="formulaire-creation-compte"
              onSubmit={
                enregistrerSaison
              }
            >
              <div className="champ-formulaire">
                <label htmlFor="saison-nom">
                  Nom
                </label>

                <input
                  id="saison-nom"
                  name="nom"
                  type="text"
                  value={
                    formulaire.nom
                  }
                  onChange={
                    modifierChamp
                  }
                  placeholder="2026-2027"
                  required
                />
              </div>

              <div className="ligne-formulaire">
                <div className="champ-formulaire">
                  <label htmlFor="date-debut">
                    Date de début
                  </label>

                  <input
                    id="date-debut"
                    name="dateDebut"
                    type="date"
                    value={
                      formulaire.dateDebut
                    }
                    onChange={
                      modifierChamp
                    }
                    required
                  />
                </div>

                <div className="champ-formulaire">
                  <label htmlFor="date-fin">
                    Date de fin
                  </label>

                  <input
                    id="date-fin"
                    name="dateFin"
                    type="date"
                    value={
                      formulaire.dateFin
                    }
                    onChange={
                      modifierChamp
                    }
                    required
                  />
                </div>
              </div>

              <div className="ligne-formulaire">
                <div className="champ-formulaire">
                  <label htmlFor="inscriptions-debut">
                    Début des inscriptions
                  </label>

                  <input
                    id="inscriptions-debut"
                    name="inscriptionsDebut"
                    type="date"
                    value={
                      formulaire.inscriptionsDebut
                    }
                    onChange={
                      modifierChamp
                    }
                  />
                </div>

                <div className="champ-formulaire">
                  <label htmlFor="inscriptions-fin">
                    Fin des inscriptions
                  </label>

                  <input
                    id="inscriptions-fin"
                    name="inscriptionsFin"
                    type="date"
                    value={
                      formulaire.inscriptionsFin
                    }
                    onChange={
                      modifierChamp
                    }
                  />
                </div>
              </div>

              <div className="actions-modale">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={
                    fermerFormulaire
                  }
                  disabled={
                    operationEnCours
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="bouton bouton-principal"
                  disabled={
                    operationEnCours
                  }
                >
                  {operationEnCours
                    ? "Enregistrement..."
                    : saisonEnModification
                      ? "Enregistrer"
                      : "Créer la saison"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default GestionSaisons;