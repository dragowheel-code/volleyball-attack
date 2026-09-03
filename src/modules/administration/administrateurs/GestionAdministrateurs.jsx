import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";

import "./GestionAdministrateurs.css";

function GestionAdministrateurs() {
  const [administrateurs, setAdministrateurs] =
    useState([]);

  const [chargement, setChargement] =
    useState(true);

  const [erreur, setErreur] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [modalOuvert, setModalOuvert] =
    useState(false);

  const [prenom, setPrenom] =
    useState("");

  const [nom, setNom] =
    useState("");

  const [courriel, setCourriel] =
    useState("");

  const [envoi, setEnvoi] =
    useState(false);

  const [
    operationEnCours,
    setOperationEnCours,
  ] = useState(null);

  // =========================================================
  // CHARGEMENT
  // =========================================================

  useEffect(() => {
    chargerAdministrateurs();
  }, []);

  async function chargerAdministrateurs() {
    setChargement(true);
    setErreur("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "lister_administrateurs"
    );

    if (error) {
      console.error(error);

      setErreur(
        "Impossible de charger les administrateurs."
      );

      setAdministrateurs([]);
      setChargement(false);

      return;
    }

    setAdministrateurs(
      data ?? []
    );

    setChargement(false);
  }

  // =========================================================
  // INVITATION
  // =========================================================

  function ouvrirInvitation() {
    setPrenom("");
    setNom("");
    setCourriel("");
    setErreur("");
    setMessage("");
    setModalOuvert(true);
  }

  function fermerInvitation() {
    if (envoi) {
      return;
    }

    setModalOuvert(false);
  }

  async function inviterAdministrateur(
    event
  ) {
    event.preventDefault();

    const prenomNettoye =
      prenom.trim();

    const nomNettoye =
      nom.trim();

    const courrielNettoye =
      courriel
        .trim()
        .toLowerCase();

    if (
      !prenomNettoye ||
      !nomNettoye ||
      !courrielNettoye
    ) {
      setErreur(
        "Le prénom, le nom et le courriel sont obligatoires."
      );

      return;
    }

    setEnvoi(true);
    setErreur("");
    setMessage("");

    const {
      data,
      error,
    } = await supabase.functions.invoke(
      "inviter-administrateur",
      {
        body: {
          prenom:
            prenomNettoye,
          nom:
            nomNettoye,
          courriel:
            courrielNettoye,
        },
      }
    );

    if (error) {
      console.error(error);

      setErreur(
        data?.error ??
          error.message ??
          "Impossible d'envoyer l'invitation."
      );

      setEnvoi(false);

      return;
    }

    if (data?.error) {
      setErreur(
        data.error
      );

      setEnvoi(false);

      return;
    }

    setMessage(
      "Invitation administrateur envoyée."
    );

    setModalOuvert(false);
    setEnvoi(false);

    await chargerAdministrateurs();
  }

  // =========================================================
  // RÉVOQUER
  // =========================================================

  async function revoquerAdministrateur(
    administrateur
  ) {
    const nomComplet =
      `${administrateur.prenom ?? ""} ${
        administrateur.nom ?? ""
      }`.trim();

    const confirme =
      window.confirm(
        `Révoquer l'accès administrateur de ${
          nomComplet ||
          administrateur.courriel
        } ?`
      );

    if (!confirme) {
      return;
    }

    setOperationEnCours(
      `revoquer-${administrateur.id}`
    );

    setErreur("");
    setMessage("");

    const {
      error,
    } = await supabase.rpc(
      "revoquer_administrateur",
      {
        p_administrateur_id:
          administrateur.id,
      }
    );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      setErreur(
        error.message ??
          "Impossible de révoquer cet administrateur."
      );

      return;
    }

    setMessage(
      "Accès administrateur révoqué."
    );

    await chargerAdministrateurs();
  }

  // =========================================================
  // RÉACTIVER
  // =========================================================

  async function reactiverAdministrateur(
    administrateur
  ) {
    setOperationEnCours(
      `reactiver-${administrateur.id}`
    );

    setErreur("");
    setMessage("");

    const {
      error,
    } = await supabase.rpc(
      "reactiver_administrateur",
      {
        p_administrateur_id:
          administrateur.id,
      }
    );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      setErreur(
        error.message ??
          "Impossible de réactiver cet administrateur."
      );

      return;
    }

    setMessage(
      "Accès administrateur réactivé."
    );

    await chargerAdministrateurs();
  }

  // =========================================================
  // RETIRER
  // =========================================================

  async function retirerAdministrateur(
    administrateur
  ) {
    const nomComplet =
      `${administrateur.prenom ?? ""} ${
        administrateur.nom ?? ""
      }`.trim();

    const confirme =
      window.confirm(
        `Retirer complètement ${
          nomComplet ||
          administrateur.courriel
        } de la liste des administrateurs ?\n\nCette action retirera son accès administrateur, mais ne supprimera pas son compte ni ses autres accès.`
      );

    if (!confirme) {
      return;
    }

    setOperationEnCours(
      `retirer-${administrateur.id}`
    );

    setErreur("");
    setMessage("");

    const {
      error,
    } = await supabase.rpc(
      "retirer_administrateur",
      {
        p_administrateur_id:
          administrateur.id,
      }
    );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      setErreur(
        error.message ??
          "Impossible de retirer cet administrateur."
      );

      return;
    }

    setMessage(
      "Administrateur retiré."
    );

    await chargerAdministrateurs();
  }

  // =========================================================
  // FORMATAGE
  // =========================================================

  function formaterDate(date) {
    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "fr-CA",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(
      new Date(date)
    );
  }

  function libelleStatut(
    statut
  ) {
    if (
      statut ===
      "invitation_en_attente"
    ) {
      return "Invitation en attente";
    }

    if (
      statut === "revoque"
    ) {
      return "Révoqué";
    }

    return "Actif";
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <section className="gestion-administrateurs">
      <div className="gestion-administrateurs-entete">
        <div>
          <p className="gestion-administrateurs-sur-titre">
            Administration
          </p>

          <h1>
            Administrateurs
          </h1>

          <p>
            Gérez les personnes ayant accès à
            l'administration.
          </p>
        </div>

        <button
          type="button"
          className="admin-bouton admin-bouton-principal"
          onClick={
            ouvrirInvitation
          }
        >
          Inviter un administrateur
        </button>
      </div>

      {erreur && (
        <div className="gestion-administrateurs-erreur">
          {erreur}
        </div>
      )}

      {message && (
        <div className="gestion-administrateurs-message">
          {message}
        </div>
      )}

      {chargement ? (
        <div className="gestion-administrateurs-vide">
          Chargement...
        </div>
      ) : administrateurs.length ===
        0 ? (
        <div className="gestion-administrateurs-vide">
          Aucun administrateur.
        </div>
      ) : (
        <div className="gestion-administrateurs-table-conteneur">
          <table className="gestion-administrateurs-table">
            <thead>
              <tr>
                <th>
                  Administrateur
                </th>

                <th>
                  Courriel
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Invitation
                </th>

                <th>
                  Dernière connexion
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {administrateurs.map(
                (
                  administrateur
                ) => {
                  const traitement =
                    operationEnCours?.endsWith(
                      administrateur.id
                    );

                  return (
                    <tr
                      key={
                        administrateur.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            administrateur.prenom
                          }{" "}
                          {
                            administrateur.nom
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          administrateur.courriel
                        }
                      </td>

                      <td>
                        <span
                          className={`gestion-administrateurs-statut statut-${administrateur.statut}`}
                        >
                          {libelleStatut(
                            administrateur.statut
                          )}
                        </span>
                      </td>

                      <td>
                        {formaterDate(
                          administrateur.date_invitation
                        )}
                      </td>

                      <td>
                        {formaterDate(
                          administrateur.derniere_connexion
                        )}
                      </td>

                      <td>
                        <div className="gestion-administrateurs-actions">
                          {administrateur.statut ===
                          "revoque" ? (
                            <button
                              type="button"
                              className="admin-bouton admin-bouton-principal"
                              disabled={
                                traitement
                              }
                              onClick={() =>
                                reactiverAdministrateur(
                                  administrateur
                                )
                              }
                            >
                              {operationEnCours ===
                              `reactiver-${administrateur.id}`
                                ? "Réactivation..."
                                : "Réactiver"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin-bouton admin-bouton-danger"
                              disabled={
                                traitement
                              }
                              onClick={() =>
                                revoquerAdministrateur(
                                  administrateur
                                )
                              }
                            >
                              {operationEnCours ===
                              `revoquer-${administrateur.id}`
                                ? "Révocation..."
                                : "Révoquer"}
                            </button>
                          )}

                          <button
                            type="button"
                            className="admin-bouton admin-bouton-secondaire"
                            disabled={
                              traitement
                            }
                            onClick={() =>
                              retirerAdministrateur(
                                administrateur
                              )
                            }
                          >
                            {operationEnCours ===
                            `retirer-${administrateur.id}`
                              ? "Retrait..."
                              : "Retirer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOuvert && (
        <div
          className="gestion-administrateurs-modal-fond"
          onMouseDown={
            fermerInvitation
          }
        >
          <div
            className="gestion-administrateurs-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="gestion-administrateurs-modal-entete">
              <div>
                <h2>
                  Inviter un administrateur
                </h2>

                <p>
                  La personne recevra un courriel
                  pour créer son accès.
                </p>
              </div>

              <button
                type="button"
                className="gestion-administrateurs-fermer"
                onClick={
                  fermerInvitation
                }
                disabled={
                  envoi
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                inviterAdministrateur
              }
            >
              <div className="gestion-administrateurs-champs">
                <label>
                  Prénom

                  <input
                    type="text"
                    value={
                      prenom
                    }
                    onChange={(
                      event
                    ) =>
                      setPrenom(
                        event.target.value
                      )
                    }
                    autoFocus
                  />
                </label>

                <label>
                  Nom

                  <input
                    type="text"
                    value={
                      nom
                    }
                    onChange={(
                      event
                    ) =>
                      setNom(
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="gestion-administrateurs-champ-large">
                  Courriel

                  <input
                    type="email"
                    value={
                      courriel
                    }
                    onChange={(
                      event
                    ) =>
                      setCourriel(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>

              <div className="gestion-administrateurs-modal-actions">
                <button
                  type="button"
                  className="admin-bouton admin-bouton-secondaire"
                  onClick={
                    fermerInvitation
                  }
                  disabled={
                    envoi
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="admin-bouton admin-bouton-principal"
                  disabled={
                    envoi
                  }
                >
                  {envoi
                    ? "Envoi..."
                    : "Envoyer l'invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default GestionAdministrateurs;