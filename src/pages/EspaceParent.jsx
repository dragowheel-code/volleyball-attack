import { useEffect, useState } from "react";

// Supabase

import { supabase } from "../lib/supabaseClient";

// Modals

import ModalAjoutEnfant from "../components/parent/ModalAjoutEnfant";

import ModalAjoutParent from "../components/parent/ModalAjoutParent";

import ModalContactUrgence from "../components/parent/ModalContactUrgence";

import ModalEnfant from "../components/parent/ModalEnfant";

import ModalProfilParent from "../components/parent/ModalProfilParent";

import ActivitesDisponibles from "../components/parent/ActivitesDisponibles";

function EspaceParent({ profil }) {

  // =========================================================

  // ENFANTS

  // =========================================================

  const [enfants, setEnfants] = useState([]);

  const [chargementEnfants, setChargementEnfants] =

    useState(true);

  const [afficherAjoutEnfant, setAfficherAjoutEnfant] =

    useState(false);

  const [ajoutEnCours, setAjoutEnCours] =

    useState(false);

  const [messageAjout, setMessageAjout] =

    useState("");

  const [

    enfantEnModification,

    setEnfantEnModification,

  ] = useState(null);

  const [

    modificationEnfantEnCours,

    setModificationEnfantEnCours,

  ] = useState(false);

  const [

    messageModificationEnfant,

    setMessageModificationEnfant,

  ] = useState("");

  const [afficherActivites, setAfficherActivites] = useState(false);

  const [inscriptions, setInscriptions] =
    useState([]);

  const [
    chargementInscriptions,
    setChargementInscriptions,
  ] = useState(true);

  // =========================================================

  // PARENTS / RESPONSABLES

  // =========================================================

  const [parentsFamille, setParentsFamille] =

    useState([]);

  const [chargementParents, setChargementParents] =

    useState(true);

  const [

    afficherAjoutParent,

    setAfficherAjoutParent,

  ] = useState(false);

  const [

    invitationEnCours,

    setInvitationEnCours,

  ] = useState(false);

  const [

    messageInvitation,

    setMessageInvitation,

  ] = useState("");

  // =========================================================

  // CONTACTS D'URGENCE

  // =========================================================

  const [contactsUrgence, setContactsUrgence] =

    useState([]);

  const [

    chargementContacts,

    setChargementContacts,

  ] = useState(true);

  const [

    afficherAjoutContact,

    setAfficherAjoutContact,

  ] = useState(false);

  const [

    ajoutContactEnCours,

    setAjoutContactEnCours,

  ] = useState(false);

  const [

    messageAjoutContact,

    setMessageAjoutContact,

  ] = useState("");

  const [

    contactEnModification,

    setContactEnModification,

  ] = useState(null);

  // =========================================================

  // CHARGEMENT INITIAL

  // =========================================================

  useEffect(() => {

    chargerEnfants();

    chargerParentsFamille();

    chargerContactsUrgence();

    chargerInscriptions();

  }, []);

  // =========================================================

  // CHARGEMENT DES ENFANTS

  // =========================================================

  async function chargerEnfants() {

    setChargementEnfants(true);

    const { data, error } = await supabase

      .from("parents_enfants")

      .select(`

        enfant_id,

        lien,

        enfants (

          id,

          prenom,

          nom,

          date_naissance,

          sexe,

          numero_assurance_maladie,

          allergies,

          problemes_sante

        )

      `);

    if (error) {

      console.error(

        "Erreur lors du chargement des enfants :",

        error

      );

      setEnfants([]);

      setChargementEnfants(false);

      return;

    }

    const liste = (data || [])

      .map((ligne) => ({

        ...ligne.enfants,

        lienParent: ligne.lien,

      }))

      .filter((enfant) => enfant?.id);

    setEnfants(liste);

    setChargementEnfants(false);

  }

  // =========================================================

  // CHARGEMENT DES PARENTS

  // =========================================================

  async function chargerParentsFamille() {

    setChargementParents(true);

    const { data, error } = await supabase.rpc(

      "lister_parents_famille"

    );

    if (error) {

      console.error(

        "Erreur lors du chargement des parents :",

        error

      );

      setParentsFamille([]);

      setChargementParents(false);

      return;

    }

    setParentsFamille(data || []);

    setChargementParents(false);

  }

  // =========================================================

  // CHARGEMENT DES CONTACTS D'URGENCE

  // =========================================================

  async function chargerContactsUrgence() {

    setChargementContacts(true);

    const { data, error } = await supabase.rpc(

      "lister_contacts_urgence_famille"

    );

    if (error) {

      console.error(

        "Erreur lors du chargement des contacts d'urgence :",

        error

      );

      setContactsUrgence([]);

      setChargementContacts(false);

      return;

    }

    setContactsUrgence(data || []);

    setChargementContacts(false);

  }

  // =========================================================

  // CHARGEMENT DES INSCRIPTIONS

  // =========================================================

  async function chargerInscriptions() {

    setChargementInscriptions(true);

    const { data, error } = await supabase.rpc(
      "lister_mes_inscriptions_parent"
    );

    if (error) {

      console.error(
        "Erreur lors du chargement des inscriptions :",
        error
      );

      setInscriptions([]);
      setChargementInscriptions(false);
      return;

    }

    setInscriptions(data || []);
    setChargementInscriptions(false);

  }

  function formaterMontant(montant) {

    return new Intl.NumberFormat(
      "fr-CA",
      {
        style: "currency",
        currency: "CAD",
      }
    ).format(
      Number(montant ?? 0)
    );

  }

  function libelleStatutInscription(statut) {

    const libelles = {
      en_attente_paiement:
        "En attente de paiement",
      confirmee:
        "Confirmée",
      liste_attente:
        "Liste d'attente",
      annulee:
        "Annulée",
    };

    return libelles[statut] || statut || "—";

  }

  function libelleStatutPaiement(statut) {

    const libelles = {
      a_recevoir:
        "À recevoir",
      recu:
        "Reçu",
      rembourse:
        "Remboursé",
    };

    return libelles[statut] || statut || "—";

  }

  // =========================================================

  // GESTION DES CONTACTS D'URGENCE

  // =========================================================

  function ouvrirAjoutContact() {

    setContactEnModification(null);

    setMessageAjoutContact("");

    setAfficherAjoutContact(true);

  }

  function ouvrirModificationContact(contact) {

    setContactEnModification(contact);

    setMessageAjoutContact("");

    setAfficherAjoutContact(true);

  }

  function fermerAjoutContact() {

    if (ajoutContactEnCours) {

      return;

    }

    setAfficherAjoutContact(false);

    setContactEnModification(null);

    setMessageAjoutContact("");

  }

  async function enregistrerContactUrgence(

    formulaire

  ) {

    setMessageAjoutContact("");

    const prenom =

      formulaire.prenom.trim();

    const nom =

      formulaire.nom.trim();

    const lien =

      formulaire.lien.trim();

    const telephone =

      formulaire.telephone.trim();

    if (

      !prenom ||

      !nom ||

      !lien ||

      !telephone

    ) {

      setMessageAjoutContact(

        "Veuillez remplir les champs obligatoires."

      );

      return;

    }

    setAjoutContactEnCours(true);

    let resultat;

    if (contactEnModification) {

      resultat = await supabase.rpc(

        "modifier_contact_urgence_famille",

        {

          p_contact_id:

            contactEnModification.id,

          p_prenom:

            prenom,

          p_nom:

            nom,

          p_lien:

            lien,

          p_telephone:

            telephone,

          p_telephone_secondaire:

            formulaire.telephoneSecondaire

              .trim() || null,

          p_principal:

            formulaire.principal,

        }

      );

    } else {

      resultat = await supabase.rpc(

        "creer_contact_urgence_famille",

        {

          p_prenom:

            prenom,

          p_nom:

            nom,

          p_lien:

            lien,

          p_telephone:

            telephone,

          p_telephone_secondaire:

            formulaire.telephoneSecondaire

              .trim() || null,

          p_principal:

            formulaire.principal,

        }

      );

    }

    setAjoutContactEnCours(false);

    if (resultat.error) {

      console.error(

        "Erreur contact d'urgence :",

        resultat.error

      );

      setMessageAjoutContact(

        `Impossible d'enregistrer le contact : ${resultat.error.message}`

      );

      return;

    }

    await chargerContactsUrgence();

    setAfficherAjoutContact(false);

    setContactEnModification(null);

    setMessageAjoutContact("");

  }

  async function supprimerContactUrgence(

    contact

  ) {

    const confirmation = window.confirm(

      `Supprimer ${contact.prenom} ${contact.nom} des contacts d'urgence ?`

    );

    if (!confirmation) {

      return;

    }

    const { error } = await supabase.rpc(

      "supprimer_contact_urgence_famille",

      {

        p_contact_id: contact.id,

      }

    );

    if (error) {

      console.error(

        "Erreur lors de la suppression du contact :",

        error

      );

      alert(

        `Impossible de supprimer le contact : ${error.message}`

      );

      return;

    }

    await chargerContactsUrgence();

  }

  // =========================================================

// MON PROFIL

// =========================================================

const [profilParentComplet, setProfilParentComplet] =

  useState(null);

const [afficherProfilParent, setAfficherProfilParent] =

  useState(false);

const [

  chargementProfilParent,

  setChargementProfilParent,

] = useState(false);

const [

  modificationProfilEnCours,

  setModificationProfilEnCours,

] = useState(false);

const [

  messageModificationProfil,

  setMessageModificationProfil,

] = useState("");

const [courrielParent, setCourrielParent] =

  useState("");

  // =========================================================

  // DÉCONNEXION

  // =========================================================

  async function seDeconnecter() {

    const { error } =

      await supabase.auth.signOut();

    if (error) {

      console.error(error);

      alert(

        "Impossible de vous déconnecter."

      );

    }

  }

  // =========================================================

  // AJOUT D'UN ENFANT

  // =========================================================

  function ouvrirAjoutEnfant() {

    setMessageAjout("");

    setAfficherAjoutEnfant(true);

  }

  function fermerAjoutEnfant() {

    if (ajoutEnCours) {

      return;

    }

    setAfficherAjoutEnfant(false);

    setMessageAjout("");

  }

  async function ajouterEnfant(formulaire) {

    setMessageAjout("");

    const prenom =

      formulaire.prenom.trim();

    const nom =

      formulaire.nom.trim();

    if (

      !prenom ||

      !nom ||

      !formulaire.dateNaissance ||

      !formulaire.sexe ||

      !formulaire.lienParent

    ) {

      setMessageAjout(

        "Veuillez remplir les champs obligatoires."

      );

      return;

    }

    setAjoutEnCours(true);

    const { data, error } =

      await supabase.rpc(

        "creer_mon_enfant",

        {

          p_prenom:

            prenom,

          p_nom:

            nom,

          p_date_naissance:

            formulaire.dateNaissance,

          p_sexe:

            formulaire.sexe,

          p_numero_assurance_maladie:

            formulaire.numeroAssuranceMaladie

              .trim() || null,

          p_allergies:

            formulaire.allergies.trim() ||

            null,

          p_problemes_sante:

            formulaire.problemesSante

              .trim() || null,

          p_lien_parent:

            formulaire.lienParent.trim(),

        }

      );

    setAjoutEnCours(false);

    if (error) {

      console.error(

        "Erreur lors de la création de l'enfant :",

        error

      );

      setMessageAjout(

        `Impossible d'ajouter l'enfant : ${error.message}`

      );

      return;

    }

    console.log(

      "Enfant créé :",

      data

    );

    await chargerEnfants();

    setAfficherAjoutEnfant(false);

    setMessageAjout("");

  }

  // =========================================================

  // MODIFICATION D'UN ENFANT

  // =========================================================

  function ouvrirEnfant(enfant) {

    setEnfantEnModification(enfant);

    setMessageModificationEnfant("");

  }

  function fermerEnfant() {

    if (modificationEnfantEnCours) {

      return;

    }

    setEnfantEnModification(null);

    setMessageModificationEnfant("");

  }

  async function modifierEnfant(formulaire) {

    setMessageModificationEnfant("");

    const prenom =

      formulaire.prenom.trim();

    const nom =

      formulaire.nom.trim();

    if (

      !prenom ||

      !nom ||

      !formulaire.dateNaissance ||

      !formulaire.sexe

    ) {

      setMessageModificationEnfant(

        "Veuillez remplir les champs obligatoires."

      );

      return;

    }

    if (!enfantEnModification?.id) {

      setMessageModificationEnfant(

        "Impossible d'identifier l'enfant."

      );

      return;

    }

    setModificationEnfantEnCours(true);

    const { error } = await supabase.rpc(

      "modifier_mon_enfant",

      {

        p_enfant_id:

          enfantEnModification.id,

        p_prenom:

          prenom,

        p_nom:

          nom,

        p_date_naissance:

          formulaire.dateNaissance,

        p_sexe:

          formulaire.sexe,

        p_numero_assurance_maladie:

          formulaire.numeroAssuranceMaladie

            .trim() || null,

        p_allergies:

          formulaire.allergies.trim() ||

          null,

        p_problemes_sante:

          formulaire.problemesSante

            .trim() || null,

      }

    );

    setModificationEnfantEnCours(false);

    if (error) {

      console.error(

        "Erreur lors de la modification de l'enfant :",

        error

      );

      setMessageModificationEnfant(

        `Impossible d'enregistrer les modifications : ${error.message}`

      );

      return;

    }

    await chargerEnfants();

    setEnfantEnModification(null);

    setMessageModificationEnfant("");

  }

  // =========================================================

  // INVITATION DU DEUXIÈME PARENT

  // =========================================================

  function ouvrirAjoutParent() {

    setMessageInvitation("");

    setAfficherAjoutParent(true);

  }

  function fermerAjoutParent() {

    if (invitationEnCours) {

      return;

    }

    setAfficherAjoutParent(false);

    setMessageInvitation("");

  }

  async function inviterParent(formulaire) {

    setMessageInvitation("");

    const prenom =

      formulaire.prenom.trim();

    const nom =

      formulaire.nom.trim();

    const courriel =

      formulaire.courriel

        .trim()

        .toLowerCase();

    const telephone =

      formulaire.telephone.trim();

    const lien =

      formulaire.lien.trim();

    if (

      !prenom ||

      !nom ||

      !courriel ||

      !lien

    ) {

      setMessageInvitation(

        "Veuillez remplir les champs obligatoires."

      );

      return;

    }

    setInvitationEnCours(true);

    const { data, error } =

      await supabase.functions.invoke(

        "inviter-deuxieme-parent",

        {

          body: {

            prenom,

            nom,

            courriel,

            telephone,

            lien,

          },

        }

      );

    setInvitationEnCours(false);

    if (error) {

      console.error(

        "Erreur lors de l'invitation :",

        error

      );

      setMessageInvitation(

        "Impossible d'envoyer l'invitation."

      );

      return;

    }

    if (!data?.success) {

      setMessageInvitation(

        data?.error ||

          "Impossible d'envoyer l'invitation."

      );

      return;

    }

    await chargerParentsFamille();

    setAfficherAjoutParent(false);

    setMessageInvitation("");

    alert(

      "L'invitation a été envoyée au deuxième parent."

    );

  }

  // =========================================================

// PROFIL PARENT

// =========================================================

async function ouvrirProfilParent() {

  setMessageModificationProfil("");

  setChargementProfilParent(true);

  const { data, error } = await supabase.rpc(

    "lire_mon_profil_parent"

  );

  if (error) {

    console.error(

      "Erreur lors du chargement du profil parent :",

      error

    );

    setChargementProfilParent(false);

    alert(

      `Impossible de charger votre profil : ${error.message}`

    );

    return;

  }

  const { data: utilisateurData } =

    await supabase.auth.getUser();

  setCourrielParent(

    utilisateurData?.user?.email || ""

  );

  setProfilParentComplet(

    data?.[0] || null

  );

  setChargementProfilParent(false);

  setAfficherProfilParent(true);

}

function fermerProfilParent() {

  if (modificationProfilEnCours) {

    return;

  }

  setAfficherProfilParent(false);

  setProfilParentComplet(null);

  setMessageModificationProfil("");

}

async function enregistrerProfilParent(

  formulaire

) {

  setMessageModificationProfil("");

  const prenom =

    formulaire.prenom.trim();

  const nom =

    formulaire.nom.trim();

  if (!prenom || !nom) {

    setMessageModificationProfil(

      "Le prénom et le nom sont obligatoires."

    );

    return;

  }

  setModificationProfilEnCours(true);

  const { error } = await supabase.rpc(

    "modifier_mon_profil_parent",

    {

      p_prenom:

        prenom,

      p_nom:

        nom,

      p_telephone:

        formulaire.telephone.trim() ||

        null,

      p_adresse:

        formulaire.adresse.trim() ||

        null,

      p_ville:

        formulaire.ville.trim() ||

        null,

      p_code_postal:

        formulaire.codePostal.trim() ||

        null,

    }

  );

  setModificationProfilEnCours(false);

  if (error) {

    console.error(

      "Erreur lors de la modification du profil :",

      error

    );

    setMessageModificationProfil(

      `Impossible d'enregistrer les modifications : ${error.message}`

    );

    return;

  }

  setAfficherProfilParent(false);

  setProfilParentComplet(null);

  setMessageModificationProfil("");

  // Recharge la page afin que le prénom

  // affiché dans l'entête soit également actualisé.

  window.location.reload();

}

  // =========================================================

  // ACTIVITÉS DISPONIBLES

  // =========================================================

  if (afficherActivites) {

    return (

      <main className="page-espace-parent">

        <div className="espace-parent-conteneur">

          <ActivitesDisponibles

            onRetour={() => setAfficherActivites(false)}

          />

        </div>

      </main>

    );

  }

  // =========================================================

  // AFFICHAGE

  // =========================================================

  return (

    <main className="page-espace-parent">

      <div className="espace-parent-conteneur">

        <header className="espace-parent-entete">

          <div>

            <p className="espace-parent-sur-titre">

              Volley-Ball Attack Sept-Îles

            </p>

            <h1>

              Bonjour

              {profil?.prenom

                ? ` ${profil.prenom}`

                : ""}

            </h1>

            <p>

              Bienvenue dans votre espace parent.

            </p>

          </div>

          <button

            type="button"

            className="bouton bouton-secondaire"

            onClick={seDeconnecter}

          >

            Se déconnecter

          </button>

        </header>

        <section className="grille-espace-parent">

          {/* MES ENFANTS */}

          <article className="carte-espace-parent">

            <div className="entete-carte-parent">

              <h2>Mes enfants</h2>

              <button

                type="button"

                className="bouton bouton-principal"

                onClick={ouvrirAjoutEnfant}

              >

                + Ajouter un enfant

              </button>

            </div>

            {chargementEnfants ? (

              <p className="etat-vide">

                Chargement...

              </p>

            ) : enfants.length === 0 ? (

              <p className="etat-vide">

                Aucun enfant enregistré.

              </p>

            ) : (

              <div className="liste-enfants">

                {enfants.map((enfant) => (

                  <article

                    key={enfant.id}

                    className="fiche-enfant"

                  >

                    <div>

                      <h3>

                        {enfant.prenom}{" "}

                        {enfant.nom}

                      </h3>

                      <p>

                        Né(e) le{" "}

                        {enfant.date_naissance}

                      </p>

                      {enfant.lienParent && (

                        <p>

                          Lien :{" "}

                          {enfant.lienParent}

                        </p>

                      )}

                    </div>

                    <div className="actions-fiche">

                      <button

                        type="button"

                        className="bouton bouton-secondaire"

                        onClick={() =>

                          ouvrirEnfant(enfant)

                        }

                      >

                        Voir / Modifier

                      </button>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </article>

          {/* PARENTS / RESPONSABLES */}

          <article className="carte-espace-parent">

            <div className="entete-carte-parent">

              <h2>

                Parents / responsables

              </h2>

              {parentsFamille.length < 2 && (

                <button

                  type="button"

                  className="bouton bouton-principal"

                  onClick={ouvrirAjoutParent}

                >

                  + Ajouter un deuxième parent

                </button>

              )}

            </div>

            {chargementParents ? (

              <p className="etat-vide">

                Chargement...

              </p>

            ) : parentsFamille.length === 0 ? (

              <p className="etat-vide">

                Aucun parent enregistré.

              </p>

            ) : (

              <div className="liste-enfants">

                {parentsFamille.map((parent) => (

                  <article

                    key={parent.parent_id}

                    className="fiche-enfant"

                  >

                    <h3>

                      {parent.prenom}{" "}

                      {parent.nom}

                    </h3>

                    {parent.est_moi && (

                      <p>

                        <strong>

                          Vous

                        </strong>

                      </p>

                    )}

                    {parent.telephone && (

                      <p>

                        {parent.telephone}

                      </p>

                    )}

                  </article>

                ))}

              </div>

            )}

          </article>

          {/* CONTACTS D'URGENCE */}

          <article className="carte-espace-parent">

            <div className="entete-carte-parent">

              <h2>

                Contacts d'urgence

              </h2>

              <button

                type="button"

                className="bouton bouton-principal"

                onClick={ouvrirAjoutContact}

              >

                + Ajouter un contact

              </button>

            </div>

            {chargementContacts ? (

              <p className="etat-vide">

                Chargement...

              </p>

            ) : contactsUrgence.length === 0 ? (

              <p className="etat-vide">

                Aucun contact d'urgence enregistré.

              </p>

            ) : (

              <div className="liste-enfants">

                {contactsUrgence.map((contact) => (

                  <article

                    key={contact.id}

                    className="fiche-enfant"

                  >

                    <div>

                      <h3>

                        {contact.prenom}{" "}

                        {contact.nom}

                      </h3>

                      <p>

                        {contact.lien}

                      </p>

                      <p>

                        {contact.telephone}

                      </p>

                      {contact.telephone_secondaire && (

                        <p>

                          {

                            contact.telephone_secondaire

                          }

                        </p>

                      )}

                      {contact.principal && (

                        <p>

                          <strong>

                            Contact principal

                          </strong>

                        </p>

                      )}

                    </div>

                    <div className="actions-fiche">

                      <button

                        type="button"

                        className="bouton bouton-secondaire"

                        onClick={() =>

                          ouvrirModificationContact(

                            contact

                          )

                        }

                      >

                        Modifier

                      </button>

                      <button

                        type="button"

                        className="bouton bouton-secondaire"

                        onClick={() =>

                          supprimerContactUrgence(

                            contact

                          )

                        }

                      >

                        Supprimer

                      </button>

                    </div>

                  </article>

                ))}

              </div>

            )}

          </article>

          {/* MES INSCRIPTIONS */}

          <article className="carte-espace-parent">

            <div className="entete-carte-parent">

              <h2>Mes inscriptions</h2>

              <button
                type="button"
                className="bouton bouton-principal"
                onClick={() => setAfficherActivites(true)}
              >
                Voir les activités disponibles
              </button>

            </div>

            {chargementInscriptions ? (

              <p className="etat-vide">
                Chargement...
              </p>

            ) : inscriptions.length === 0 ? (

              <p className="etat-vide">
                Aucune inscription pour la saison active.
              </p>

            ) : (

              <div className="liste-enfants">

                {inscriptions.map((inscription) => {

                                    return (
                    <article
                      key={inscription.id}
                      className="fiche-enfant"
                    >
                      <div>

                        <h3>
                          {inscription.enfant_prenom}{" "}
                          {inscription.enfant_nom}
                        </h3>

                        <p>
                          <strong>Activité :</strong>{" "}
                          {inscription.cours_nom || "—"}
                        </p>

                        <p>
                          <strong>Groupe :</strong>{" "}
                          {inscription.groupe_nom || "—"}
                        </p>

                        <p>
                          <strong>Inscription :</strong>{" "}
                          {libelleStatutInscription(
                            inscription.statut_inscription
                          )}
                        </p>

                        {inscription.statut_inscription ===
                          "liste_attente" &&
                          inscription.position_liste_attente != null && (
                            <p>
                              <strong>
                                Position dans la liste d'attente :
                              </strong>{" "}
                              {inscription.position_liste_attente}
                            </p>
                          )}

                        {inscription.statut_inscription ===
                          "en_attente_paiement" &&
                          inscription.date_offre_place && (
                            <p>
                              <strong>
                                Place offerte — paiement requis
                              </strong>
                              <br />
                              Offre reçue le{" "}
                              {new Intl.DateTimeFormat(
                                "fr-CA",
                                {
                                  dateStyle: "long",
                                }
                              ).format(
                                new Date(
                                  inscription.date_offre_place
                                )
                              )}
                            </p>
                          )}

                        <p>
                          <strong>Montant :</strong>{" "}
                          {formaterMontant(
                            inscription.prix_facture
                          )}
                        </p>

                        <p>
                          <strong>Paiement :</strong>{" "}
                          {libelleStatutPaiement(
                            inscription.statut_paiement
                          )}
                        </p>

                      </div>
                    </article>
                  );

                })}

              </div>

            )}

          </article>

          {/* MON PROFIL */}

          <article className="carte-espace-parent">

            <h2>Mon profil</h2>

            <p>

              Consultez et modifiez vos coordonnées.

            </p>

            <button

  type="button"

  className="bouton bouton-secondaire"

  onClick={ouvrirProfilParent}

  disabled={chargementProfilParent}

>

  {chargementProfilParent

    ? "Chargement..."

    : "Modifier mes informations"}

</button>

          </article>

        </section>

      </div>

      {/* MODALE AJOUT ENFANT */}

      {afficherAjoutEnfant && (

        <ModalAjoutEnfant

          onFermer={fermerAjoutEnfant}

          onAjouter={ajouterEnfant}

          ajoutEnCours={ajoutEnCours}

          messageAjout={messageAjout}

        />

      )}

      {/* MODALE DOSSIER ENFANT */}

      {enfantEnModification && (

        <ModalEnfant

          enfant={enfantEnModification}

          onFermer={fermerEnfant}

          onEnregistrer={modifierEnfant}

          enregistrementEnCours={

            modificationEnfantEnCours

          }

          message={

            messageModificationEnfant

          }

        />

      )}

      {/* MODALE DEUXIÈME PARENT */}

      {afficherAjoutParent && (

        <ModalAjoutParent

          onFermer={fermerAjoutParent}

          onInviter={inviterParent}

          invitationEnCours={

            invitationEnCours

          }

          messageInvitation={

            messageInvitation

          }

        />

      )}

      {/* MODALE CONTACT D'URGENCE */}

      {afficherAjoutContact && (

        <ModalContactUrgence

          onFermer={fermerAjoutContact}

          onEnregistrer={

            enregistrerContactUrgence

          }

          enregistrementEnCours={

            ajoutContactEnCours

          }

          message={

            messageAjoutContact

          }

          contact={

            contactEnModification

          }

          premierContact={

            contactsUrgence.length === 0

          }

        />

      )}

      {/* MODALE PROFIL PARENT */}

{afficherProfilParent &&

  profilParentComplet && (

    <ModalProfilParent

      profil={profilParentComplet}

      courriel={courrielParent}

      onFermer={fermerProfilParent}

      onEnregistrer={

        enregistrerProfilParent

      }

      enregistrementEnCours={

        modificationProfilEnCours

      }

      message={

        messageModificationProfil

      }

    />

  )}

    </main>

  );

}

export default EspaceParent;