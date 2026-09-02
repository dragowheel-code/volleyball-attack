import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionInscriptions.css";
const LIBELLES_STATUT = {
  en_attente_paiement: "En attente de paiement",
  confirmee: "Confirmée",
  liste_attente: "Liste d'attente",
  annulee: "Annulée",
};
const LIBELLES_PAIEMENT = {
  a_recevoir: "À recevoir",
  recu: "Reçu",
  rembourse: "Remboursé",
};
function GestionInscriptions() {
  const [saisonActive, setSaisonActive] = useState(null);
  const [inscriptions, setInscriptions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("toutes");
  const [recherche, setRecherche] = useState("");
  const [inscriptionPaiement, setInscriptionPaiement] =
    useState(null);
  const [referencePaiement, setReferencePaiement] =
    useState("");
  const [confirmationEnCours, setConfirmationEnCours] =
    useState(false);
  const [offrePlaceEnCours, setOffrePlaceEnCours] =
    useState(null);

  const [annulationEnCours, setAnnulationEnCours] =
    useState(null);

  const [remboursementEnCours, setRemboursementEnCours] =
    useState(null);
  useEffect(() => {
    chargerInscriptions();
  }, []);
  async function chargerInscriptions() {
    setChargement(true);
    setErreur("");
    const {
      data: saison,
      error: erreurSaison,
    } = await supabase
      .from("saisons")
      .select(`
        id,
        nom,
        date_debut,
        date_fin
      `)
      .eq("active", true)
      .maybeSingle();
    if (erreurSaison) {
      console.error(erreurSaison);
      setErreur(
        "Impossible de charger la saison active."
      );
      setChargement(false);
      return;
    }
    if (!saison) {
      setSaisonActive(null);
      setInscriptions([]);
      setChargement(false);
      return;
    }
    setSaisonActive(saison);
    const {
      data: cours,
      error: erreurCours,
    } = await supabase
      .from("cours")
      .select(`
        id,
        nom
      `)
      .eq("saison_id", saison.id);
    if (erreurCours) {
      console.error(erreurCours);
      setErreur(
        "Impossible de charger les cours."
      );
      setChargement(false);
      return;
    }
    const idsCours = (cours ?? []).map(
      (coursItem) => coursItem.id
    );
    if (idsCours.length === 0) {
      setInscriptions([]);
      setChargement(false);
      return;
    }
    const {
      data: groupes,
      error: erreurGroupes,
    } = await supabase
      .from("groupes")
      .select(`
        id,
        nom,
        capacite,
        ordre,
        cours_id
      `)
      .in("cours_id", idsCours);
    if (erreurGroupes) {
      console.error(erreurGroupes);
      setErreur(
        "Impossible de charger les groupes."
      );
      setChargement(false);
      return;
    }
    const idsGroupes = (groupes ?? []).map(
      (groupe) => groupe.id
    );
    if (idsGroupes.length === 0) {
      setInscriptions([]);
      setChargement(false);
      return;
    }
    const {
      data,
      error: erreurInscriptions,
    } = await supabase
      .from("inscriptions")
      .select(`
        id,
        enfant_id,
        groupe_id,
        statut,
        prix_facture,
        date_inscription,
        date_offre_place,
        date_confirmation,
        date_annulation,
        notes_administration,
        enfants (
          id,
          prenom,
          nom
        ),
        paiements (
          id,
          statut,
          montant,
          reference,
          date_paiement,
          montant_rembourse
        )
      `)
      .in("groupe_id", idsGroupes)
      .order("date_inscription", {
        ascending: false,
      });
    if (erreurInscriptions) {
      console.error(erreurInscriptions);
      setErreur(
        "Impossible de charger les inscriptions."
      );
      setInscriptions([]);
      setChargement(false);
      return;
    }
    const coursParId = new Map(
      (cours ?? []).map((coursItem) => [
        coursItem.id,
        coursItem,
      ])
    );
    const groupesParId = new Map(
      (groupes ?? []).map((groupe) => [
        groupe.id,
        groupe,
      ])
    );
    const inscriptionsCompletees =
      (data ?? []).map((inscription) => {
        const groupe = groupesParId.get(
          inscription.groupe_id
        );
        const coursItem = groupe
          ? coursParId.get(groupe.cours_id)
          : null;
        return {
          ...inscription,
          groupe,
          cours: coursItem,
        };
      });
    setInscriptions(inscriptionsCompletees);
    setChargement(false);
  }
  const inscriptionsFiltrees = useMemo(() => {
    const texte = recherche
      .trim()
      .toLowerCase();
    return inscriptions.filter(
      (inscription) => {
        const statutCorrespond =
          filtreStatut === "toutes" ||
          inscription.statut === filtreStatut;
        if (!statutCorrespond) {
          return false;
        }
        if (!texte) {
          return true;
        }
        const nomEnfant =
          `${inscription.enfants?.prenom ?? ""} ${
            inscription.enfants?.nom ?? ""
          }`.toLowerCase();
        const nomCours = (
          inscription.cours?.nom ?? ""
        ).toLowerCase();
        const nomGroupe = (
          inscription.groupe?.nom ?? ""
        ).toLowerCase();
        return (
          nomEnfant.includes(texte) ||
          nomCours.includes(texte) ||
          nomGroupe.includes(texte)
        );
      }
    );
  }, [
    inscriptions,
    filtreStatut,
    recherche,
  ]);
  const statistiques = useMemo(() => {
    return {
      total: inscriptions.filter(
        (inscription) =>
          inscription.statut !== "annulee"
      ).length,
      attentePaiement: inscriptions.filter(
        (inscription) =>
          inscription.statut ===
          "en_attente_paiement"
      ).length,
      confirmees: inscriptions.filter(
        (inscription) =>
          inscription.statut === "confirmee"
      ).length,
      listeAttente: inscriptions.filter(
        (inscription) =>
          inscription.statut === "liste_attente"
      ).length,
    };
  }, [inscriptions]);
  function formaterMontant(montant) {
    const valeur = Number(montant ?? 0);
    return new Intl.NumberFormat(
      "fr-CA",
      {
        style: "currency",
        currency: "CAD",
      }
    ).format(valeur);
  }
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
    ).format(new Date(date));
  }
  function obtenirPaiement(inscription) {
    if (
      Array.isArray(inscription.paiements)
    ) {
      return inscription.paiements[0] ?? null;
    }
    return inscription.paiements ?? null;
  }
  function ouvrirConfirmationPaiement(
    inscription
  ) {
    const paiement =
      obtenirPaiement(inscription);
    setInscriptionPaiement(inscription);
    setReferencePaiement(
      paiement?.reference ?? ""
    );
    setErreur("");
  }
  function fermerConfirmationPaiement() {
    if (confirmationEnCours) {
      return;
    }
    setInscriptionPaiement(null);
    setReferencePaiement("");
  }
  function estPremiereEnAttenteDuGroupe(inscription) {
    if (inscription.statut !== "liste_attente") {
      return false;
    }

    const inscriptionsAttenteGroupe = inscriptions
      .filter(
        (item) =>
          item.groupe_id === inscription.groupe_id &&
          item.statut === "liste_attente"
      )
      .sort(
        (a, b) =>
          new Date(a.date_inscription).getTime() -
          new Date(b.date_inscription).getTime()
      );

    return inscriptionsAttenteGroupe[0]?.id === inscription.id;
  }

  function groupeAUnePlaceDisponible(groupeId) {
    const groupe = inscriptions.find(
      (item) => item.groupe_id === groupeId
    )?.groupe;

    if (!groupe) {
      return false;
    }

    const placesOccupees = inscriptions.filter(
      (item) =>
        item.groupe_id === groupeId &&
        (
          item.statut === "en_attente_paiement" ||
          item.statut === "confirmee"
        )
    ).length;

    return placesOccupees < groupe.capacite;
  }

  async function offrirProchainePlace(inscription) {
    if (!inscription?.groupe_id) {
      return;
    }

    const nomGroupe =
      inscription.groupe?.nom ?? "ce groupe";

    const confirmation = window.confirm(
      `Offrir la prochaine place disponible dans ${nomGroupe} ?`
    );

    if (!confirmation) {
      return;
    }

    setErreur("");
    setOffrePlaceEnCours(inscription.groupe_id);

    const { error: erreurOffre } = await supabase.rpc(
      "offrir_prochaine_place",
      {
        p_groupe_id: inscription.groupe_id,
      }
    );

    if (erreurOffre) {
      console.error(erreurOffre);
      setErreur(
        erreurOffre.message ||
          "Impossible d'offrir la prochaine place."
      );
      setOffrePlaceEnCours(null);
      return;
    }

    setOffrePlaceEnCours(null);
    await chargerInscriptions();
  }

  async function annulerInscription(inscription) {
    if (!inscription?.id) {
      return;
    }

    const nomEnfant =
      `${inscription.enfants?.prenom ?? ""} ${
        inscription.enfants?.nom ?? ""
      }`.trim();

    const confirmation = window.confirm(
      `Annuler l'inscription de ${nomEnfant || "cet enfant"} ?`
    );

    if (!confirmation) {
      return;
    }

    const note =
      window.prompt(
        "Note administrative facultative pour cette annulation :",
        ""
      ) ?? "";

    setErreur("");
    setAnnulationEnCours(inscription.id);

    const { error: erreurAnnulation } = await supabase.rpc(
      "annuler_inscription_admin",
      {
        p_inscription_id: inscription.id,
        p_note: note.trim() || null,
      }
    );

    if (erreurAnnulation) {
      console.error(erreurAnnulation);
      setErreur(
        erreurAnnulation.message ||
          "Impossible d'annuler l'inscription."
      );
      setAnnulationEnCours(null);
      return;
    }

    setAnnulationEnCours(null);
    await chargerInscriptions();
  }

  async function marquerPaiementRembourse(inscription) {
    if (!inscription?.id) {
      return;
    }

    const paiement =
      obtenirPaiement(inscription);

    if (!paiement || paiement.statut !== "recu") {
      return;
    }

    const montantParDefaut =
      Number(paiement.montant ?? 0).toFixed(2);

    const montantSaisi = window.prompt(
      "Montant remboursé :",
      montantParDefaut
    );

    if (montantSaisi === null) {
      return;
    }

    const montantRembourse = Number(
      montantSaisi.replace(",", ".")
    );

    if (
      !Number.isFinite(montantRembourse) ||
      montantRembourse <= 0
    ) {
      setErreur(
        "Le montant du remboursement est invalide."
      );
      return;
    }

    const note =
      window.prompt(
        "Note administrative facultative pour ce remboursement :",
        ""
      ) ?? "";

    const nomEnfant =
      `${inscription.enfants?.prenom ?? ""} ${
        inscription.enfants?.nom ?? ""
      }`.trim();

    const confirmation = window.confirm(
      `Confirmer un remboursement de ${formaterMontant(
        montantRembourse
      )} pour ${nomEnfant || "cette inscription"} ?`
    );

    if (!confirmation) {
      return;
    }

    setErreur("");
    setRemboursementEnCours(inscription.id);

    const { error: erreurRemboursement } =
      await supabase.rpc(
        "marquer_paiement_rembourse",
        {
          p_inscription_id: inscription.id,
          p_montant_rembourse:
            montantRembourse,
          p_note: note.trim() || null,
        }
      );

    if (erreurRemboursement) {
      console.error(erreurRemboursement);
      setErreur(
        erreurRemboursement.message ||
          "Impossible de confirmer le remboursement."
      );
      setRemboursementEnCours(null);
      return;
    }

    setRemboursementEnCours(null);
    await chargerInscriptions();
  }

  async function confirmerPaiement() {
    if (!inscriptionPaiement) {
      return;
    }
    setConfirmationEnCours(true);
    setErreur("");
    const reference =
      referencePaiement.trim();
    const {
      error: erreurConfirmation,
    } = await supabase.rpc(
      "confirmer_paiement_recu",
      {
        p_inscription_id:
          inscriptionPaiement.id,
        p_reference:
          reference.length > 0
            ? reference
            : null,
      }
    );
    if (erreurConfirmation) {
      console.error(erreurConfirmation);
      setErreur(
        erreurConfirmation.message ||
          "Impossible de confirmer le paiement."
      );
      setConfirmationEnCours(false);
      return;
    }
    setInscriptionPaiement(null);
    setReferencePaiement("");
    setConfirmationEnCours(false);
    await chargerInscriptions();
  }
  return (
    <section className="gestion-inscriptions">
      <div className="gestion-inscriptions-entete">
        <div>
          <h1>Inscriptions</h1>
          <p>
            Consultez les inscriptions de
            la saison active.
          </p>
        </div>
        <button
          type="button"
          className="admin-bouton admin-bouton-secondaire"
          onClick={chargerInscriptions}
          disabled={chargement}
        >
          Actualiser
        </button>
      </div>
      {erreur && (
        <div className="gestion-inscriptions-erreur">
          {erreur}
        </div>
      )}
      {!chargement &&
        !saisonActive && (
          <div className="gestion-inscriptions-vide">
            <h2>
              Aucune saison active
            </h2>
            <p>
              Activez une saison avant de
              gérer les inscriptions.
            </p>
          </div>
        )}
      {saisonActive && (
        <>
          <div className="gestion-inscriptions-saison">
            <span>
              Saison active
            </span>
            <strong>
              {saisonActive.nom}
            </strong>
          </div>
          <div className="gestion-inscriptions-statistiques">
            <div className="gestion-inscriptions-stat">
              <span>
                Inscriptions
              </span>
              <strong>
                {statistiques.total}
              </strong>
            </div>
            <div className="gestion-inscriptions-stat">
              <span>
                À payer
              </span>
              <strong>
                {
                  statistiques.attentePaiement
                }
              </strong>
            </div>
            <div className="gestion-inscriptions-stat">
              <span>
                Confirmées
              </span>
              <strong>
                {statistiques.confirmees}
              </strong>
            </div>
            <div className="gestion-inscriptions-stat">
              <span>
                Liste d'attente
              </span>
              <strong>
                {statistiques.listeAttente}
              </strong>
            </div>
          </div>
          <div className="gestion-inscriptions-filtres">
            <input
              type="search"
              value={recherche}
              placeholder="Rechercher un enfant, cours ou groupe..."
              onChange={(event) =>
                setRecherche(
                  event.target.value
                )
              }
            />
            <select
              value={filtreStatut}
              onChange={(event) =>
                setFiltreStatut(
                  event.target.value
                )
              }
            >
              <option value="toutes">
                Toutes les inscriptions
              </option>
              <option value="en_attente_paiement">
                En attente de paiement
              </option>
              <option value="confirmee">
                Confirmées
              </option>
              <option value="liste_attente">
                Liste d'attente
              </option>
              <option value="annulee">
                Annulées
              </option>
            </select>
          </div>
          {chargement ? (
            <div className="gestion-inscriptions-vide">
              Chargement...
            </div>
          ) : inscriptionsFiltrees.length ===
            0 ? (
            <div className="gestion-inscriptions-vide">
              <h2>
                Aucune inscription
              </h2>
              <p>
                Aucune inscription ne
                correspond aux critères.
              </p>
            </div>
          ) : (
            <div className="gestion-inscriptions-table-conteneur">
              <table className="gestion-inscriptions-table">
                <thead>
                  <tr>
                    <th>Enfant</th>
                    <th>Activité</th>
                    <th>Groupe</th>
                    <th>Inscription</th>
                    <th>Montant</th>
                    <th>Paiement</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptionsFiltrees.map(
                    (inscription) => {
                      const paiement =
                        obtenirPaiement(
                          inscription
                        );
                      return (
                        <tr
                          key={
                            inscription.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                inscription
                                  .enfants
                                  ?.prenom
                              }{" "}
                              {
                                inscription
                                  .enfants
                                  ?.nom
                              }
                            </strong>
                          </td>
                          <td>
                            {inscription
                              .cours?.nom ??
                              "—"}
                          </td>
                          <td>
                            {inscription
                              .groupe?.nom ??
                              "—"}
                          </td>
                          <td>
                            <span
                              className={`gestion-inscriptions-statut statut-${inscription.statut}`}
                            >
                              {
                                LIBELLES_STATUT[
                                  inscription
                                    .statut
                                ] ??
                                inscription.statut
                              }
                            </span>
                          </td>
                          <td>
                            {formaterMontant(
                              inscription
                                .prix_facture
                            )}
                          </td>
                          <td>
                            {paiement ? (
                              <div className="gestion-inscriptions-paiement">
                                <span
                                  className={`gestion-inscriptions-statut paiement-${paiement.statut}`}
                                >
                                  {
                                    LIBELLES_PAIEMENT[
                                      paiement
                                        .statut
                                    ] ??
                                    paiement.statut
                                  }
                                </span>
                                {paiement.reference && (
                                  <small>
                                    {
                                      paiement.reference
                                    }
                                  </small>
                                )}

                                {paiement.statut ===
                                  "rembourse" &&
                                  paiement.montant_rembourse != null && (
                                    <small>
                                      Remboursé :{" "}
                                      {formaterMontant(
                                        paiement.montant_rembourse
                                      )}
                                    </small>
                                  )}
                              </div>
                            ) : inscription.statut ===
                              "liste_attente" ? (
                              <span className="gestion-inscriptions-pas-paiement">
                                Aucun paiement
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            {formaterDate(
                              inscription
                                .date_inscription
                            )}
                          </td>
                          <td>
                            <div className="gestion-inscriptions-actions">
                              {inscription.statut ===
                                "en_attente_paiement" &&
                              paiement?.statut ===
                                "a_recevoir" && (
                                <button
                                  type="button"
                                  className="admin-bouton admin-bouton-primaire"
                                  onClick={() =>
                                    ouvrirConfirmationPaiement(
                                      inscription
                                    )
                                  }
                                >
                                  Confirmer le paiement
                                </button>
                              )}

                              {inscription.statut ===
                                "liste_attente" &&
                                estPremiereEnAttenteDuGroupe(
                                  inscription
                                ) && (
                                  <button
                                    type="button"
                                    className="admin-bouton admin-bouton-primaire"
                                    onClick={() =>
                                      offrirProchainePlace(
                                        inscription
                                      )
                                    }
                                    disabled={
                                      offrePlaceEnCours ===
                                        inscription.groupe_id ||
                                      !groupeAUnePlaceDisponible(
                                        inscription.groupe_id
                                      )
                                    }
                                    title={
                                      groupeAUnePlaceDisponible(
                                        inscription.groupe_id
                                      )
                                        ? "Offrir la prochaine place de la liste d'attente"
                                        : "Aucune place disponible dans ce groupe"
                                    }
                                  >
                                    {offrePlaceEnCours ===
                                    inscription.groupe_id
                                      ? "Offre en cours..."
                                      : groupeAUnePlaceDisponible(
                                          inscription.groupe_id
                                        )
                                      ? "Offrir la prochaine place"
                                      : "Groupe complet"}
                                  </button>
                                )}

                              {inscription.statut !== "annulee" && (
                                <button
                                  type="button"
                                  className="admin-bouton admin-bouton-secondaire"
                                  onClick={() =>
                                    annulerInscription(inscription)
                                  }
                                  disabled={
                                    annulationEnCours ===
                                    inscription.id
                                  }
                                >
                                  {annulationEnCours ===
                                  inscription.id
                                    ? "Annulation..."
                                    : "Annuler l'inscription"}
                                </button>
                              )}

                              {inscription.statut ===
                                "annulee" &&
                                paiement?.statut ===
                                  "recu" && (
                                  <button
                                    type="button"
                                    className="admin-bouton admin-bouton-primaire"
                                    onClick={() =>
                                      marquerPaiementRembourse(
                                        inscription
                                      )
                                    }
                                    disabled={
                                      remboursementEnCours ===
                                      inscription.id
                                    }
                                  >
                                    {remboursementEnCours ===
                                    inscription.id
                                      ? "Remboursement..."
                                      : "Marquer remboursé"}
                                  </button>
                                )}

                              {inscription.statut ===
                                "annulee" &&
                                paiement?.statut !==
                                  "recu" && (
                                  <span className="gestion-inscriptions-pas-action">
                                    —
                                  </span>
                                )}
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
        </>
      )}
      {inscriptionPaiement && (
        <div
          className="gestion-inscriptions-modal-fond"
          onMouseDown={
            fermerConfirmationPaiement
          }
        >
          <div
            className="gestion-inscriptions-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2>
              Confirmer le paiement
            </h2>
            <p>
              Confirmer le paiement reçu
              pour{" "}
              <strong>
                {
                  inscriptionPaiement
                    .enfants?.prenom
                }{" "}
                {
                  inscriptionPaiement
                    .enfants?.nom
                }
              </strong>
              .
            </p>
            <div className="gestion-inscriptions-modal-info">
              <span>
                {
                  inscriptionPaiement
                    .cours?.nom
                }
              </span>
              <span>
                {
                  inscriptionPaiement
                    .groupe?.nom
                }
              </span>
              <strong>
                {formaterMontant(
                  inscriptionPaiement
                    .prix_facture
                )}
              </strong>
            </div>
            <label className="gestion-inscriptions-champ">
              <span>
                Référence Interac
                facultative
              </span>
              <input
                type="text"
                value={referencePaiement}
                onChange={(event) =>
                  setReferencePaiement(
                    event.target.value
                  )
                }
                placeholder="Ex. INS-2026-0042"
                disabled={
                  confirmationEnCours
                }
              />
            </label>
            <div className="gestion-inscriptions-modal-actions">
              <button
                type="button"
                className="admin-bouton admin-bouton-secondaire"
                onClick={
                  fermerConfirmationPaiement
                }
                disabled={
                  confirmationEnCours
                }
              >
                Annuler
              </button>
              <button
                type="button"
                className="admin-bouton admin-bouton-primaire"
                onClick={confirmerPaiement}
                disabled={
                  confirmationEnCours
                }
              >
                {confirmationEnCours
                  ? "Confirmation..."
                  : "Confirmer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
export default GestionInscriptions;
