import { useState } from "react";

function ModalEnfant({
  enfant,
  onFermer,
  onEnregistrer,
  enregistrementEnCours,
  message,
}) {
  const [formulaire, setFormulaire] = useState({
    prenom: enfant?.prenom || "",
    nom: enfant?.nom || "",
    dateNaissance:
      enfant?.date_naissance || "",
    sexe:
      enfant?.sexe || "",
    numeroAssuranceMaladie:
      enfant?.numero_assurance_maladie || "",
    allergies:
      enfant?.allergies || "",
    problemesSante:
      enfant?.problemes_sante || "",
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
          <h2>Dossier de l'enfant</h2>

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
              <label htmlFor="modifier-enfant-prenom">
                Prénom
              </label>

              <input
                id="modifier-enfant-prenom"
                name="prenom"
                type="text"
                value={formulaire.prenom}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="modifier-enfant-nom">
                Nom
              </label>

              <input
                id="modifier-enfant-nom"
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
              <label htmlFor="modifier-enfant-date-naissance">
                Date de naissance
              </label>

              <input
                id="modifier-enfant-date-naissance"
                name="dateNaissance"
                type="date"
                value={formulaire.dateNaissance}
                onChange={modifierChamp}
                required
              />
            </div>

            <div className="champ-formulaire">
              <label htmlFor="modifier-enfant-sexe">
                Sexe
              </label>

              <select
                id="modifier-enfant-sexe"
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
            <label htmlFor="modifier-enfant-assurance">
              Numéro d'assurance maladie
            </label>

            <input
              id="modifier-enfant-assurance"
              name="numeroAssuranceMaladie"
              type="text"
              value={
                formulaire.numeroAssuranceMaladie
              }
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="modifier-enfant-allergies">
              Allergies
            </label>

            <textarea
              id="modifier-enfant-allergies"
              name="allergies"
              rows="3"
              value={formulaire.allergies}
              onChange={modifierChamp}
            />
          </div>

          <div className="champ-formulaire">
            <label htmlFor="modifier-enfant-sante">
              Problèmes de santé
            </label>

            <textarea
              id="modifier-enfant-sante"
              name="problemesSante"
              rows="3"
              value={formulaire.problemesSante}
              onChange={modifierChamp}
            />
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

export default ModalEnfant;