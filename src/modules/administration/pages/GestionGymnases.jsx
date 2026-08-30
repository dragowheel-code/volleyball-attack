import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function GestionGymnases() {
  const [gymnases, setGymnases] = useState([]);
  const [chargement, setChargement] = useState(true);

  const [
    afficherFormulaire,
    setAfficherFormulaire,
  ] = useState(false);

  const [
    gymnaseEnModification,
    setGymnaseEnModification,
  ] = useState(null);

  const [
    operationEnCours,
    setOperationEnCours,
  ] = useState(false);

  const [formulaire, setFormulaire] =
    useState({
      nom: "",
      adresse: "",
      ville: "",
      codePostal: "",
      actif: true,
    });

  useEffect(() => {
    chargerGymnases();
  }, []);

  async function chargerGymnases() {
    setChargement(true);

    const { data, error } =
      await supabase
        .from("gymnases")
        .select("*")
        .order("nom", {
          ascending: true,
        });

    if (error) {
      console.error(
        "Erreur lors du chargement des gymnases :",
        error
      );

      setGymnases([]);
      setChargement(false);

      return;
    }

    setGymnases(data || []);
    setChargement(false);
  }

  function modifierChamp(e) {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormulaire((ancien) => ({
      ...ancien,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  }

  function ouvrirFormulaire() {
    setGymnaseEnModification(null);

    setFormulaire({
      nom: "",
      adresse: "",
      ville: "",
      codePostal: "",
      actif: true,
    });

    setAfficherFormulaire(true);
  }

  function ouvrirModification(gymnase) {
    setGymnaseEnModification(gymnase);

    setFormulaire({
      nom: gymnase.nom || "",
      adresse: gymnase.adresse || "",
      ville: gymnase.ville || "",
      codePostal:
        gymnase.code_postal || "",
      actif: gymnase.actif ?? true,
    });

    setAfficherFormulaire(true);
  }

  function fermerFormulaire() {
    if (operationEnCours) {
      return;
    }

    setAfficherFormulaire(false);
    setGymnaseEnModification(null);
  }

  async function enregistrerGymnase(e) {
    e.preventDefault();

    const nom = formulaire.nom.trim();

    if (!nom) {
      alert(
        "Le nom du gymnase est obligatoire."
      );

      return;
    }

    setOperationEnCours(true);

    const donnees = {
      nom,
      adresse:
        formulaire.adresse.trim() ||
        null,
      ville:
        formulaire.ville.trim() ||
        null,
      code_postal:
        formulaire.codePostal.trim() ||
        null,
      actif: formulaire.actif,
    };

    const resultat =
      gymnaseEnModification
        ? await supabase
            .from("gymnases")
            .update(donnees)
            .eq(
              "id",
              gymnaseEnModification.id
            )
        : await supabase
            .from("gymnases")
            .insert(donnees);

    setOperationEnCours(false);

    if (resultat.error) {
      console.error(
        "Erreur lors de l'enregistrement du gymnase :",
        resultat.error
      );

      alert(
        `Impossible d'enregistrer le gymnase : ${resultat.error.message}`
      );

      return;
    }

    setAfficherFormulaire(false);
    setGymnaseEnModification(null);

    await chargerGymnases();
  }

  return (
    <section className="carte-administration">
      <div className="entete-carte-parent">
        <div>
          <h1>Gymnases</h1>

          <p>
            Créer et gérer les lieux où
            se déroulent les activités.
          </p>
        </div>

        <button
          type="button"
          className="bouton bouton-principal"
          onClick={ouvrirFormulaire}
        >
          + Nouveau gymnase
        </button>
      </div>

      {chargement ? (
        <p>Chargement...</p>
      ) : gymnases.length === 0 ? (
        <p>
          Aucun gymnase enregistré.
        </p>
      ) : (
        <div className="liste-enfants">
          {gymnases.map((gymnase) => (
            <article
              key={gymnase.id}
              className="fiche-enfant"
            >
              <div>
                <h3>
                  {gymnase.nom}
                </h3>

                {gymnase.adresse && (
                  <p>
                    {gymnase.adresse}
                  </p>
                )}

                {(gymnase.ville ||
                  gymnase.code_postal) && (
                  <p>
                    {gymnase.ville}
                    {gymnase.ville &&
                    gymnase.code_postal
                      ? ", "
                      : ""}
                    {
                      gymnase.code_postal
                    }
                  </p>
                )}

                <p>
                  Statut :{" "}
                  <strong>
                    {gymnase.actif
                      ? "Actif"
                      : "Inactif"}
                  </strong>
                </p>
              </div>

              <div className="actions-fiche">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={() =>
                    ouvrirModification(
                      gymnase
                    )
                  }
                  disabled={
                    operationEnCours
                  }
                >
                  Modifier
                </button>
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
                {gymnaseEnModification
                  ? "Modifier le gymnase"
                  : "Nouveau gymnase"}
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
                enregistrerGymnase
              }
            >
              <div className="champ-formulaire">
                <label htmlFor="gymnase-nom">
                  Nom
                </label>

                <input
                  id="gymnase-nom"
                  name="nom"
                  type="text"
                  value={
                    formulaire.nom
                  }
                  onChange={
                    modifierChamp
                  }
                  required
                />
              </div>

              <div className="champ-formulaire">
                <label htmlFor="gymnase-adresse">
                  Adresse
                </label>

                <input
                  id="gymnase-adresse"
                  name="adresse"
                  type="text"
                  value={
                    formulaire.adresse
                  }
                  onChange={
                    modifierChamp
                  }
                />
              </div>

              <div className="ligne-formulaire">
                <div className="champ-formulaire">
                  <label htmlFor="gymnase-ville">
                    Ville
                  </label>

                  <input
                    id="gymnase-ville"
                    name="ville"
                    type="text"
                    value={
                      formulaire.ville
                    }
                    onChange={
                      modifierChamp
                    }
                  />
                </div>

                <div className="champ-formulaire">
                  <label htmlFor="gymnase-code-postal">
                    Code postal
                  </label>

                  <input
                    id="gymnase-code-postal"
                    name="codePostal"
                    type="text"
                    value={
                      formulaire.codePostal
                    }
                    onChange={
                      modifierChamp
                    }
                  />
                </div>
              </div>

              <label className="champ-case">
                <input
                  name="actif"
                  type="checkbox"
                  checked={
                    formulaire.actif
                  }
                  onChange={
                    modifierChamp
                  }
                />

                Gymnase actif
              </label>

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
                    : gymnaseEnModification
                      ? "Enregistrer"
                      : "Créer le gymnase"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

export default GestionGymnases;