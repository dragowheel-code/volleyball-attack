import { useState } from "react";

function ModalAjoutEnfant({
  onFermer,
  onAjouter,
  ajoutEnCours,
  messageAjout,
}) {
  const [formulaire, setFormulaire] = useState({
    prenom: "",
    nom: "",
    dateNaissance: "",
    sexe: "",
    numeroAssuranceMaladie: "",
    allergies: "",
    problemesSante: "",
    lienParent: "",
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
    onAjouter(formulaire);
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
          <h2>Ajouter un enfant</h2>

          <button
            type="button"
            className="bouton-fermer-modale"
            onClick={onFermer}
            aria-label="Fermer"
            disabled={ajoutEnCours}
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
              <label htmlFor="enfant-prenom">
                Prénom
              </label>

              <input
                id="enfant-prenom"
                name="prenom"
                type="text"
                value={formulaire.prenom}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="enfant-nom">
                Nom
              </label>

              <input
                id="enfant-nom"
                name="nom"
                type="text"
                value={formulaire.nom}
                onChange={modifierChamp}
                required
              />
            </div>
          </div>

          <div className="ligne-formulaire">
            <div className="champ-formulaire">
              <label htmlFor="enfant-date-naissance">
                Date de naissance
              </label>

              <input
                id="enfant-date-naissance"
                name="dateNaissance"
                type="date"
                value={formulaire.dateNaissance}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="enfant-sexe">
                Sexe
              </label>

              <select
                id="enfant-sexe"
                name="sexe"
                value={formulaire.sexe}
                onChange={modifierChamp}
                required
              >
                <option value="">
                  Sélectionner
                </option>

                <option value="fille">
                  Féminin
                </option>

                <option value="garcon">
                  Masculin
                </option>

                <option value="autre">
                  Autre
                </option>
              </select>
            </div>
          </div>

          <div className="champ-formulaire">
            <label htmlFor="enfant-assurance">
              Numéro d'assurance maladie
            </label>

            <input
              id="enfant-assurance"
              name="numeroAssuranceMaladie"
              type="text"
              value={formulaire.numeroAssuranceMaladie}
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="enfant-allergies">
              Allergies
            </label>

            <textarea
              id="enfant-allergies"
              name="allergies"
              rows="3"
              value={formulaire.allergies}
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="enfant-sante">
              Problèmes de santé
            </label>

            <textarea
              id="enfant-sante"
              name="problemesSante"
              rows="3"
              value={formulaire.problemesSante}
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="enfant-lien-parent">
              Lien avec l'enfant
            </label>

            <select
              id="enfant-lien-parent"
              name="lienParent"
              value={formulaire.lienParent}
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
                Tuteur
              </option>

              <option value="Autre">
                Autre
              </option>
            </select>
          </div>

          {messageAjout && (
            <p className="message-creation">
              {messageAjout}
            </p>
          )}

          <div className="actions-modale">
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={onFermer}
              disabled={ajoutEnCours}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="bouton bouton-principal"
              disabled={ajoutEnCours}
            >
              {ajoutEnCours
                ? "Ajout..."
                : "Ajouter l'enfant"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalAjoutEnfant;