import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionOrganisation.css";

const ORGANISATION_VIDE = {
  nom_legal: "",
  nom_affichage: "",
  adresse: "",
  ville: "",
  province: "",
  code_postal: "",
  telephone: "",
  courriel: "",
  numero_tps: "",
  numero_tvq: "",
  instructions_paiement: "",
};

function GestionOrganisation() {
  const [organisationId, setOrganisationId] = useState(null);
  const [formulaire, setFormulaire] = useState(ORGANISATION_VIDE);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    chargerOrganisation();
  }, []);

  async function chargerOrganisation() {
    setChargement(true);
    setErreur("");
    setMessage("");

    const { data, error } = await supabase
      .from("organisation")
      .select(`
        id,
        nom_legal,
        nom_affichage,
        adresse,
        ville,
        province,
        code_postal,
        telephone,
        courriel,
        numero_tps,
        numero_tvq,
        instructions_paiement
      `)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(error);
      setErreur(
        "Impossible de charger les informations de l'organisation."
      );
      setChargement(false);
      return;
    }

    if (!data) {
      setErreur(
        "Aucune fiche d'organisation n'a été trouvée."
      );
      setChargement(false);
      return;
    }

    setOrganisationId(data.id);
    setFormulaire({
      nom_legal: data.nom_legal ?? "",
      nom_affichage: data.nom_affichage ?? "",
      adresse: data.adresse ?? "",
      ville: data.ville ?? "",
      province: data.province ?? "",
      code_postal: data.code_postal ?? "",
      telephone: data.telephone ?? "",
      courriel: data.courriel ?? "",
      numero_tps: data.numero_tps ?? "",
      numero_tvq: data.numero_tvq ?? "",
      instructions_paiement:
        data.instructions_paiement ?? "",
    });

    setChargement(false);
  }

  function modifierChamp(event) {
    const { name, value } = event.target;

    setFormulaire((actuel) => ({
      ...actuel,
      [name]: value,
    }));

    setMessage("");
  }

  async function enregistrer(event) {
    event.preventDefault();

    if (!organisationId) {
      return;
    }

    const nomLegal = formulaire.nom_legal.trim();

    if (!nomLegal) {
      setErreur("Le nom légal de l'organisation est obligatoire.");
      return;
    }

    setEnregistrement(true);
    setErreur("");
    setMessage("");

    const { error } = await supabase
      .from("organisation")
      .update({
        nom_legal: nomLegal,
        nom_affichage:
          formulaire.nom_affichage.trim() || null,
        adresse:
          formulaire.adresse.trim() || null,
        ville:
          formulaire.ville.trim() || null,
        province:
          formulaire.province.trim() || null,
        code_postal:
          formulaire.code_postal.trim() || null,
        telephone:
          formulaire.telephone.trim() || null,
        courriel:
          formulaire.courriel.trim() || null,
        numero_tps:
          formulaire.numero_tps.trim() || null,
        numero_tvq:
          formulaire.numero_tvq.trim() || null,
        instructions_paiement:
          formulaire.instructions_paiement.trim() || null,
        date_modification: new Date().toISOString(),
      })
      .eq("id", organisationId);

    if (error) {
      console.error(error);
      setErreur(
        "Impossible d'enregistrer les informations de l'organisation."
      );
      setEnregistrement(false);
      return;
    }

    setMessage("Informations enregistrées avec succès.");
    setEnregistrement(false);
    await chargerOrganisation();
  }

  if (chargement) {
    return (
      <section className="gestion-organisation">
        <div className="gestion-organisation-vide">
          Chargement...
        </div>
      </section>
    );
  }

  return (
    <section className="gestion-organisation">
      <div className="gestion-organisation-entete">
        <div>
          <h1>Organisation</h1>
          <p>
            Informations officielles utilisées notamment
            sur les factures et les reçus.
          </p>
        </div>
      </div>

      {erreur && (
        <div className="gestion-organisation-erreur">
          {erreur}
        </div>
      )}

      {message && (
        <div className="gestion-organisation-succes">
          {message}
        </div>
      )}

      <form
        className="gestion-organisation-formulaire"
        onSubmit={enregistrer}
      >
        <div className="gestion-organisation-section">
          <h2>Identification</h2>

          <div className="gestion-organisation-grille">
            <label>
              <span>Nom légal *</span>
              <input
                type="text"
                name="nom_legal"
                value={formulaire.nom_legal}
                onChange={modifierChamp}
                required
              />
            </label>

            <label>
              <span>Nom d'affichage</span>
              <input
                type="text"
                name="nom_affichage"
                value={formulaire.nom_affichage}
                onChange={modifierChamp}
              />
            </label>
          </div>
        </div>

        <div className="gestion-organisation-section">
          <h2>Coordonnées</h2>

          <div className="gestion-organisation-grille">
            <label className="gestion-organisation-large">
              <span>Adresse</span>
              <input
                type="text"
                name="adresse"
                value={formulaire.adresse}
                onChange={modifierChamp}
              />
            </label>

            <label>
              <span>Ville</span>
              <input
                type="text"
                name="ville"
                value={formulaire.ville}
                onChange={modifierChamp}
              />
            </label>

            <label>
              <span>Province</span>
              <input
                type="text"
                name="province"
                value={formulaire.province}
                onChange={modifierChamp}
              />
            </label>

            <label>
              <span>Code postal</span>
              <input
                type="text"
                name="code_postal"
                value={formulaire.code_postal}
                onChange={modifierChamp}
              />
            </label>

            <label>
              <span>Téléphone</span>
              <input
                type="tel"
                name="telephone"
                value={formulaire.telephone}
                onChange={modifierChamp}
              />
            </label>

            <label className="gestion-organisation-large">
              <span>Courriel</span>
              <input
                type="email"
                name="courriel"
                value={formulaire.courriel}
                onChange={modifierChamp}
              />
            </label>
          </div>
        </div>

        <div className="gestion-organisation-section">
          <h2>Informations fiscales</h2>

          <div className="gestion-organisation-grille">
            <label>
              <span>Numéro de TPS</span>
              <input
                type="text"
                name="numero_tps"
                value={formulaire.numero_tps}
                onChange={modifierChamp}
              />
            </label>

            <label>
              <span>Numéro de TVQ</span>
              <input
                type="text"
                name="numero_tvq"
                value={formulaire.numero_tvq}
                onChange={modifierChamp}
              />
            </label>
          </div>
        </div>

        <div className="gestion-organisation-section">
          <h2>Paiement</h2>

          <label>
            <span>Instructions de paiement Interac</span>
            <textarea
              name="instructions_paiement"
              value={formulaire.instructions_paiement}
              onChange={modifierChamp}
              rows="5"
              placeholder="Ex. Adresse courriel pour le virement, question ou autres instructions."
            />
          </label>
        </div>

        <div className="gestion-organisation-actions">
          <button
            type="submit"
            className="admin-bouton admin-bouton-principal"
            disabled={enregistrement}
          >
            {enregistrement
              ? "Enregistrement..."
              : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default GestionOrganisation;