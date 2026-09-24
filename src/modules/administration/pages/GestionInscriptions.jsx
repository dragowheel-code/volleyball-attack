import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionInscriptions.css";
const LIBELLES_STATUT = {
  en_attente_validation: "En attente de validation",
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
  const [validationEnCours, setValidationEnCours] =
    useState(null);
  const [inscriptionTransfert, setInscriptionTransfert] = useState(null);
  const [groupesTransfert, setGroupesTransfert] = useState([]);
  const [groupeDestinationId, setGroupeDestinationId] = useState("");
  const [previsualisationTransfert, setPrevisualisationTransfert] = useState(null);
  const [chargementTransfert, setChargementTransfert] = useState(false);
  const [transfertEnCours, setTransfertEnCours] = useState(false);
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
        nombre_versements,
        montant_rembourse,
        date_remboursement,
        note_remboursement,
        enfants (
          id,
          prenom,
          nom
        ),
        paiements (
          id,
          numero_versement,
          statut,
          montant,
          reference,
          date_paiement
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
    const { data: inscriptionsAbsorbees, error: erreurInscriptionsAbsorbees } =
  await supabase
    .from("fusions_groupes_inscriptions")
    .select("inscription_absorbee_id")
    .in(
      "inscription_absorbee_id",
      (data ?? []).map((inscription) => inscription.id)
    );

if (erreurInscriptionsAbsorbees) {
  console.error(erreurInscriptionsAbsorbees);
  setErreur(
    "Impossible de vérifier les inscriptions absorbées lors des fusions."
  );
  setChargement(false);
  return;
}

const idsInscriptionsAbsorbees = new Set(
  (inscriptionsAbsorbees ?? []).map(
    (element) => element.inscription_absorbee_id
  )
);
    const inscriptionsCompletees = await Promise.all(
  (data ?? []).map(async (inscription) => {
    const groupe = groupesParId.get(
      inscription.groupe_id
    );

    const coursItem = groupe
      ? coursParId.get(groupe.cours_id)
      : null;

    const {
      data: situationPaiement,
      error: erreurSituationPaiement,
    } = await supabase.rpc(
      "calculer_paiement_inscription",
      {
        p_inscription_id: inscription.id,
      }
    );

    if (erreurSituationPaiement) {
      console.error(
        "Impossible de calculer la situation financière :",
        erreurSituationPaiement
      );
    }

    const situationFinanciere =
      situationPaiement?.[0] ?? null;

    return {
      ...inscription,
      groupe,
      cours: coursItem,
      situationFinanciere,
      estAbsorbee: idsInscriptionsAbsorbees.has(inscription.id),
    };
  })
);

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
      attenteValidation: inscriptions.filter(
        (inscription) =>
          inscription.statut === "en_attente_validation"
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
  function obtenirPaiements(inscription) {
    const paiements = Array.isArray(inscription.paiements)
      ? inscription.paiements
      : inscription.paiements
      ? [inscription.paiements]
      : [];
    return [...paiements].sort(
      (a, b) =>
        Number(a.numero_versement ?? 1) -
        Number(b.numero_versement ?? 1)
    );
  }
  function obtenirProchainPaiement(inscription) {
    return (
      obtenirPaiements(inscription).find(
        (paiement) => paiement.statut === "a_recevoir"
      ) ?? null
    );
  }
  function obtenirMontantRecu(inscription) {
    return obtenirPaiements(inscription).reduce(
      (total, paiement) =>
        paiement.statut === "recu"
          ? total + Number(paiement.montant ?? 0)
          : total,
      0
    );
  }
  function ouvrirConfirmationPaiement(inscription) {
    const paiement = obtenirProchainPaiement(inscription);
    if (!paiement) {
      return;
    }
    setInscriptionPaiement({
      ...inscription,
      paiementAConfirmer: paiement,
    });
    setReferencePaiement(paiement.reference ?? "");
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
      .sort((a, b) => {
  const differenceDate =
    new Date(a.date_inscription).getTime() -
    new Date(b.date_inscription).getTime();

  if (differenceDate !== 0) {
    return differenceDate;
  }

  return a.id.localeCompare(b.id);
});
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
  async function validerInscriptionConditionnelle(inscription, accepter) {
    if (!inscription?.id) {
      return;
    }
    const nomEnfant = `${inscription.enfants?.prenom ?? ""} ${
      inscription.enfants?.nom ?? ""
    }`.trim();
    const message = accepter
      ? `Accepter l'inscription conditionnelle de ${nomEnfant || "cet enfant"} ? Si le groupe est complet, l'inscription sera placée sur la liste d'attente.`
      : `Refuser l'inscription conditionnelle de ${nomEnfant || "cet enfant"} ?`;
    if (!window.confirm(message)) {
      return;
    }
    setErreur("");
    setValidationEnCours(inscription.id);
    const { error: erreurValidation } = await supabase.rpc(
      "valider_inscription_conditionnelle",
      {
        p_inscription_id: inscription.id,
        p_accepter: accepter,
      }
    );
    if (erreurValidation) {
      console.error(erreurValidation);
      setErreur(
        erreurValidation.message ||
          "Impossible de traiter cette inscription conditionnelle."
      );
      setValidationEnCours(null);
      return;
    }
    if (accepter) {
  const { error: erreurCourriel } =
    await supabase.functions.invoke(
      "envoyer-courriel-inscription",
      {
        body: {
          inscription_id: inscription.id,
          origine: "validation_conditionnelle",
        },
      }
    );

  if (erreurCourriel) {
    console.error(
      "L'inscription conditionnelle a été acceptée, mais le courriel n'a pas pu être envoyé :",
      erreurCourriel
    );

    setErreur(
      "L'inscription a été acceptée, mais le courriel de confirmation n'a pas pu être envoyé."
    );
  }
}
    setValidationEnCours(null);
    await chargerInscriptions();
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
    const montantRecu = Number(
  inscription.situationFinanciere?.montant_recu ?? 0
);
    if (montantRecu <= 0) {
      return;
    }
    const montantParDefaut = (
  inscription.statut === "annulee"
    ? montantRecu
    : Number(
        inscription.situationFinanciere?.montant_a_rembourser ?? 0
      )
).toFixed(2);
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
    if (
      inscription.statut !== "annulee" &&
      montantRembourse >
      Number(
      inscription.situationFinanciere?.montant_a_rembourser ?? 0
      )
    ) {
      setErreur(
        "Le remboursement ne peut pas dépasser le trop-perçu."
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
  async function ouvrirTransfert(inscription) {
    if (!inscription?.id || !saisonActive?.id) {
      return;
    }

    setErreur("");
    setInscriptionTransfert(inscription);
    setGroupesTransfert([]);
    setGroupeDestinationId("");
    setPrevisualisationTransfert(null);
    setChargementTransfert(true);

    const { data: coursDestination, error: erreurCoursDestination } =
      await supabase
        .from("cours")
        .select("id, nom")
        .eq("saison_id", saisonActive.id)
        .eq("actif", true)
        .order("nom", { ascending: true });

    if (erreurCoursDestination) {
      console.error(erreurCoursDestination);
      setErreur("Impossible de charger les cours de destination.");
      setChargementTransfert(false);
      return;
    }

    const idsCoursDestination = (coursDestination ?? []).map(
      (coursItem) => coursItem.id
    );

    if (idsCoursDestination.length === 0) {
      setChargementTransfert(false);
      return;
    }

    const { data: groupesDestination, error: erreurGroupesDestination } =
      await supabase
        .from("groupes")
        .select("id, nom, capacite, ordre, cours_id, actif, fusionne_vers_id")
        .in("cours_id", idsCoursDestination)
        .eq("actif", true)
        .is("fusionne_vers_id", null)
        .order("ordre", { ascending: true });

    if (erreurGroupesDestination) {
      console.error(erreurGroupesDestination);
      setErreur("Impossible de charger les groupes de destination.");
      setChargementTransfert(false);
      return;
    }

    const coursParId = new Map(
      (coursDestination ?? []).map((coursItem) => [coursItem.id, coursItem])
    );

    const destinations = (groupesDestination ?? [])
      .filter((groupe) => groupe.id !== inscription.groupe_id)
      .map((groupe) => ({
        ...groupe,
        cours: coursParId.get(groupe.cours_id) ?? null,
      }))
      .sort((a, b) => {
        const comparaisonCours = (a.cours?.nom ?? "").localeCompare(
          b.cours?.nom ?? "",
          "fr"
        );
        if (comparaisonCours !== 0) {
          return comparaisonCours;
        }
        return (a.nom ?? "").localeCompare(b.nom ?? "", "fr");
      });

    setGroupesTransfert(destinations);
    setChargementTransfert(false);
  }

  function fermerTransfert() {
    if (chargementTransfert || transfertEnCours) {
      return;
    }
    setInscriptionTransfert(null);
    setGroupesTransfert([]);
    setGroupeDestinationId("");
    setPrevisualisationTransfert(null);
  }

  async function previsualiserTransfert() {
    if (!inscriptionTransfert?.id || !groupeDestinationId) {
      return;
    }

    setErreur("");
    setPrevisualisationTransfert(null);
    setChargementTransfert(true);

    const { data, error: erreurPrevisualisation } = await supabase.rpc(
      "previsualiser_transfert_inscription_admin",
      {
        p_inscription_id: inscriptionTransfert.id,
        p_groupe_destination_id: groupeDestinationId,
      }
    );

    if (erreurPrevisualisation) {
      console.error(erreurPrevisualisation);
      setErreur(
        erreurPrevisualisation.message ||
          "Impossible de prévisualiser le transfert."
      );
      setChargementTransfert(false);
      return;
    }

    setPrevisualisationTransfert(data?.[0] ?? null);
    setChargementTransfert(false);
  }

  async function confirmerTransfert() {
    if (
      !inscriptionTransfert?.id ||
      !groupeDestinationId ||
      !previsualisationTransfert ||
      transfertEnCours
    ) {
      return;
    }

    const nomEnfant = `${inscriptionTransfert.enfants?.prenom ?? ""} ${
      inscriptionTransfert.enfants?.nom ?? ""
    }`.trim();

    const difference = Number(
      previsualisationTransfert.difference_prix ?? 0
    );

    let incidenceFinanciere = "Aucune différence de prix.";

    if (difference > 0) {
      incidenceFinanciere = `${formaterMontant(
        difference
      )} supplémentaires seront à facturer selon la situation financière de l'inscription.`;
    } else if (difference < 0) {
      incidenceFinanciere = `Le nouveau cours coûte ${formaterMontant(
        Math.abs(difference)
      )} de moins. Un remboursement pourra être requis selon les montants déjà reçus.`;
    }

    const confirmation = window.confirm(
      `Confirmer le transfert de ${nomEnfant || "cet enfant"} ?\n\n` +
        `${previsualisationTransfert.cours_source_nom} — ${
          previsualisationTransfert.groupe_source_nom
        }\n→ ${previsualisationTransfert.cours_destination_nom} — ${
          previsualisationTransfert.groupe_destination_nom
        }\n\n${incidenceFinanciere}`
    );

    if (!confirmation) {
      return;
    }

    setErreur("");
    setTransfertEnCours(true);

    const { error: erreurTransfert } = await supabase.rpc(
      "transferer_inscription_groupe_admin",
      {
        p_inscription_id: inscriptionTransfert.id,
        p_groupe_destination_id: groupeDestinationId,
        p_note: null,
      }
    );

    if (erreurTransfert) {
      console.error(erreurTransfert);
      setErreur(
        erreurTransfert.message ||
          "Impossible d'effectuer le transfert."
      );
      setTransfertEnCours(false);
      return;
    }

    setTransfertEnCours(false);
    setInscriptionTransfert(null);
    setGroupesTransfert([]);
    setGroupeDestinationId("");
    setPrevisualisationTransfert(null);
    await chargerInscriptions();
  }

  async function confirmerPaiement() {
    if (!inscriptionPaiement) {
      return;
    }
    setConfirmationEnCours(true);
    setErreur("");
    const reference = referencePaiement.trim();
    const numeroVersement = Number(
      inscriptionPaiement.paiementAConfirmer?.numero_versement ?? 1
    );
    const { error: erreurConfirmation } = await supabase.rpc(
      "confirmer_paiement_recu",
      {
        p_inscription_id: inscriptionPaiement.id,
        p_numero_versement: numeroVersement,
        p_reference: reference.length > 0 ? reference : null,
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
    const { error: erreurCourriel } = await supabase.functions.invoke(
      "envoyer-courriel-paiement",
      {
        body: {
          inscription_id: inscriptionPaiement.id,
          numero_versement: numeroVersement,
        },
      }
    );
    if (erreurCourriel) {
      console.error(
        "Le paiement a été enregistré, mais le courriel n'a pas pu être envoyé :",
        erreurCourriel
      );
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
                À valider
              </span>
              <strong>
                {statistiques.attenteValidation}
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
              <option value="en_attente_validation">
                En attente de validation
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
                      const paiements = obtenirPaiements(inscription);
                      const paiementARecevoir =
                        obtenirProchainPaiement(inscription);
                      const montantRecu =
                        obtenirMontantRecu(inscription);
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
                            {paiements.length > 0 ? (
                              <div className="gestion-inscriptions-paiement">
                                {paiements.map((paiement) => (
                                  <div
                                    key={paiement.id}
                                    className="gestion-inscriptions-paiement-ligne"
                                  >
                                    <span>
                                      Versement {paiement.numero_versement ?? 1}/
                                      {inscription.nombre_versements ?? paiements.length}
                                    </span>
                                    <span
                                      className={`gestion-inscriptions-statut paiement-${paiement.statut}`}
                                    >
                                      {LIBELLES_PAIEMENT[paiement.statut] ??
                                        paiement.statut}
                                    </span>
                                    <small>
                                      {formaterMontant(paiement.montant)}
                                      {paiement.reference
                                        ? ` — ${paiement.reference}`
                                        : ""}
                                    </small>
                                  </div>
                                ))}
                                {Number(inscription.montant_rembourse ?? 0) > 0 && (
                                  <small>
                                    Remboursé :{" "}
                                    {formaterMontant(
                                      inscription.montant_rembourse
                                    )}
                                  </small>
                                )}
                              </div>
                            ) : inscription.statut === "liste_attente" ||
                              inscription.statut === "en_attente_validation" ? (
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
                              {inscription.statut === "en_attente_validation" && (
                                <>
                                  <button
                                    type="button"
                                    className="admin-bouton admin-bouton-primaire"
                                    onClick={() =>
                                      validerInscriptionConditionnelle(
                                        inscription,
                                        true
                                      )
                                    }
                                    disabled={validationEnCours === inscription.id}
                                  >
                                    {validationEnCours === inscription.id
                                      ? "Traitement..."
                                      : "Accepter"}
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-bouton admin-bouton-secondaire"
                                    onClick={() =>
                                      validerInscriptionConditionnelle(
                                        inscription,
                                        false
                                      )
                                    }
                                    disabled={validationEnCours === inscription.id}
                                  >
                                    Refuser
                                  </button>
                                </>
                              )}
                              
                              {inscription.statut !== "annulee" &&
                              inscription.statut !== "liste_attente" &&
                              paiementARecevoir &&
Number(
  inscription.situationFinanciere?.solde_a_recevoir ?? 0
) > 0 &&
Number(
  inscription.situationFinanciere?.montant_a_rembourser ?? 0
) <= 0 && (
                                <button
                                  type="button"
                                  className="admin-bouton admin-bouton-primaire"
                                  onClick={() =>
                                    ouvrirConfirmationPaiement(inscription)
                                  }
                                >
                                  Confirmer versement{" "}
                                  {paiementARecevoir.numero_versement ?? 1}/
                                  {inscription.nombre_versements ?? paiements.length}
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
                              {inscription.statut !== "annulee" &&
                              inscription.statut !== "en_attente_validation" &&
                              !inscription.estAbsorbee && (
                                <button
                                  type="button"
                                  className="admin-bouton admin-bouton-secondaire"
                                  onClick={() => ouvrirTransfert(inscription)}
                                >
                                  Transférer
                                </button>
                              )}
                              {inscription.statut !== "annulee" &&
                              inscription.statut !== "en_attente_validation" && (
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
                              {!inscription.estAbsorbee && (
  Number(
    inscription.situationFinanciere?.montant_a_rembourser ?? 0
  ) > 0 ||
  (
    inscription.statut === "annulee" &&
    Number(
      inscription.situationFinanciere?.montant_recu ?? 0
    ) > 0
  )
) && (
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
(inscription.estAbsorbee ||
                              (montantRecu <= 0 ||
                                Number(inscription.montant_rembourse ?? 0) >=
                                  montantRecu)) && (
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
      {inscriptionTransfert && (
        <div
          className="gestion-inscriptions-modal-fond"
          onMouseDown={fermerTransfert}
        >
          <div
            className="gestion-inscriptions-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>Transférer l'inscription</h2>
            <p>
              Choisissez le nouveau groupe pour{" "}
              <strong>
                {inscriptionTransfert.enfants?.prenom}{" "}
                {inscriptionTransfert.enfants?.nom}
              </strong>
              .
            </p>
            <div className="gestion-inscriptions-modal-info">
              <span>{inscriptionTransfert.cours?.nom ?? "—"}</span>
              <span>{inscriptionTransfert.groupe?.nom ?? "—"}</span>
              <strong>
                Prix actuel : {formaterMontant(inscriptionTransfert.prix_facture)}
              </strong>
            </div>
            <label className="gestion-inscriptions-champ">
              <span>Groupe destination</span>
              <select
                value={groupeDestinationId}
                onChange={(event) => {
                  setGroupeDestinationId(event.target.value);
                  setPrevisualisationTransfert(null);
                }}
                disabled={chargementTransfert}
              >
                <option value="">Sélectionner un groupe</option>
                {groupesTransfert.map((groupe) => (
                  <option key={groupe.id} value={groupe.id}>
                    {groupe.cours?.nom ?? "Cours"} — {groupe.nom}
                  </option>
                ))}
              </select>
            </label>
            {!chargementTransfert && groupesTransfert.length === 0 && (
              <p>Aucun autre groupe actif n'est disponible dans cette saison.</p>
            )}
            {previsualisationTransfert && (
              <div className="gestion-inscriptions-modal-info">
                <strong>
                  {previsualisationTransfert.cours_source_nom} —{" "}
                  {previsualisationTransfert.groupe_source_nom}
                </strong>
                <span>↓</span>
                <strong>
                  {previsualisationTransfert.cours_destination_nom} —{" "}
                  {previsualisationTransfert.groupe_destination_nom}
                </strong>
                <span>
                  Prix : {formaterMontant(previsualisationTransfert.prix_avant)} →{" "}
                  {formaterMontant(previsualisationTransfert.prix_apres)}
                </span>
                <span>
                  Différence :{" "}
                  {formaterMontant(previsualisationTransfert.difference_prix)}
                </span>
                <span>
                  Occupation actuelle :{" "}
                  {previsualisationTransfert.places_occupees_destination}/
                  {previsualisationTransfert.capacite_destination}
                </span>
                {previsualisationTransfert.depasse_capacite && (
                  <strong>⚠ Le transfert dépassera la capacité du groupe.</strong>
                )}
                {previsualisationTransfert.avertissement_sexe && (
                  <strong>⚠ Le sexe ne correspond pas aux critères habituels.</strong>
                )}
                {previsualisationTransfert.avertissement_annee_scolaire && (
                  <strong>
                    ⚠ L'année scolaire ne correspond pas aux critères habituels.
                  </strong>
                )}
                {previsualisationTransfert.avertissement_niveau && (
                  <strong>
                    ⚠ Le niveau de volleyball ne correspond pas aux critères habituels.
                  </strong>
                )}
              </div>
            )}
            <div className="gestion-inscriptions-modal-actions">
              <button
                type="button"
                className="admin-bouton admin-bouton-secondaire"
                onClick={fermerTransfert}
                disabled={chargementTransfert || transfertEnCours}
              >
                Fermer
              </button>
              {!previsualisationTransfert ? (
                <button
                  type="button"
                  className="admin-bouton admin-bouton-primaire"
                  onClick={previsualiserTransfert}
                  disabled={!groupeDestinationId || chargementTransfert}
                >
                  {chargementTransfert ? "Chargement..." : "Prévisualiser"}
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-bouton admin-bouton-primaire"
                  onClick={confirmerTransfert}
                  disabled={transfertEnCours}
                >
                  {transfertEnCours
                    ? "Transfert en cours..."
                    : "Confirmer le transfert"}
                </button>
              )}
            </div>
          </div>
        </div>
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
                Versement{" "}
                {inscriptionPaiement.paiementAConfirmer?.numero_versement ?? 1}/
                {inscriptionPaiement.nombre_versements ?? 1} —{" "}
                {formaterMontant(
                  inscriptionPaiement.paiementAConfirmer?.montant
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
