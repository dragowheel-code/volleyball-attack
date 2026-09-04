import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionFamilles.css";

function formaterDate(valeur) {
  if (!valeur) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(valeur));
}

function GestionFamilles() {
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState("toutes");
  const [familleSelectionnee, setFamilleSelectionnee] = useState(null);
  const [chargementDossier, setChargementDossier] = useState(false);
  const [verificationPurge, setVerificationPurge] = useState(null);
  const [purgeEnCours, setPurgeEnCours] = useState(false);
  const [confirmationPurge, setConfirmationPurge] = useState(false);

  const chargerFamilles = useCallback(async () => {
    setChargement(true);
    setErreur("");

    const { data, error } = await supabase.rpc(
      "lister_familles_admin"
    );

    if (error) {
      console.error("Erreur chargement familles :", error);
      setErreur(error.message);
      setFamilles([]);
      setChargement(false);
      return;
    }

    setFamilles(data ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
  let actif = true;

  async function charger() {
    const { data, error } = await supabase.rpc(
      "lister_familles_admin"
    );

    if (!actif) {
      return;
    }

    if (error) {
      console.error("Erreur chargement familles :", error);
      setErreur(error.message);
      setFamilles([]);
      setChargement(false);
      return;
    }

    setFamilles(data ?? []);
    setChargement(false);
  }

  charger();

  return () => {
    actif = false;
  };
}, []);

  const famillesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    return familles.filter((famille) => {
      if (
        filtre === "inactives" &&
        !famille.inactive_depuis_3_ans
      ) {
        return false;
      }

      if (
        filtre === "actives" &&
        famille.inactive_depuis_3_ans
      ) {
        return false;
      }

      if (!terme) {
        return true;
      }

      return String(famille.famille_id)
        .toLowerCase()
        .includes(terme);
    });
  }, [familles, recherche, filtre]);

  async function ouvrirFamille(familleId) {
  setChargementDossier(true);
  setErreur("");
  setVerificationPurge(null);

  const [
    { data: dossier, error: erreurDossier },
    { data: verification, error: erreurVerification },
  ] = await Promise.all([
    supabase.rpc("lire_famille_admin", {
      p_famille_id: familleId,
    }),
    supabase.rpc("verifier_purge_famille", {
      p_famille_id: familleId,
    }),
  ]);

  if (erreurDossier) {
    console.error("Erreur lecture famille :", erreurDossier);
    setErreur(erreurDossier.message);
    setChargementDossier(false);
    return;
  }

  if (erreurVerification) {
    console.error(
      "Erreur vérification purge :",
      erreurVerification
    );
    setErreur(erreurVerification.message);
    setChargementDossier(false);
    return;
  }

  setFamilleSelectionnee(dossier);
  setVerificationPurge(verification);
  setChargementDossier(false);
}

async function purgerFamille() {
  if (
    !familleSelectionnee?.id ||
    !verificationPurge?.admissible_purge
  ) {
    return;
  }

  setPurgeEnCours(true);
  setErreur("");

  const { data, error } = await supabase.functions.invoke(
    "purger-famille",
    {
      body: {
        famille_id: familleSelectionnee.id,
      },
    }
  );

  if (error) {
    console.error("Erreur purge famille :", error);
    setErreur(error.message);
    setPurgeEnCours(false);
    return;
  }

  if (!data?.success) {
    setErreur(
      data?.error ||
        "La purge de la famille n'a pas pu être effectuée."
    );
    setPurgeEnCours(false);
    return;
  }

  setFamilleSelectionnee(null);
  setVerificationPurge(null);
  setConfirmationPurge(false);
  setPurgeEnCours(false);

  await chargerFamilles();
}

  if (chargement) {
    return (
      <section className="gestion-familles">
        <h1>Familles</h1>
        <p>Chargement des familles...</p>
      </section>
    );
  }

  return (
    <section className="gestion-familles">
      <div className="familles-entete">
        <div>
          <h1>Familles</h1>
          <p>
            Consultez les familles enregistrées et leur activité
            d'inscription.
          </p>
        </div>

        <button
          type="button"
          className="admin-bouton admin-bouton-secondaire"
          onClick={chargerFamilles}
        >
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="familles-erreur">
          Impossible de charger les familles : {erreur}
        </div>
      )}

      <div className="familles-outils">
        <input
          type="search"
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder="Rechercher une famille..."
          className="familles-recherche"
        />

        <select
          value={filtre}
          onChange={(event) => setFiltre(event.target.value)}
          className="familles-filtre"
        >
          <option value="toutes">Toutes les familles</option>
          <option value="actives">Actives</option>
          <option value="inactives">
            Inactives depuis 3 ans
          </option>
        </select>
      </div>

      <div className="familles-resume">
        <strong>{famillesFiltrees.length}</strong>{" "}
        {famillesFiltrees.length > 1 ? "familles" : "famille"}
      </div>

      {famillesFiltrees.length === 0 ? (
        <div className="familles-vide">
          {familles.length === 0
            ? "Aucune famille n'est enregistrée pour le moment."
            : "Aucune famille ne correspond aux critères sélectionnés."}
        </div>
      ) : (
        <div className="familles-table-conteneur">
          <table className="familles-table">
            <thead>
              <tr>
                <th>Famille</th>
                <th>Parents</th>
                <th>Enfants</th>
                <th>Inscriptions</th>
                <th>Dernière activité</th>
                <th>Conservation</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {famillesFiltrees.map((famille, index) => (
                <tr key={famille.famille_id}>
                  <td>
                    <strong>Famille {index + 1}</strong>
                  </td>

                  <td>{famille.nombre_parents}</td>

                  <td>{famille.nombre_enfants}</td>

                  <td>{famille.nombre_inscriptions}</td>

                  <td>
                    {formaterDate(
                      famille.date_reference_activite
                    )}
                  </td>

                  <td>
                    {famille.inactive_depuis_3_ans ? (
                      <span className="familles-statut familles-statut-purge">
                        Purge admissible
                      </span>
                    ) : (
                      <span className="familles-statut familles-statut-active">
                        Conservée
                      </span>
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="admin-bouton admin-bouton-secondaire"
                      onClick={() => ouvrirFamille(famille.famille_id)}
                      disabled={chargementDossier}
                      > 
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {familleSelectionnee && (
  <div className="familles-dossier">
    <div className="familles-dossier-entete">
      <div>
        <h2>Dossier familial</h2>
        <p>
          Famille créée le{" "}
          {formaterDate(familleSelectionnee.date_creation)}
        </p>
      </div>

      <button
  type="button"
  className="admin-bouton admin-bouton-secondaire"
  onClick={() => {
    setFamilleSelectionnee(null);
    setVerificationPurge(null);
    setConfirmationPurge(false);
  }}
>
  Fermer
</button>
    </div>

    <div className="familles-dossier-section">
      <h3>Parents</h3>

      {familleSelectionnee.parents?.length ? (
        familleSelectionnee.parents.map((parent) => (
          <div key={parent.id} className="familles-dossier-carte">
            <strong>
              {parent.prenom} {parent.nom}
            </strong>

            <p>
              Téléphone : {parent.telephone || "—"}
            </p>

            <p>
              Adresse :{" "}
              {[
                parent.adresse,
                parent.ville,
                parent.code_postal,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            </p>
          </div>
        ))
      ) : (
        <p>Aucun parent.</p>
      )}
    </div>

    <div className="familles-dossier-section">
      <h3>Enfants</h3>

      {familleSelectionnee.enfants?.length ? (
        familleSelectionnee.enfants.map((enfant) => (
          <div key={enfant.id} className="familles-dossier-carte">
            <strong>
              {enfant.prenom} {enfant.nom}
            </strong>

            <p>
              Date de naissance :{" "}
              {formaterDate(enfant.date_naissance)}
            </p>

            <p>Sexe : {enfant.sexe || "—"}</p>

            <p>
              Allergies : {enfant.allergies || "Aucune"}
            </p>

            <p>
              Problèmes de santé :{" "}
              {enfant.problemes_sante || "Aucun"}
            </p>
          </div>
        ))
      ) : (
        <p>Aucun enfant.</p>
      )}
    </div>

    <div className="familles-dossier-section">
      <h3>Contacts d'urgence</h3>

      {familleSelectionnee.contacts_urgence?.length ? (
        familleSelectionnee.contacts_urgence.map((contact) => (
          <div key={contact.id} className="familles-dossier-carte">
            <strong>
              {contact.prenom} {contact.nom}
            </strong>

            <p>Lien : {contact.lien || "—"}</p>

            <p>
              Téléphone : {contact.telephone || "—"}
            </p>

            {contact.telephone_secondaire && (
              <p>
                Téléphone secondaire :{" "}
                {contact.telephone_secondaire}
              </p>
            )}
          </div>
        ))
      ) : (
        <p>Aucun contact d'urgence.</p>
      )}
    </div>

    <div className="familles-dossier-section">
      <h3>Inscriptions</h3>

      {familleSelectionnee.inscriptions?.length ? (
        familleSelectionnee.inscriptions.map((inscription) => (
          <div
            key={inscription.id}
            className="familles-dossier-carte"
          >
            <strong>
              {inscription.enfant_prenom}{" "}
              {inscription.enfant_nom}
            </strong>

            <p>
              {inscription.cours} —{" "}
              {inscription.groupe || "Groupe non précisé"}
            </p>

            <p>Saison : {inscription.saison}</p>

            <p>
              Statut : {inscription.statut}
            </p>

            <p>
              Prix facturé :{" "}
              {Number(
                inscription.prix_facture ?? 0
              ).toLocaleString("fr-CA", {
                style: "currency",
                currency: "CAD",
              })}
            </p>
          </div>
        ))
      ) : (
        <p>Aucune inscription.</p>
      )}
    </div>
    {verificationPurge && (
  <div className="familles-dossier-section">
    <h3>Conservation des données</h3>

    <div className="familles-dossier-carte">
      {verificationPurge.admissible_purge ? (
        <>
          <p>
            <strong>
              Cette famille est admissible à la purge.
            </strong>
          </p>

          <p>
            Parents à supprimer :{" "}
            {verificationPurge.nombre_parents ?? 0}
          </p>

          <p>
            Enfants à supprimer :{" "}
            {verificationPurge.nombre_enfants ?? 0}
          </p>

          <p>
            Contacts d'urgence à supprimer :{" "}
            {verificationPurge.nombre_contacts_urgence ?? 0}
          </p>

          <p>
            Inscriptions à supprimer :{" "}
            {verificationPurge.nombre_inscriptions ?? 0}
          </p>

          <p>
            Dossiers financiers à archiver :{" "}
            {verificationPurge.nombre_finances_a_archiver ?? 0}
          </p>

          <p>
            Comptes uniquement parents :{" "}
            {verificationPurge.profils_parent_seulement ?? 0}
          </p>

          <p>
            Comptes conservés avec d'autres accès :{" "}
            {verificationPurge.profils_avec_autres_acces ?? 0}
          </p>

          {!confirmationPurge ? (
  <button
    type="button"
    className="familles-bouton-purge"
    onClick={() => setConfirmationPurge(true)}
  >
    Purger les données de cette famille
  </button>
) : (
  <div className="familles-confirmation-purge">
    <p>
      <strong>Confirmer la suppression définitive ?</strong>
    </p>

    <p>
      Les renseignements personnels de cette famille seront
      supprimés. Seules les données financières admissibles
      seront archivées de façon anonymisée.
    </p>

    <div className="familles-confirmation-actions">
      <button
        type="button"
        className="admin-bouton admin-bouton-secondaire"
        onClick={() => setConfirmationPurge(false)}
        disabled={purgeEnCours}
      >
        Annuler
      </button>

      <button
        type="button"
        className="familles-bouton-purge"
        onClick={purgerFamille}
        disabled={purgeEnCours}
      >
        {purgeEnCours
          ? "Purge en cours..."
          : "Oui, supprimer définitivement"}
      </button>
    </div>
  </div>
)}
        </>
      ) : (
        <p>
          <strong>
            Cette famille n'est pas admissible à la purge.
          </strong>{" "}
          Une période de trois ans sans inscription doit être
          atteinte avant la suppression des données.
        </p>
      )}
    </div>
  </div>
)}
  </div>
)}
    </section>
  );
}

export default GestionFamilles;