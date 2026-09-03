import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
const CLE_ESPACE_CONNEXION = "volleyball-attack-espace";
function Accueil() {
  const [courriel, setCourriel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [afficherMotPasseOublie, setAfficherMotPasseOublie] = useState(false);
  const [courrielRecuperation, setCourrielRecuperation] = useState("");
  const [messageRecuperation, setMessageRecuperation] = useState("");
  const [recuperationEnCours, setRecuperationEnCours] = useState(false);
  const [afficherCreationCompte, setAfficherCreationCompte] = useState(false);
  const [formulaireCreation, setFormulaireCreation] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    courriel: "",
    motDePasse: "",
    confirmationMotDePasse: "",
  });
  const [messageCreation, setMessageCreation] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [afficherConnexionEntraineur, setAfficherConnexionEntraineur] =
    useState(false);
  const [courrielEntraineur, setCourrielEntraineur] = useState("");
  const [motDePasseEntraineur, setMotDePasseEntraineur] = useState("");
  const [messageEntraineur, setMessageEntraineur] = useState("");
  const [connexionEntraineurEnCours, setConnexionEntraineurEnCours] =
    useState(false);
  const [afficherConnexionAdministration, setAfficherConnexionAdministration] =
    useState(false);
  const [courrielAdministration, setCourrielAdministration] = useState("");
  const [motDePasseAdministration, setMotDePasseAdministration] = useState("");
  const [messageAdministration, setMessageAdministration] = useState("");
  const [connexionAdministrationEnCours, setConnexionAdministrationEnCours] =
    useState(false);
  async function soumettreConnexionParent(e) {
    e.preventDefault();
    const courrielNormalise = courriel.trim().toLowerCase();
    if (!courrielNormalise || !motDePasse) {
      alert("Veuillez entrer votre courriel et votre mot de passe.");
      return;
    }
    sessionStorage.setItem(CLE_ESPACE_CONNEXION, "parent");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: courrielNormalise,
      password: motDePasse,
    });
    if (error) {
      console.error(error);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      alert("Courriel ou mot de passe invalide.");
      return;
    }
    if (!data.user) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      alert("Impossible de charger le compte.");
      return;
    }
    const { data: profilUtilisateur, error: erreurProfil } = await supabase
      .from("profils")
      .select("est_parent, actif")
      .eq("id", data.user.id)
      .single();
    if (erreurProfil) {
      console.error(erreurProfil);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      alert("Impossible de vérifier les droits du compte parent.");
      return;
    }
    if (!profilUtilisateur.actif) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      alert("Ce compte est actuellement désactivé.");
      return;
    }
    if (!profilUtilisateur.est_parent) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      alert("Ce compte ne possède pas d'accès parent.");
    }
  }
  function ouvrirMotPasseOublie() {
    setCourrielRecuperation(courriel.trim().toLowerCase());
    setMessageRecuperation("");
    setAfficherMotPasseOublie(true);
  }
  function fermerMotPasseOublie() {
    if (recuperationEnCours) return;
    setAfficherMotPasseOublie(false);
    setMessageRecuperation("");
  }
  async function soumettreMotPasseOublie(e) {
    e.preventDefault();
    setMessageRecuperation("");
    const courrielNormalise = courrielRecuperation.trim().toLowerCase();
    if (!courrielNormalise) {
      setMessageRecuperation("Veuillez entrer votre courriel.");
      return;
    }
    setRecuperationEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      courrielNormalise,
      {
        redirectTo:
          "https://volleyball-attack.vercel.app/reinitialiser-mot-de-passe",
      }
    );
    setRecuperationEnCours(false);
    if (error) {
      console.error("Erreur de récupération du mot de passe :", error);
      setMessageRecuperation(
        "Impossible d'envoyer le courriel de récupération. Veuillez réessayer."
      );
      return;
    }
    setMessageRecuperation(
      "Si un compte correspond à ce courriel, un lien de réinitialisation vous sera envoyé."
    );
  }
  function modifierChampCreation(e) {
    const { name, value } = e.target;
    setFormulaireCreation((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  }
  function fermerCreationCompte() {
    if (creationEnCours) {
      return;
    }
    setAfficherCreationCompte(false);
    setMessageCreation("");
    setFormulaireCreation({
      prenom: "",
      nom: "",
      telephone: "",
      courriel: "",
      motDePasse: "",
      confirmationMotDePasse: "",
    });
  }
  async function soumettreCreationCompte(e) {
    e.preventDefault();
    setMessageCreation("");
    const prenom = formulaireCreation.prenom.trim();
    const nom = formulaireCreation.nom.trim();
    const telephone = formulaireCreation.telephone.trim();
    const courrielNormalise = formulaireCreation.courriel
      .trim()
      .toLowerCase();
    const motDePasseCreation = formulaireCreation.motDePasse;
    if (!prenom || !nom || !telephone || !courrielNormalise) {
      setMessageCreation("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (motDePasseCreation.length < 6) {
      setMessageCreation(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }
    if (
      motDePasseCreation !== formulaireCreation.confirmationMotDePasse
    ) {
      setMessageCreation("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setCreationEnCours(true);
    try {
      /*
        On vérifie d'abord si le courriel et le mot de passe
        correspondent déjà à un compte Auth existant.
        Exemple :
        - administrateur qui devient parent
        - entraîneur qui devient parent
        - administrateur + entraîneur qui devient parent
      */
      const {
        data: connexionExistante,
        error: erreurConnexionExistante,
      } = await supabase.auth.signInWithPassword({
        email: courrielNormalise,
        password: motDePasseCreation,
      });
      if (!erreurConnexionExistante && connexionExistante.user) {
        const { data: profilExistant, error: erreurProfilExistant } =
          await supabase
            .from("profils")
            .select("actif, est_parent")
            .eq("id", connexionExistante.user.id)
            .single();
        if (erreurProfilExistant) {
          console.error(erreurProfilExistant);
          await supabase.auth.signOut();
          setMessageCreation(
            "Impossible de vérifier le compte utilisateur."
          );
          return;
        }
        if (!profilExistant.actif) {
          await supabase.auth.signOut();
          setMessageCreation("Ce compte est actuellement désactivé.");
          return;
        }
        if (profilExistant.est_parent) {
          sessionStorage.setItem(CLE_ESPACE_CONNEXION, "parent");
          setCourriel(courrielNormalise);
          setMessageCreation(
            "Ce compte possède déjà un accès parent. Vous pouvez vous connecter."
          );
          return;
        }
        const { error: erreurAjoutParent } = await supabase.rpc(
          "ajouter_mon_acces_parent"
        );
        if (erreurAjoutParent) {
          console.error(erreurAjoutParent);
          sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
          await supabase.auth.signOut();
          setMessageCreation(
            `Impossible d'ajouter l'accès parent : ${erreurAjoutParent.message}`
          );
          return;
        }
        sessionStorage.setItem(CLE_ESPACE_CONNEXION, "parent");
        setCourriel(courrielNormalise);
        /*
          Le compte possède maintenant est_parent = true.
          On recharge pour que App.jsx recharge le profil
          avec ses nouveaux accès.
        */
        window.location.reload();
        return;
      }
      /*
        La connexion n'a pas fonctionné.
        On tente donc la création d'un nouveau compte parent.
      */
      const { data: creation, error: erreurCreation } =
        await supabase.auth.signUp({
          email: courrielNormalise,
          password: motDePasseCreation,
          options: {
            data: {
              prenom,
              nom,
              telephone,
            },
          },
        });
      if (erreurCreation) {
        console.error(erreurCreation);
        setMessageCreation(
          `Impossible de créer le compte : ${erreurCreation.message}`
        );
        return;
      }
      /*
        Supabase peut volontairement ne pas révéler qu'un
        courriel existe déjà.
        Lorsqu'aucune nouvelle identité n'est créée,
        on considère que le compte existait déjà mais que
        le mot de passe saisi n'était pas le bon.
      */
      if (
        creation.user &&
        Array.isArray(creation.user.identities) &&
        creation.user.identities.length === 0
      ) {
        await supabase.auth.signOut();
        setMessageCreation(
          "Un compte existe déjà avec ce courriel. Utilisez le mot de passe de ce compte pour ajouter l'accès parent."
        );
        return;
      }
      setMessageCreation(
        "Compte parent créé avec succès. Vous pouvez maintenant vous connecter."
      );
      setCourriel(courrielNormalise);
    } catch (error) {
      console.error(error);
      setMessageCreation(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la création du compte."
      );
    } finally {
      setCreationEnCours(false);
    }
  }
  function ouvrirConnexionEntraineur() {
    setCourrielEntraineur("");
    setMotDePasseEntraineur("");
    setMessageEntraineur("");
    setAfficherConnexionEntraineur(true);
  }
  function fermerConnexionEntraineur() {
    if (connexionEntraineurEnCours) {
      return;
    }
    setAfficherConnexionEntraineur(false);
    setCourrielEntraineur("");
    setMotDePasseEntraineur("");
    setMessageEntraineur("");
  }
  async function soumettreConnexionEntraineur(e) {
    e.preventDefault();
    setMessageEntraineur("");
    const courrielNormalise = courrielEntraineur.trim().toLowerCase();
    if (!courrielNormalise || !motDePasseEntraineur) {
      setMessageEntraineur(
        "Veuillez entrer votre courriel et votre mot de passe."
      );
      return;
    }
    setConnexionEntraineurEnCours(true);
    sessionStorage.setItem(CLE_ESPACE_CONNEXION, "entraineur");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: courrielNormalise,
      password: motDePasseEntraineur,
    });
    if (error) {
      console.error(error);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      setConnexionEntraineurEnCours(false);
      setMessageEntraineur("Courriel ou mot de passe invalide.");
      return;
    }
    if (!data.user) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionEntraineurEnCours(false);
      setMessageEntraineur("Impossible de charger le compte.");
      return;
    }
    const { data: profilUtilisateur, error: erreurProfil } = await supabase
      .from("profils")
      .select("est_entraineur, actif")
      .eq("id", data.user.id)
      .single();
    if (erreurProfil) {
      console.error(erreurProfil);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionEntraineurEnCours(false);
      setMessageEntraineur(
        "Impossible de vérifier les droits de l'entraîneur."
      );
      return;
    }
    if (!profilUtilisateur.actif) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionEntraineurEnCours(false);
      setMessageEntraineur("Ce compte est actuellement désactivé.");
      return;
    }
    if (!profilUtilisateur.est_entraineur) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionEntraineurEnCours(false);
      setMessageEntraineur(
        "Ce compte ne possède pas d'accès entraîneur."
      );
      return;
    }
    setConnexionEntraineurEnCours(false);
  }
  function ouvrirConnexionAdministration() {
    setCourrielAdministration("");
    setMotDePasseAdministration("");
    setMessageAdministration("");
    setAfficherConnexionAdministration(true);
  }
  function fermerConnexionAdministration() {
    if (connexionAdministrationEnCours) {
      return;
    }
    setAfficherConnexionAdministration(false);
    setCourrielAdministration("");
    setMotDePasseAdministration("");
    setMessageAdministration("");
  }
  async function soumettreConnexionAdministration(e) {
    e.preventDefault();
    setMessageAdministration("");
    const courrielNormalise = courrielAdministration.trim().toLowerCase();
    if (!courrielNormalise || !motDePasseAdministration) {
      setMessageAdministration(
        "Veuillez entrer votre courriel et votre mot de passe."
      );
      return;
    }
    setConnexionAdministrationEnCours(true);
    sessionStorage.setItem(CLE_ESPACE_CONNEXION, "administration");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: courrielNormalise,
      password: motDePasseAdministration,
    });
    if (error) {
      console.error(error);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      setConnexionAdministrationEnCours(false);
      setMessageAdministration("Courriel ou mot de passe invalide.");
      return;
    }
    if (!data.user) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionAdministrationEnCours(false);
      setMessageAdministration("Impossible de charger le compte.");
      return;
    }
    const { data: profilUtilisateur, error: erreurProfil } = await supabase
      .from("profils")
      .select("est_administrateur, actif")
      .eq("id", data.user.id)
      .single();
    if (erreurProfil) {
      console.error(erreurProfil);
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionAdministrationEnCours(false);
      setMessageAdministration(
        "Impossible de vérifier les droits d'administration."
      );
      return;
    }
    if (!profilUtilisateur.actif) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionAdministrationEnCours(false);
      setMessageAdministration("Ce compte est actuellement désactivé.");
      return;
    }
    if (!profilUtilisateur.est_administrateur) {
      sessionStorage.removeItem(CLE_ESPACE_CONNEXION);
      await supabase.auth.signOut();
      setConnexionAdministrationEnCours(false);
      setMessageAdministration(
        "Ce compte ne possède pas d'accès administrateur."
      );
      return;
    }
    setConnexionAdministrationEnCours(false);
  }
  return (
    <main className="page-accueil">
      <div className="accueil-conteneur">
        <header className="accueil-entete">
          <img
            src="/logo-attack.png"
            alt="Logo Volley-Ball Attack Sept-Îles"
            className="logo-attack"
          />
          <h1>Volley-Ball Attack Sept-Îles</h1>
          <p className="accueil-sous-titre">
            Inscription aux activités de volleyball
          </p>
        </header>
        <section className="carte-connexion carte-parent">
          <h2>Espace parent</h2>
          <form
            className="formulaire-connexion"
            onSubmit={soumettreConnexionParent}
          >
            <div className="champ-formulaire">
              <label htmlFor="courriel-parent">Courriel</label>
              <input
                id="courriel-parent"
                type="email"
                value={courriel}
                onChange={(e) => setCourriel(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="champ-formulaire">
              <label htmlFor="mot-passe-parent">Mot de passe</label>
              <input
                id="mot-passe-parent"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={ouvrirMotPasseOublie}
            >
              Mot de passe oublié?
            </button>
            <button type="submit" className="bouton bouton-principal">
              Se connecter
            </button>
          </form>
          <div className="separateur-parent" />
          <div className="creation-compte">
            <p>Pas encore de compte parent ?</p>
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={() => setAfficherCreationCompte(true)}
            >
              Créer ou ajouter un accès parent
            </button>
          </div>
        </section>
        <section className="carte-acces-secondaires">
          <div className="acces-secondaire">
            <div className="icone-acces">🏐</div>
            <h2>Accès entraîneur</h2>
            <p>Accédez à votre espace entraîneur.</p>
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={ouvrirConnexionEntraineur}
            >
              Connexion entraîneur
            </button>
          </div>
          <div className="division-acces" />
          <div className="acces-secondaire">
            <div className="icone-acces">⚙</div>
            <h2>Accès administration</h2>
            <p>Gestion administrative de la plateforme.</p>
            <button
              type="button"
              className="bouton bouton-secondaire"
              onClick={ouvrirConnexionAdministration}
            >
              Connexion administration
            </button>
          </div>
        </section>
      </div>
      {afficherMotPasseOublie && (
        <div className="fond-modale" onMouseDown={fermerMotPasseOublie}>
          <section
            className="modale-creation-compte"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="entete-modale">
              <h2>Réinitialiser le mot de passe</h2>
              <button
                type="button"
                className="bouton-fermer-modale"
                onClick={fermerMotPasseOublie}
                disabled={recuperationEnCours}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form
              className="formulaire-creation-compte"
              onSubmit={soumettreMotPasseOublie}
            >
              <p>
                Entrez le courriel associé à votre compte. Un lien vous permettra
                de choisir un nouveau mot de passe.
              </p>
              <div className="champ-formulaire">
                <label htmlFor="courriel-recuperation">Courriel</label>
                <input
                  id="courriel-recuperation"
                  type="email"
                  value={courrielRecuperation}
                  onChange={(e) => setCourrielRecuperation(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              {messageRecuperation && (
                <p className="message-creation">{messageRecuperation}</p>
              )}
              <div className="actions-modale">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={fermerMotPasseOublie}
                  disabled={recuperationEnCours}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bouton bouton-principal"
                  disabled={recuperationEnCours}
                >
                  {recuperationEnCours ? "Envoi..." : "Envoyer le lien"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {afficherCreationCompte && (
        <div className="fond-modale" onMouseDown={fermerCreationCompte}>
          <section
            className="modale-creation-compte"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="entete-modale">
              <h2>Créer ou ajouter un accès parent</h2>
              <button
                type="button"
                className="bouton-fermer-modale"
                onClick={fermerCreationCompte}
                disabled={creationEnCours}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form
              className="formulaire-creation-compte"
              onSubmit={soumettreCreationCompte}
            >
              <div className="ligne-formulaire">
                <div className="champ-formulaire">
                  <label htmlFor="creation-prenom">Prénom</label>
                  <input
                    id="creation-prenom"
                    name="prenom"
                    type="text"
                    value={formulaireCreation.prenom}
                    onChange={modifierChampCreation}
                    required
                  />
                </div>
                <div className="champ-formulaire">
                  <label htmlFor="creation-nom">Nom</label>
                  <input
                    id="creation-nom"
                    name="nom"
                    type="text"
                    value={formulaireCreation.nom}
                    onChange={modifierChampCreation}
                    required
                  />
                </div>
              </div>
              <div className="champ-formulaire">
                <label htmlFor="creation-telephone">Téléphone</label>
                <input
                  id="creation-telephone"
                  name="telephone"
                  type="tel"
                  value={formulaireCreation.telephone}
                  onChange={modifierChampCreation}
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="champ-formulaire">
                <label htmlFor="creation-courriel">Courriel</label>
                <input
                  id="creation-courriel"
                  name="courriel"
                  type="email"
                  value={formulaireCreation.courriel}
                  onChange={modifierChampCreation}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="champ-formulaire">
                <label htmlFor="creation-mot-passe">Mot de passe</label>
                <input
                  id="creation-mot-passe"
                  name="motDePasse"
                  type="password"
                  value={formulaireCreation.motDePasse}
                  onChange={modifierChampCreation}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="champ-formulaire">
                <label htmlFor="creation-confirmation">
                  Confirmer le mot de passe
                </label>
                <input
                  id="creation-confirmation"
                  name="confirmationMotDePasse"
                  type="password"
                  value={formulaireCreation.confirmationMotDePasse}
                  onChange={modifierChampCreation}
                  autoComplete="current-password"
                  required
                />
              </div>
              {messageCreation && (
                <p className="message-creation">{messageCreation}</p>
              )}
              <div className="actions-modale">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={fermerCreationCompte}
                  disabled={creationEnCours}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bouton bouton-principal"
                  disabled={creationEnCours}
                >
                  {creationEnCours
                    ? "Traitement..."
                    : "Créer ou ajouter l'accès parent"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {afficherConnexionEntraineur && (
        <div
          className="fond-modale"
          onMouseDown={fermerConnexionEntraineur}
        >
          <section
            className="modale-creation-compte"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="entete-modale">
              <h2>Connexion entraîneur</h2>
              <button
                type="button"
                className="bouton-fermer-modale"
                onClick={fermerConnexionEntraineur}
                disabled={connexionEntraineurEnCours}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form
              className="formulaire-creation-compte"
              onSubmit={soumettreConnexionEntraineur}
            >
              <div className="champ-formulaire">
                <label htmlFor="courriel-entraineur">Courriel</label>
                <input
                  id="courriel-entraineur"
                  type="email"
                  value={courrielEntraineur}
                  onChange={(e) => setCourrielEntraineur(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="champ-formulaire">
                <label htmlFor="mot-passe-entraineur">Mot de passe</label>
                <input
                  id="mot-passe-entraineur"
                  type="password"
                  value={motDePasseEntraineur}
                  onChange={(e) => setMotDePasseEntraineur(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {messageEntraineur && (
                <p className="message-creation">{messageEntraineur}</p>
              )}
              <div className="actions-modale">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={fermerConnexionEntraineur}
                  disabled={connexionEntraineurEnCours}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bouton bouton-principal"
                  disabled={connexionEntraineurEnCours}
                >
                  {connexionEntraineurEnCours
                    ? "Connexion..."
                    : "Se connecter"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {afficherConnexionAdministration && (
        <div
          className="fond-modale"
          onMouseDown={fermerConnexionAdministration}
        >
          <section
            className="modale-creation-compte"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="entete-modale">
              <h2>Connexion administration</h2>
              <button
                type="button"
                className="bouton-fermer-modale"
                onClick={fermerConnexionAdministration}
                disabled={connexionAdministrationEnCours}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form
              className="formulaire-creation-compte"
              onSubmit={soumettreConnexionAdministration}
            >
              <div className="champ-formulaire">
                <label htmlFor="courriel-administration">Courriel</label>
                <input
                  id="courriel-administration"
                  type="email"
                  value={courrielAdministration}
                  onChange={(e) =>
                    setCourrielAdministration(e.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </div>
              <div className="champ-formulaire">
                <label htmlFor="mot-passe-administration">
                  Mot de passe
                </label>
                <input
                  id="mot-passe-administration"
                  type="password"
                  value={motDePasseAdministration}
                  onChange={(e) =>
                    setMotDePasseAdministration(e.target.value)
                  }
                  autoComplete="current-password"
                  required
                />
              </div>
              {messageAdministration && (
                <p className="message-creation">
                  {messageAdministration}
                </p>
              )}
              <div className="actions-modale">
                <button
                  type="button"
                  className="bouton bouton-secondaire"
                  onClick={fermerConnexionAdministration}
                  disabled={connexionAdministrationEnCours}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bouton bouton-principal"
                  disabled={connexionAdministrationEnCours}
                >
                  {connexionAdministrationEnCours
                    ? "Connexion..."
                    : "Se connecter"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
export default Accueil;
