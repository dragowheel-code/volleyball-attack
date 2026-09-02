import { useState } from "react";

import { supabase } from "../lib/supabaseClient";

function Accueil() {

  // =========================================================

  // CONNEXION PARENT

  // =========================================================

  const [courriel, setCourriel] = useState("");

  const [motDePasse, setMotDePasse] = useState("");

  // =========================================================

  // CRÉATION COMPTE PARENT

  // =========================================================

  const [

    afficherCreationCompte,

    setAfficherCreationCompte,

  ] = useState(false);

  const [formulaireCreation, setFormulaireCreation] =

    useState({

      prenom: "",

      nom: "",

      telephone: "",

      courriel: "",

      motDePasse: "",

      confirmationMotDePasse: "",

    });

  const [messageCreation, setMessageCreation] =

    useState("");

  const [creationEnCours, setCreationEnCours] =

    useState(false);

  // =========================================================

  // CONNEXION ENTRAÎNEUR

  // =========================================================

  const [

    afficherConnexionEntraineur,

    setAfficherConnexionEntraineur,

  ] = useState(false);

  const [

    courrielEntraineur,

    setCourrielEntraineur,

  ] = useState("");

  const [

    motDePasseEntraineur,

    setMotDePasseEntraineur,

  ] = useState("");

  const [

    messageEntraineur,

    setMessageEntraineur,

  ] = useState("");

  const [

    connexionEntraineurEnCours,

    setConnexionEntraineurEnCours,

  ] = useState(false);

  // =========================================================

  // CONNEXION ADMINISTRATION

  // =========================================================

  const [

    afficherConnexionAdministration,

    setAfficherConnexionAdministration,

  ] = useState(false);

  const [

    courrielAdministration,

    setCourrielAdministration,

  ] = useState("");

  const [

    motDePasseAdministration,

    setMotDePasseAdministration,

  ] = useState("");

  const [

    messageAdministration,

    setMessageAdministration,

  ] = useState("");

  const [

    connexionAdministrationEnCours,

    setConnexionAdministrationEnCours,

  ] = useState(false);

  // =========================================================

  // CONNEXION PARENT

  // =========================================================

  async function soumettreConnexionParent(e) {

    e.preventDefault();

    const courrielNormalise =

      courriel.trim().toLowerCase();

    const { error } =

      await supabase.auth.signInWithPassword({

        email: courrielNormalise,

        password: motDePasse,

      });

    if (error) {

      console.error(error);

      alert(

        "Courriel ou mot de passe invalide."

      );

      return;

    }

    // App.jsx détectera automatiquement

    // la nouvelle session et le rôle.

  }

  // =========================================================

  // CRÉATION COMPTE PARENT

  // =========================================================

  function modifierChampCreation(e) {

    const { name, value } = e.target;

    setFormulaireCreation((ancien) => ({

      ...ancien,

      [name]: value,

    }));

  }

  function fermerCreationCompte() {

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

    const prenom =

      formulaireCreation.prenom.trim();

    const nom =

      formulaireCreation.nom.trim();

    const telephone =

      formulaireCreation.telephone.trim();

    const courrielNormalise =

      formulaireCreation.courriel

        .trim()

        .toLowerCase();

    if (

      !prenom ||

      !nom ||

      !telephone ||

      !courrielNormalise

    ) {

      setMessageCreation(

        "Veuillez remplir tous les champs obligatoires."

      );

      return;

    }

    if (

      formulaireCreation.motDePasse.length < 6

    ) {

      setMessageCreation(

        "Le mot de passe doit contenir au moins 6 caractères."

      );

      return;

    }

    if (

      formulaireCreation.motDePasse !==

      formulaireCreation.confirmationMotDePasse

    ) {

      setMessageCreation(

        "Les deux mots de passe ne correspondent pas."

      );

      return;

    }

    setCreationEnCours(true);

    const { error } =

      await supabase.auth.signUp({

        email: courrielNormalise,

        password:

          formulaireCreation.motDePasse,

        options: {

          data: {

            prenom,

            nom,

            telephone,

          },

        },

      });

    setCreationEnCours(false);

    if (error) {

      console.error(error);

      setMessageCreation(

        `Impossible de créer le compte : ${error.message}`

      );

      return;

    }

    setMessageCreation(

      "Compte créé avec succès. Vous pouvez maintenant vous connecter."

    );

    setCourriel(courrielNormalise);

  }

  // =========================================================

  // CONNEXION ADMINISTRATION

  // =========================================================

  // CONNEXION ENTRAÎNEUR

  // =========================================================

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

    const courrielNormalise =

      courrielEntraineur

        .trim()

        .toLowerCase();

    if (

      !courrielNormalise ||

      !motDePasseEntraineur

    ) {

      setMessageEntraineur(

        "Veuillez entrer votre courriel et votre mot de passe."

      );

      return;

    }

    setConnexionEntraineurEnCours(true);

    const { data, error } =

      await supabase.auth.signInWithPassword({

        email: courrielNormalise,

        password: motDePasseEntraineur,

      });

    if (error) {

      console.error(error);

      setConnexionEntraineurEnCours(false);

      setMessageEntraineur(

        "Courriel ou mot de passe invalide."

      );

      return;

    }

    if (!data.user) {

      setConnexionEntraineurEnCours(false);

      setMessageEntraineur(

        "Impossible de charger le compte."

      );

      return;

    }

    const {

      data: profilUtilisateur,

      error: erreurProfil,

    } = await supabase

      .from("profils")

      .select("role, actif")

      .eq("id", data.user.id)

      .single();

    if (erreurProfil) {

      console.error(erreurProfil);

      await supabase.auth.signOut();

      setConnexionEntraineurEnCours(false);

      setMessageEntraineur(

        "Impossible de vérifier les droits de l'entraîneur."

      );

      return;

    }

    if (

      profilUtilisateur.role !==

      "entraineur"

    ) {

      await supabase.auth.signOut();

      setConnexionEntraineurEnCours(false);

      setMessageEntraineur(

        "Ce compte n'est pas un compte entraîneur."

      );

      return;

    }

    if (!profilUtilisateur.actif) {

      await supabase.auth.signOut();

      setConnexionEntraineurEnCours(false);

      setMessageEntraineur(

        "Ce compte entraîneur est désactivé."

      );

      return;

    }

    setConnexionEntraineurEnCours(false);

    // App.jsx détectera automatiquement

    // la session et affichera EspaceEntraineur.

  }

  // =========================================================

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

    const courrielNormalise =

      courrielAdministration

        .trim()

        .toLowerCase();

    if (

      !courrielNormalise ||

      !motDePasseAdministration

    ) {

      setMessageAdministration(

        "Veuillez entrer votre courriel et votre mot de passe."

      );

      return;

    }

    setConnexionAdministrationEnCours(true);

    const { data, error } =

      await supabase.auth.signInWithPassword({

        email: courrielNormalise,

        password: motDePasseAdministration,

      });

    if (error) {

      console.error(error);

      setConnexionAdministrationEnCours(false);

      setMessageAdministration(

        "Courriel ou mot de passe invalide."

      );

      return;

    }

    if (!data.user) {

      setConnexionAdministrationEnCours(false);

      setMessageAdministration(

        "Impossible de charger le compte."

      );

      return;

    }

    const {

      data: profilUtilisateur,

      error: erreurProfil,

    } = await supabase

      .from("profils")

      .select("role, actif")

      .eq("id", data.user.id)

      .single();

    if (erreurProfil) {

      console.error(erreurProfil);

      await supabase.auth.signOut();

      setConnexionAdministrationEnCours(false);

      setMessageAdministration(

        "Impossible de vérifier les droits d'administration."

      );

      return;

    }

    if (

      profilUtilisateur.role !==

      "administrateur"

    ) {

      await supabase.auth.signOut();

      setConnexionAdministrationEnCours(false);

      setMessageAdministration(

        "Ce compte n'est pas un compte administrateur."

      );

      return;

    }

    if (!profilUtilisateur.actif) {

      await supabase.auth.signOut();

      setConnexionAdministrationEnCours(false);

      setMessageAdministration(

        "Ce compte administrateur est désactivé."

      );

      return;

    }

    // App.jsx détectera la session et affichera

    // automatiquement AdministrationApp.

  }

  // =========================================================

  // AFFICHAGE

  // =========================================================

  return (

    <main className="page-accueil">

      <div className="accueil-conteneur">

        <header className="accueil-entete">

          <img

            src="/logo-attack.png"

            alt="Logo Volley-Ball Attack Sept-Îles"

            className="logo-attack"

          />

          <h1>

            Volley-Ball Attack Sept-Îles

          </h1>

          <p className="accueil-sous-titre">

            Inscription aux activités de

            volleyball

          </p>

        </header>

        {/* ================================================= */}

        {/* ESPACE PARENT */}

        {/* ================================================= */}

        <section className="carte-connexion carte-parent">

          <h2>Espace parent</h2>

          <form

            className="formulaire-connexion"

            onSubmit={soumettreConnexionParent}

          >

            <div className="champ-formulaire">

              <label htmlFor="courriel-parent">

                Courriel

              </label>

              <input

                id="courriel-parent"

                type="email"

                value={courriel}

                onChange={(e) =>

                  setCourriel(e.target.value)

                }

                autoComplete="email"

                required

              />

            </div>

            <div className="champ-formulaire">

              <label htmlFor="mot-passe-parent">

                Mot de passe

              </label>

              <input

                id="mot-passe-parent"

                type="password"

                value={motDePasse}

                onChange={(e) =>

                  setMotDePasse(e.target.value)

                }

                autoComplete="current-password"

                required

              />

            </div>

            <button

              type="submit"

              className="bouton bouton-principal"

            >

              Se connecter

            </button>

          </form>

          <div className="separateur-parent" />

          <div className="creation-compte">

            <p>

              Pas encore de compte ?

            </p>

            <button

              type="button"

              className="bouton bouton-secondaire"

              onClick={() =>

                setAfficherCreationCompte(true)

              }

            >

              Créer un compte parent

            </button>

          </div>

        </section>

        {/* ================================================= */}

        {/* ACCÈS SECONDAIRES */}

        {/* ================================================= */}

        <section className="carte-acces-secondaires">

          <div className="acces-secondaire">

            <div className="icone-acces">

              🏐

            </div>

            <h2>Accès entraîneur</h2>

            <p>

              Accédez à votre espace

              entraîneur.

            </p>

            <button

              type="button"

              className="bouton bouton-secondaire"

              onClick={

                ouvrirConnexionEntraineur

              }

            >

              Connexion entraîneur

            </button>

          </div>

          <div className="division-acces" />

          <div className="acces-secondaire">

            <div className="icone-acces">

              ⚙

            </div>

            <h2>

              Accès administration

            </h2>

            <p>

              Gestion administrative de la

              plateforme.

            </p>

            <button

              type="button"

              className="bouton bouton-secondaire"

              onClick={

                ouvrirConnexionAdministration

              }

            >

              Connexion administration

            </button>

          </div>

        </section>

      </div>

      {/* =================================================== */}

      {/* MODALE CRÉATION COMPTE PARENT */}

      {/* =================================================== */}

      {afficherCreationCompte && (

        <div

          className="fond-modale"

          onMouseDown={fermerCreationCompte}

        >

          <section

            className="modale-creation-compte"

            onMouseDown={(e) =>

              e.stopPropagation()

            }

          >

            <div className="entete-modale">

              <h2>

                Créer un compte parent

              </h2>

              <button

                type="button"

                className="bouton-fermer-modale"

                onClick={

                  fermerCreationCompte

                }

                aria-label="Fermer"

              >

                ×

              </button>

            </div>

            <form

              className="formulaire-creation-compte"

              onSubmit={

                soumettreCreationCompte

              }

            >

              <div className="ligne-formulaire">

                <div className="champ-formulaire">

                  <label htmlFor="creation-prenom">

                    Prénom

                  </label>

                  <input

                    id="creation-prenom"

                    name="prenom"

                    type="text"

                    value={

                      formulaireCreation.prenom

                    }

                    onChange={

                      modifierChampCreation

                    }

                    required

                  />

                </div>

                <div className="champ-formulaire">

                  <label htmlFor="creation-nom">

                    Nom

                  </label>

                  <input

                    id="creation-nom"

                    name="nom"

                    type="text"

                    value={

                      formulaireCreation.nom

                    }

                    onChange={

                      modifierChampCreation

                    }

                    required

                  />

                </div>

              </div>

              <div className="champ-formulaire">

                <label htmlFor="creation-telephone">

                  Téléphone

                </label>

                <input

                  id="creation-telephone"

                  name="telephone"

                  type="tel"

                  value={

                    formulaireCreation.telephone

                  }

                  onChange={

                    modifierChampCreation

                  }

                  autoComplete="tel"

                  required

                />

              </div>

              <div className="champ-formulaire">

                <label htmlFor="creation-courriel">

                  Courriel

                </label>

                <input

                  id="creation-courriel"

                  name="courriel"

                  type="email"

                  value={

                    formulaireCreation.courriel

                  }

                  onChange={

                    modifierChampCreation

                  }

                  autoComplete="email"

                  required

                />

              </div>

              <div className="champ-formulaire">

                <label htmlFor="creation-mot-passe">

                  Mot de passe

                </label>

                <input

                  id="creation-mot-passe"

                  name="motDePasse"

                  type="password"

                  value={

                    formulaireCreation.motDePasse

                  }

                  onChange={

                    modifierChampCreation

                  }

                  autoComplete="new-password"

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

                  value={

                    formulaireCreation

                      .confirmationMotDePasse

                  }

                  onChange={

                    modifierChampCreation

                  }

                  autoComplete="new-password"

                  required

                />

              </div>

              {messageCreation && (

                <p className="message-creation">

                  {messageCreation}

                </p>

              )}

              <div className="actions-modale">

                <button

                  type="button"

                  className="bouton bouton-secondaire"

                  onClick={

                    fermerCreationCompte

                  }

                >

                  Annuler

                </button>

                <button

                  type="submit"

                  className="bouton bouton-principal"

                  disabled={creationEnCours}

                >

                  {creationEnCours

                    ? "Création..."

                    : "Créer le compte"}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}

      {/* =================================================== */}

      {/* MODALE CONNEXION ENTRAÎNEUR */}

      {/* =================================================== */}

      {afficherConnexionEntraineur && (

        <div

          className="fond-modale"

          onMouseDown={

            fermerConnexionEntraineur

          }

        >

          <section

            className="modale-creation-compte"

            onMouseDown={(e) =>

              e.stopPropagation()

            }

          >

            <div className="entete-modale">

              <h2>

                Connexion entraîneur

              </h2>

              <button

                type="button"

                className="bouton-fermer-modale"

                onClick={

                  fermerConnexionEntraineur

                }

                disabled={

                  connexionEntraineurEnCours

                }

                aria-label="Fermer"

              >

                ×

              </button>

            </div>

            <form

              className="formulaire-creation-compte"

              onSubmit={

                soumettreConnexionEntraineur

              }

            >

              <div className="champ-formulaire">

                <label htmlFor="courriel-entraineur">

                  Courriel

                </label>

                <input

                  id="courriel-entraineur"

                  type="email"

                  value={courrielEntraineur}

                  onChange={(e) =>

                    setCourrielEntraineur(

                      e.target.value

                    )

                  }

                  autoComplete="email"

                  required

                />

              </div>

              <div className="champ-formulaire">

                <label htmlFor="mot-passe-entraineur">

                  Mot de passe

                </label>

                <input

                  id="mot-passe-entraineur"

                  type="password"

                  value={motDePasseEntraineur}

                  onChange={(e) =>

                    setMotDePasseEntraineur(

                      e.target.value

                    )

                  }

                  autoComplete="current-password"

                  required

                />

              </div>

              {messageEntraineur && (

                <p className="message-creation">

                  {messageEntraineur}

                </p>

              )}

              <div className="actions-modale">

                <button

                  type="button"

                  className="bouton bouton-secondaire"

                  onClick={

                    fermerConnexionEntraineur

                  }

                  disabled={

                    connexionEntraineurEnCours

                  }

                >

                  Annuler

                </button>

                <button

                  type="submit"

                  className="bouton bouton-principal"

                  disabled={

                    connexionEntraineurEnCours

                  }

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

      {/* =================================================== */}

      {/* MODALE CONNEXION ADMINISTRATION */}

      {/* =================================================== */}

      {afficherConnexionAdministration && (

        <div

          className="fond-modale"

          onMouseDown={

            fermerConnexionAdministration

          }

        >

          <section

            className="modale-creation-compte"

            onMouseDown={(e) =>

              e.stopPropagation()

            }

          >

            <div className="entete-modale">

              <h2>

                Connexion administration

              </h2>

              <button

                type="button"

                className="bouton-fermer-modale"

                onClick={

                  fermerConnexionAdministration

                }

                disabled={

                  connexionAdministrationEnCours

                }

                aria-label="Fermer"

              >

                ×

              </button>

            </div>

            <form

              className="formulaire-creation-compte"

              onSubmit={

                soumettreConnexionAdministration

              }

            >

              <div className="champ-formulaire">

                <label htmlFor="courriel-administration">

                  Courriel

                </label>

                <input

                  id="courriel-administration"

                  type="email"

                  value={

                    courrielAdministration

                  }

                  onChange={(e) =>

                    setCourrielAdministration(

                      e.target.value

                    )

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

                  value={

                    motDePasseAdministration

                  }

                  onChange={(e) =>

                    setMotDePasseAdministration(

                      e.target.value

                    )

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

                  onClick={

                    fermerConnexionAdministration

                  }

                  disabled={

                    connexionAdministrationEnCours

                  }

                >

                  Annuler

                </button>

                <button

                  type="submit"

                  className="bouton bouton-principal"

                  disabled={

                    connexionAdministrationEnCours

                  }

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
