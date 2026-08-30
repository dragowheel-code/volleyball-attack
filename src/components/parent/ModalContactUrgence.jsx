import { useState } from "react";

function ModalContactUrgence({
  onFermer,
  onEnregistrer,
  enregistrementEnCours,
  message,
  contact = null,
  premierContact = false,
}) {
  const modeModification = Boolean(contact);

  const [formulaire, setFormulaire] = useState({
    prenom: contact?.prenom || "",
    nom: contact?.nom || "",
    lien: contact?.lien || "",
    telephone: contact?.telephone || "",
    telephoneSecondaire:
      contact?.telephone_secondaire || "",
    principal:
      contact?.principal ?? premierContact,
  });

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
          <h2>
            {modeModification
              ? "Modifier le contact d'urgence"
              : "Ajouter un contact d'urgence"}
          </h2>

          <button
            type="button"
            className="bouton-fermer-modale"
            onClick={onFermer}
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
              <label htmlFor="urgence-prenom">
                Prénom
              </label>

              <input
                id="urgence-prenom"
                name="prenom"
                type="text"
                value={formulaire.prenom}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="urgence-nom">
                Nom
              </label>

              <input
                id="urgence-nom"
                name="nom"
                type="text"
                value={formulaire.nom}
                onChange={modifierChamp}
                required
              />
            </div>
          </div>

          <div className="champ-formulaire">
            <label htmlFor="urgence-lien">
              Lien avec la famille
            </label>

            <input
              id="urgence-lien"
              name="lien"
              type="text"
              placeholder="Ex. Grand-mère, oncle, amie"
              value={formulaire.lien}
              onChange={modifierChamp}
              required
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="urgence-telephone">
              Téléphone
            </label>

            <input
              id="urgence-telephone"
              name="telephone"
              type="tel"
              value={formulaire.telephone}
              onChange={modifierChamp}
              required
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="urgence-telephone-secondaire">
              Téléphone secondaire
            </label>

            <input
              id="urgence-telephone-secondaire"
              name="telephoneSecondaire"
              type="tel"
              value={
                formulaire.telephoneSecondaire
              }
              onChange={modifierChamp}
            />
          </div>

          {!premierContact && (
            <label className="champ-case">
              <input
                type="checkbox"
                name="principal"
                checked={
                  formulaire.principal
                }
                onChange={modifierChamp}
              />

              Définir comme contact principal
            </label>
          )}

          {premierContact &&
            !modeModification && (
              <p className="etat-vide">
                Ce premier contact sera automatiquement défini comme contact principal.
              </p>
            )}

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
              disabled={
                enregistrementEnCours
              }
            >
              Annuler
            </button>

            <button
              type="submit"
              className="bouton bouton-principal"
              disabled={
                enregistrementEnCours
              }
            >
              {enregistrementEnCours
                ? "Enregistrement..."
                : modeModification
                  ? "Enregistrer"
                  : "Ajouter le contact"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalContactUrgence;