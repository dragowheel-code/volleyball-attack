import { useState } from "react";

function ModalAjoutParent({
  onFermer,
  onInviter,
  invitationEnCours,
  messageInvitation,
}) {
  const [formulaire, setFormulaire] = useState({
    prenom: "",
    nom: "",
    courriel: "",
    telephone: "",
    lien: "",
  });

  function modifierChamp(e) {
    const { name, value } = e.target;

    setFormulaire((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  }

  function soumettre(e) {
    e.preventDefault();

    onInviter(formulaire);
  }

  return (
    <div
      className="fond-modale"
      onMouseDown={onFermer}
    >
      <section
        className="modale-creation-compte"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="entete-modale">
          <h2>
            Ajouter un parent / responsable
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
              <label htmlFor="parent-prenom">
                Prénom
              </label>

              <input
                id="parent-prenom"
                name="prenom"
                type="text"
                value={formulaire.prenom}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="parent-nom">
                Nom
              </label>

              <input
                id="parent-nom"
                name="nom"
                type="text"
                value={formulaire.nom}
                onChange={modifierChamp}
                required
              />
            </div>
          </div>

          <div className="champ-formulaire">
            <label htmlFor="parent-courriel">
              Courriel
            </label>

            <input
              id="parent-courriel"
              name="courriel"
              type="email"
              value={formulaire.courriel}
              onChange={modifierChamp}
              autoComplete="email"
              required
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="parent-telephone">
              Téléphone
            </label>

            <input
              id="parent-telephone"
              name="telephone"
              type="tel"
              value={formulaire.telephone}
              onChange={modifierChamp}
              autoComplete="tel"
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="parent-lien">
              Lien avec les enfants
            </label>

            <select
              id="parent-lien"
              name="lien"
              value={formulaire.lien}
              onChange={modifierChamp}
              required
            >
              <option value="">
                Sélectionner
              </option>

              <option value="Mère">
                Mère
              </option>

              <option value="Père">
                Père
              </option>

              <option value="Tuteur">
                Tuteur / tutrice
              </option>

              <option value="Autre">
                Autre
              </option>
            </select>
          </div>

          {messageInvitation && (
            <p className="message-creation">
              {messageInvitation}
            </p>
          )}

          <div className="actions-modale">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={onFermer}
              disabled={invitationEnCours}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="bouton bouton-principal"
              disabled={invitationEnCours}
            >
              {invitationEnCours
                ? "Envoi..."
                : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalAjoutParent;