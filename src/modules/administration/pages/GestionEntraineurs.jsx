import {
  useEffect,
  useState,
} from "react";

import { supabase } from "../../../lib/supabaseClient";

import ModalEntraineur from "../components/ModalEntraineur";

import "./GestionEntraineurs.css";

function GestionEntraineurs() {
  const [
    entraineurs,
    setEntraineurs,
  ] = useState([]);

  const [
    chargement,
    setChargement,
  ] = useState(true);

  const [
    afficherModal,
    setAfficherModal,
  ] = useState(false);

  const [
    operationEnCours,
    setOperationEnCours,
  ] = useState(null);

  // =========================================================
  // CHARGEMENT
  // =========================================================

  useEffect(() => {
    chargerEntraineurs();
  }, []);

  async function chargerEntraineurs() {
  setChargement(true);

  const { data, error } =
    await supabase.rpc(
      "lister_entraineurs_administration"
    );

  if (error) {
    console.error(error);

    alert(
      `Impossible de charger les entraîneurs : ${error.message}`
    );

    setEntraineurs([]);
  } else {
    setEntraineurs(data ?? []);
  }

  setChargement(false);
}

  // =========================================================
  // INVITATION TERMINÉE
  // =========================================================

  async function invitationTerminee() {
    setAfficherModal(false);

    await chargerEntraineurs();
  }
  async function renvoyerInvitation(entraineur) {
  const confirmation = window.confirm(
    `Renvoyer une invitation à ${entraineur.prenom} ${entraineur.nom} ?`
  );

  if (!confirmation) {
    return;
  }

  setOperationEnCours(`invitation-${entraineur.id}`);

  try {
    const { data, error } =
      await supabase.functions.invoke(
        "inviter-entraineur",
        {
          body: {
            action: "renvoyer",
            prenom: entraineur.prenom,
            nom: entraineur.nom,
            courriel: entraineur.courriel,
          },
        }
      );

    if (error) {
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    alert(
      data?.message ??
        "Invitation renvoyée avec succès."
    );

    await chargerEntraineurs();
  } catch (error) {
    console.error(
      "Erreur lors du renvoi de l'invitation :",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Impossible de renvoyer l'invitation."
    );
  } finally {
    setOperationEnCours(null);
  }
}

  // =========================================================
  // RÉVOQUER / RÉACTIVER L'ACCÈS
  // =========================================================

  async function modifierAcces(
    entraineur
  ) {
    const accesActif =
      entraineur.actif &&
      entraineur.est_entraineur;

    const action =
      accesActif
        ? "revoquer_acces_entraineur"
        : "reactiver_acces_entraineur";

    const confirmation =
      accesActif
        ? window.confirm(
            `Révoquer l'accès entraîneur de ${entraineur.prenom} ${entraineur.nom} ?`
          )
        : true;

    if (!confirmation) {
      return;
    }

    setOperationEnCours(
      entraineur.id
    );

    const { error } =
      await supabase.rpc(
        action,
        {
          p_entraineur_id:
            entraineur.id,
        }
      );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      alert(
        `Impossible de modifier l'accès : ${error.message}`
      );

      return;
    }

    await chargerEntraineurs();
  }

  // =========================================================
  // RETIRER COMPLÈTEMENT LE RÔLE ENTRAÎNEUR
  // =========================================================

  async function retirerEntraineur(
    entraineur
  ) {
    const confirmation =
      window.confirm(
        `Retirer complètement ${entraineur.prenom} ${entraineur.nom} de la liste des entraîneurs ?\n\nCette action retirera son accès entraîneur et ses affectations, mais ne supprimera pas son compte ni ses autres accès.`
      );

    if (!confirmation) {
      return;
    }

    setOperationEnCours(
      `retirer-${entraineur.id}`
    );

    const { error } =
      await supabase.rpc(
        "retirer_entraineur",
        {
          p_entraineur_id:
            entraineur.id,
        }
      );

    setOperationEnCours(null);

    if (error) {
      console.error(error);

      alert(
        `Impossible de retirer l'entraîneur : ${error.message}`
      );

      return;
    }

    await chargerEntraineurs();
  }

  // =========================================================
  // AFFICHAGE
  // =========================================================

  return (
    <section className="gestion-entraineurs">
      <div className="gestion-entraineurs-entete">
        <div>
          <h1>
            Entraîneurs
          </h1>

          <p>
            Gérez les comptes et les accès
            des entraîneurs.
          </p>
        </div>

        <button
          type="button"
          className="admin-bouton admin-bouton-principal"
          onClick={() =>
            setAfficherModal(true)
          }
        >
          + Inviter un entraîneur
        </button>
      </div>

      {chargement ? (
        <div className="gestion-entraineurs-vide">
          Chargement...
        </div>
      ) : entraineurs.length === 0 ? (
        <div className="gestion-entraineurs-vide">
          <h2>
            Aucun entraîneur
          </h2>

          <p>
            Invitez votre premier entraîneur
            pour commencer.
          </p>
        </div>
      ) : (
        <div className="gestion-entraineurs-liste">
          {entraineurs.map(
            (entraineur) => {
              const accesActif =
                entraineur.actif &&
                entraineur.est_entraineur;

              const compteGlobalInactif =
                !entraineur.actif;

              const invitationEnAttente =
                !entraineur.compte_active;

              return (
                <article
                  key={entraineur.id}
                  className="gestion-entraineurs-carte"
                >
                  <div className="gestion-entraineurs-identite">
                    <div className="gestion-entraineurs-avatar">
                      {(
                        entraineur.prenom?.[0] ??
                        ""
                      ).toUpperCase()}

                      {(
                        entraineur.nom?.[0] ??
                        ""
                      ).toUpperCase()}
                    </div>

                    <div>
                      <h2>
                        {entraineur.prenom}{" "}
                        {entraineur.nom}
                      </h2>

                      <span
                        className={
                          accesActif
                            ? "gestion-entraineurs-statut actif"
                            : "gestion-entraineurs-statut inactif"
                        }
                      >
                        {compteGlobalInactif
                            ? "Compte désactivé"
                            : invitationEnAttente
                            ? "Invitation en attente"
                            : accesActif
                            ? "Accès actif"
                            : "Accès révoqué"}
                      </span>
                    </div>
                  </div>

                  <div className="gestion-entraineurs-actions">
  {invitationEnAttente &&
    !compteGlobalInactif && (
      <button
        type="button"
        className="admin-bouton admin-bouton-principal"
        disabled={
          operationEnCours ===
          `invitation-${entraineur.id}`
        }
        onClick={() =>
          renvoyerInvitation(entraineur)
        }
      >
        {operationEnCours ===
        `invitation-${entraineur.id}`
          ? "Envoi..."
          : "Renvoyer l'invitation"}
      </button>
    )}

  {!invitationEnAttente && (
    <button
      type="button"
      className={
        accesActif
          ? "admin-bouton admin-bouton-secondaire"
          : "admin-bouton admin-bouton-principal"
      }
      disabled={
        operationEnCours ===
          entraineur.id ||
        operationEnCours ===
          `retirer-${entraineur.id}` ||
        compteGlobalInactif
      }
      onClick={() =>
        modifierAcces(entraineur)
      }
    >
      {operationEnCours ===
      entraineur.id
        ? "Traitement..."
        : accesActif
          ? "Révoquer l'accès"
          : "Réactiver l'accès"}
    </button>
  )}

  <button
    type="button"
    className="admin-bouton admin-bouton-secondaire"
    disabled={
      operationEnCours ===
        entraineur.id ||
      operationEnCours ===
        `retirer-${entraineur.id}` ||
      operationEnCours ===
        `invitation-${entraineur.id}`
    }
    onClick={() =>
      retirerEntraineur(entraineur)
    }
  >
    {operationEnCours ===
    `retirer-${entraineur.id}`
      ? "Retrait..."
      : "Retirer"}
  </button>
</div>
                </article>
              );
            }
          )}
        </div>
      )}

      {afficherModal && (
        <ModalEntraineur
          onFermer={() =>
            setAfficherModal(false)
          }
          onInvitationTerminee={
            invitationTerminee
          }
        />
      )}
    </section>
  );
}

export default GestionEntraineurs;