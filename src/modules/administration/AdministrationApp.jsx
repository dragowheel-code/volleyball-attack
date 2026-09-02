import { useState } from "react";

import { supabase } from "../../lib/supabaseClient";

import GestionSaisons from "./pages/GestionSaisons";
import GestionGymnases from "./pages/GestionGymnases";
import GestionCours from "./pages/GestionCours";
import GestionEntraineurs from "./pages/GestionEntraineurs";
import GestionAffectationsEntraineurs from "./pages/GestionAffectationsEntraineurs";
import GestionInscriptions from "./pages/GestionInscriptions";

import GestionFinance from "./finance/GestionFinance";
import GestionContrats from "./contrats/GestionContrats";
import GestionAdministrateurs from "./administrateurs/GestionAdministrateurs";

import "./AdministrationApp.css";

const SECTIONS_ADMINISTRATION = [
  {
    id: "saisons",
    icone: "📅",
    titre: "Saisons",
    description:
      "Créer et gérer les saisons d'inscription.",
  },
  {
    id: "gymnases",
    icone: "🏫",
    titre: "Gymnases",
    description:
      "Créer et gérer les lieux où se déroulent les activités.",
  },
  {
    id: "cours",
    icone: "🏐",
    titre: "Cours",
    description:
      "Créer les cours, leurs groupes, capacités et horaires.",
  },
  {
    id: "entraineurs",
    icone: "👤",
    titre: "Entraîneurs",
    description:
      "Gérer les entraîneurs et leurs accès.",
  },
  {
    id: "affectations-entraineurs",
    icone: "📋",
    titre: "Affectations",
    description:
      "Affecter les entraîneurs aux groupes de la saison.",
  },
  {
    id: "inscriptions",
    icone: "📝",
    titre: "Inscriptions",
    description:
      "Consulter et gérer les inscriptions.",
  },
  {
    id: "finance",
    icone: "💰",
    titre: "Finance",
    description:
      "Consulter les revenus, paiements et remboursements.",
  },
  {
    id: "contrats",
    icone: "📄",
    titre: "Contrats",
    description:
      "Gérer les contrats, politiques et leurs versions.",
  },
  {
  id: "administrateurs",
  icone: "🔐",
  titre: "Administrateurs",
  description:
    "Inviter, consulter et révoquer les accès administrateurs.",
  },
];

function AdministrationApp({ profil }) {
  const [sectionActive, setSectionActive] =
    useState(null);

  const [
    deconnexionEnCours,
    setDeconnexionEnCours,
  ] = useState(false);

  async function seDeconnecter() {
    setDeconnexionEnCours(true);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Erreur lors de la déconnexion :",
        error
      );

      alert(
        `Impossible de vous déconnecter : ${error.message}`
      );

      setDeconnexionEnCours(false);
    }
  }

  function afficherSection() {
    if (sectionActive === "saisons") {
      return <GestionSaisons />;
    }

    if (sectionActive === "gymnases") {
      return <GestionGymnases />;
    }

    if (sectionActive === "cours") {
      return <GestionCours />;
    }

    if (sectionActive === "entraineurs") {
      return <GestionEntraineurs />;
    }

    if (
      sectionActive ===
      "affectations-entraineurs"
    ) {
      return (
        <GestionAffectationsEntraineurs />
      );
    }

    if (sectionActive === "inscriptions") {
      return <GestionInscriptions />;
    }

    if (sectionActive === "finance") {
      return <GestionFinance />;
    }

    if (sectionActive === "contrats") {
      return <GestionContrats />;
    }

    if (sectionActive === "administrateurs") {
      return <GestionAdministrateurs />;
    }

    const section =
      SECTIONS_ADMINISTRATION.find(
        (element) =>
          element.id === sectionActive
      );

    return (
      <section className="admin-section-page">
        <div className="admin-section-entete">
          <div className="admin-section-icone">
            {section?.icone}
          </div>

          <div>
            <h1>{section?.titre}</h1>
            <p>{section?.description}</p>
          </div>
        </div>

        <div className="admin-section-vide">
          Cette section sera construite
          prochainement.
        </div>
      </section>
    );
  }

  if (sectionActive) {
    return (
      <main className="admin-page">
        <div className="admin-conteneur">
          <div className="admin-navigation">
            <button
              type="button"
              className="admin-bouton admin-bouton-secondaire"
              onClick={() =>
                setSectionActive(null)
              }
            >
              ← Administration
            </button>

            <button
              type="button"
              className="admin-bouton admin-bouton-secondaire"
              onClick={seDeconnecter}
              disabled={deconnexionEnCours}
            >
              {deconnexionEnCours
                ? "Déconnexion..."
                : "Déconnexion"}
            </button>
          </div>

          {afficherSection()}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-conteneur">
        <header className="admin-entete">
          <div>
            <p className="admin-sur-titre">
              Volley-Ball Attack Sept-Îles
            </p>

            <h1>Administration</h1>

            <p className="admin-description">
              Gestion de la plateforme
              d'inscription.
            </p>

            {profil &&
              (profil.prenom ||
                profil.nom) && (
                <p className="admin-utilisateur">
                  Bonjour{" "}
                  <strong>
                    {profil.prenom}{" "}
                    {profil.nom}
                  </strong>
                </p>
              )}
          </div>

          <button
            type="button"
            className="admin-bouton admin-bouton-secondaire"
            onClick={seDeconnecter}
            disabled={deconnexionEnCours}
          >
            {deconnexionEnCours
              ? "Déconnexion..."
              : "Déconnexion"}
          </button>
        </header>

        <section className="admin-tableau">
          <div className="admin-tableau-entete">
            <h2>Tableau de bord</h2>

            <p>
              Sélectionnez une section pour
              commencer.
            </p>
          </div>

          <div className="admin-grille">
            {SECTIONS_ADMINISTRATION.map(
              (section) => (
                <article
                  key={section.id}
                  className="admin-carte"
                >
                  <div className="admin-carte-icone">
                    {section.icone}
                  </div>

                  <div className="admin-carte-contenu">
                    <h3>{section.titre}</h3>

                    <p>
                      {section.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-bouton admin-bouton-principal"
                    onClick={() =>
                      setSectionActive(
                        section.id
                      )
                    }
                  >
                    Ouvrir
                  </button>
                </article>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default AdministrationApp;