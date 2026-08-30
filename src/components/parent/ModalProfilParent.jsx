import { useState } from "react";

function ModalProfilParent({
  profil,
  courriel,
  onFermer,
  onEnregistrer,
  enregistrementEnCours,
  message,
}) {
  const [formulaire, setFormulaire] = useState(() => ({
    prenom: profil?.prenom || "",
    nom: profil?.nom || "",
    telephone: profil?.telephone || "",
    adresse: profil?.adresse || "",
    ville: profil?.ville || "",
    codePostal: profil?.code_postal || "",
  }));

  function modifierChamp(e) {
    const { name, value } = e.target;

    setFormulaire((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  }

  function soumettre(e) {
    e.preventDefault();
    onEnregistrer(formulaire);
  }

  return (
    <div
      className="fond-modale"
      onMouseDown={onFermer}
    >
      <section
        className="modale-creation-compte"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="entete-modale">
          <h2>Mon profil</h2>

          <button
            type="button"
            className="bouton-fermer-modale"
            onClick={onFermer}
            disabled={enregistrementEnCours}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <form
          className="formulaire-creation-compte"
          onSubmit={soumettre}
        >
          <div className="ligne-formulaire">
            <div className="champ-formulaire">
              <label htmlFor="profil-prenom">
                Prénom
              </label>

              <input
                id="profil-prenom"
                name="prenom"
                type="text"
                value={formulaire.prenom}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="profil-nom">
                Nom
              </label>

              <input
                id="profil-nom"
                name="nom"
                type="text"
                value={formulaire.nom}
                onChange={modifierChamp}
                required
              />
            </div>
          </div>

          <div className="champ-formulaire">
            <label htmlFor="profil-courriel">
              Courriel
            </label>

            <input
              id="profil-courriel"
              type="email"
              value={courriel || ""}
              disabled
            />

            <small>
              Le changement d'adresse courriel sera
              géré séparément.
            </small>
          </div>

          <div className="champ-formulaire">
            <label htmlFor="profil-telephone">
              Téléphone
            </label>

            <input
              id="profil-telephone"
              name="telephone"
              type="tel"
              value={formulaire.telephone}
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="profil-adresse">
              Adresse
            </label>

            <input
              id="profil-adresse"
              name="adresse"
              type="text"
              value={formulaire.adresse}
              onChange={modifierChamp}
            />
          </div>

          <div className="ligne-formulaire">
            <div className="champ-formulaire">
              <label htmlFor="profil-ville">
                Ville
              </label>

              <input
                id="profil-ville"
                name="ville"
                type="text"
                value={formulaire.ville}
                onChange={modifierChamp}
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="profil-code-postal">
                Code postal
              </label>

              <input
                id="profil-code-postal"
                name="codePostal"
                type="text"
                value={formulaire.codePostal}
                onChange={modifierChamp}
                maxLength="7"
              />
            </div>
          </div>

          {message && (
            <p className="message-creation">
              {message}
            </p>
          )}

          <div className="actions-modale">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={onFermer}
              disabled={enregistrementEnCours}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="bouton bouton-principal"
              disabled={enregistrementEnCours}
            >
              {enregistrementEnCours
                ? "Enregistrement..."
                : "Enregistrer"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalProfilParent;