import { useEffect, useState } from "react";

import { supabase } from "./lib/supabaseClient";

import Accueil from "./pages/Accueil";
import EspaceParent from "./pages/EspaceParent";
import EspaceEntraineur from "./pages/EspaceEntraineur";

import AdministrationApp from "./modules/administration/AdministrationApp";

function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] =
    useState(true);

  // =========================================================
  // CHARGER LE PROFIL
  // =========================================================

  async function chargerProfil(userId) {
    const { data, error } = await supabase
      .from("profils")
      .select(`
        id,
        prenom,
        nom,
        role,
        actif
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "Erreur lors du chargement du profil :",
        error
      );

      setProfil(null);

      return;
    }

    setProfil(data);
  }

  // =========================================================
  // SESSION SUPABASE
  // =========================================================

  useEffect(() => {
    async function initialiserSession() {
      const {
        data: { session: sessionActuelle },
      } = await supabase.auth.getSession();

      setSession(sessionActuelle);

      if (sessionActuelle?.user) {
        await chargerProfil(
          sessionActuelle.user.id
        );
      } else {
        setProfil(null);
      }

      setChargement(false);
    }

    initialiserSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nouvelleSession) => {
        setSession(nouvelleSession);

        if (nouvelleSession?.user) {
          await chargerProfil(
            nouvelleSession.user.id
          );
        } else {
          setProfil(null);
        }

        setChargement(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // =========================================================
  // CHARGEMENT
  // =========================================================

  if (chargement) {
    return (
      <main className="page-chargement">
        <p>Chargement...</p>
      </main>
    );
  }

  // =========================================================
  // AUCUNE SESSION
  // =========================================================

  if (!session) {
    return <Accueil />;
  }

  // =========================================================
  // PROFIL INTROUVABLE
  // =========================================================

  if (!profil) {
    return (
      <main className="page-chargement">
        <p>
          Impossible de charger votre profil.
        </p>

        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Retour à l'accueil
        </button>
      </main>
    );
  }

  // =========================================================
  // COMPTE INACTIF
  // =========================================================

  if (!profil.actif) {
    return (
      <main className="page-chargement">
        <p>
          Votre compte est actuellement
          désactivé.
        </p>

        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          Retour à l'accueil
        </button>
      </main>
    );
  }

  // =========================================================
  // PARENT
  // =========================================================

  if (profil.role === "parent") {
    return (
      <EspaceParent profil={profil} />
    );
  }

  // =========================================================
  // ADMINISTRATION
  // =========================================================

  if (
    profil.role === "administrateur"
  ) {
    return (
      <AdministrationApp
        profil={profil}
      />
    );
  }

  // =========================================================
// ENTRAÎNEUR
// =========================================================

if (profil.role === "entraineur") {
  return (
    <EspaceEntraineur profil={profil} />
  );
}

  // =========================================================
  // RÔLE INCONNU
  // =========================================================

  return (
    <main className="page-chargement">
      <p>
        Votre compte ne possède pas de rôle
        valide.
      </p>

      <button
        type="button"
        className="bouton bouton-secondaire"
        onClick={async () => {
          await supabase.auth.signOut();
        }}
      >
        Déconnexion
      </button>
    </main>
  );
}

export default App;