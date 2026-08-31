import { useState } from "react";

import { supabase } from "../../../lib/supabaseClient";

function ModalEntraineur({
  onFermer,
  onInvitationTerminee,
}) {
  const [
    formulaire,
    setFormulaire,
  ] = useState({
    prenom: "",
    nom: "",
    courriel: "",
  });

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    envoiEnCours,
    setEnvoiEnCours,
  ] = useState(false);

  function modifierChamp(e) {
    const {
      name,
      value,
    } = e.target;

    setFormulaire(
      (ancien) => ({
        ...ancien,
        [name]: value,
      })
    );
  }

  async function envoyerInvitation(
    e
  ) {
    e.preventDefault();

    setMessage("");

    const prenom =
      formulaire.prenom.trim();

    const nom =
      formulaire.nom.trim();

    const courriel =
      formulaire.courriel
        .trim()
        .toLowerCase();

    if (
      !prenom ||
      !nom ||
      !courriel
    ) {
      setMessage(
        "Tous les champs sont obligatoires."
      );

      return;
    }

    setEnvoiEnCours(true);

    const {
      data,
      error,
    } =
      await supabase.functions.invoke(
        "inviter-entraineur",
        {
          body: {
            prenom,
            nom,
            courriel,
          },
        }
      );

    setEnvoiEnCours(false);

    if (error) {
      console.error(error);

      setMessage(
        "Impossible d'envoyer l'invitation."
      );

      return;
    }

    if (data?.error) {
      setMessage(
        data.error
      );

      return;
    }

    await onInvitationTerminee();
  }

  return (
    <div
      className="entraineur-fond-modal"
      onMouseDown={() => {
        if (!envoiEnCours) {
          onFermer();
        }
      }}
    >
      <section
        className="entraineur-modal"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >
        <div className="entraineur-modal-entete">
          <div>
            <h2>
              Inviter un entraîneur
            </h2>

            <p>
              L'entraîneur recevra une
              invitation à son adresse
              courriel.
            </p>
          </div>

          <button
            type="button"
            className="entraineur-modal-fermer"
            onClick={onFermer}
            disabled={envoiEnCours}
          >
            ×
          </button>
        </div>

        <form
          className="entraineur-formulaire"
          onSubmit={
            envoyerInvitation
          }
        >
          <div className="entraineur-ligne">
            <div className="entraineur-champ">
              <label htmlFor="entraineur-prenom">
                Prénom
              </label>

              <input
                id="entraineur-prenom"
                name="prenom"
                type="text"
                value={
                  formulaire.prenom
                }
                onChange={
                  modifierChamp
                }
                required
              />
            </div>

            <div className="entraineur-champ">
              <label htmlFor="entraineur-nom">
                Nom
              </label>

              <input
                id="entraineur-nom"
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
          </div>

          <div className="entraineur-champ">
            <label htmlFor="entraineur-courriel">
              Courriel
            </label>

            <input
              id="entraineur-courriel"
              name="courriel"
              type="email"
              value={
                formulaire.courriel
              }
              onChange={
                modifierChamp
              }
              autoComplete="email"
              required
            />
          </div>

          {message && (
            <div className="entraineur-message-erreur">
              {message}
            </div>
          )}

          <div className="entraineur-actions-modal">
            <button
              type="button"
              className="admin-bouton admin-bouton-secondaire"
              onClick={onFermer}
              disabled={envoiEnCours}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="admin-bouton admin-bouton-principal"
              disabled={envoiEnCours}
            >
              {envoiEnCours
                ? "Envoi..."
                : "Envoyer l'invitation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ModalEntraineur;