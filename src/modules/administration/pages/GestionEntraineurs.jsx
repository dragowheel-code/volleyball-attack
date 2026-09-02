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
      await supabase
        .from("profils")
        .select(`
          id,
          prenom,
          nom,
          actif,
          date_creation
        `)
        .eq(
          "role",
          "entraineur"
        )
        .order("nom")
        .order("prenom");

    if (error) {
      console.error(error);

      alert(
        "Impossible de charger les entraîneurs."
      );

      setEntraineurs([]);
    } else {
      setEntraineurs(
        data ?? []
      );
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

  // =========================================================
  // ACTIVER / DÉSACTIVER
  // =========================================================

  async function modifierAcces(
    entraineur
  ) {
    const action =
      entraineur.actif
        ? "revoquer_acces_entraineur"
        : "reactiver_acces_entraineur";

    const confirmation =
      entraineur.actif
        ? window.confirm(
            `Révoquer l'accès de ${entraineur.prenom} ${entraineur.nom} ?`
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
            (entraineur) => (
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
                        entraineur.actif
                          ? "gestion-entraineurs-statut actif"
                          : "gestion-entraineurs-statut inactif"
                      }
                    >
                      {entraineur.actif
                        ? "Accès actif"
                        : "Accès révoqué"}
                    </span>
                  </div>
                </div>

                <div className="gestion-entraineurs-actions">
                  <button
                    type="button"
                    className={
                      entraineur.actif
                        ? "admin-bouton admin-bouton-secondaire"
                        : "admin-bouton admin-bouton-principal"
                    }
                    disabled={
                      operationEnCours ===
                      entraineur.id
                    }
                    onClick={() =>
                      modifierAcces(
                        entraineur
                      )
                    }
                  >
                    {operationEnCours ===
                    entraineur.id
                      ? "Traitement..."
                      : entraineur.actif
                        ? "Révoquer l'accès"
                        : "Réactiver l'accès"}
                  </button>
                </div>
              </article>
            )
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