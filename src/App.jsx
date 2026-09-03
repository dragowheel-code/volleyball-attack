import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Accueil from "./pages/Accueil";
import ReinitialiserMotDePasse from "./pages/ReinitialiserMotDePasse";
import EspaceParent from "./pages/EspaceParent";
import EspaceEntraineur from "./pages/EspaceEntraineur";
import AdministrationApp from "./modules/administration/AdministrationApp";
const CLE_ESPACE_CONNEXION = "volleyball-attack-espace";
function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [espaceConnexion, setEspaceConnexion] = useState(() => {
    return sessionStorage.getItem(CLE_ESPACE_CONNEXION);
  });
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
        actif,
        est_parent,
        est_entraineur,
        est_administrateur
      `)
      .eq("id", userId)
      .single();
    if (error) {
      console.error(
        "Erreur lors du chargement du profil :",
        error
      );
      setProfil(null);
      return null;
    }
    setProfil(data);
    return data;
  }
  // =========================================================
  // DÉTERMINER UN ESPACE AUTOMATIQUEMENT
  // =========================================================
  function determinerEspaceUnique(profilUtilisateur) {
    if (!profilUtilisateur) {
      return null;
    }
    const espaces = [];
    if (profilUtilisateur.est_parent) {
      espaces.push("parent");
    }
    if (profilUtilisateur.est_entraineur) {
      espaces.push("entraineur");
    }
    if (profilUtilisateur.est_administrateur) {
      espaces.push("administration");
    }
    if (espaces.length === 1) {
      return espaces[0];
    }
    return null;
  }
  // =========================================================
  // CHANGER D'ESPACE
  // =========================================================
  function choisirEspace(espace) {
    sessionStorage.setItem(
      CLE_ESPACE_CONNEXION,
      espace
    );
    setEspaceConnexion(espace);
  }
  // =========================================================
  // DÉCONNEXION
  // =========================================================
  async function deconnexion() {
    sessionStorage.removeItem(
      CLE_ESPACE_CONNEXION
    );
    setEspaceConnexion(null);
    await supabase.auth.signOut();
  }
  // =========================================================
  // SESSION SUPABASE
  // =========================================================
  useEffect(() => {
    let actif = true;
    async function initialiserSession() {
      const {
        data: { session: sessionActuelle },
      } = await supabase.auth.getSession();
      if (!actif) {
        return;
      }
      setSession(sessionActuelle);
      if (sessionActuelle?.user) {
        const profilCharge = await chargerProfil(
          sessionActuelle.user.id
        );
        if (!actif) {
          return;
        }
        const espaceMemorise =
          sessionStorage.getItem(
            CLE_ESPACE_CONNEXION
          );
        if (espaceMemorise) {
          setEspaceConnexion(espaceMemorise);
        } else {
          const espaceUnique =
            determinerEspaceUnique(profilCharge);
          if (espaceUnique) {
            sessionStorage.setItem(
              CLE_ESPACE_CONNEXION,
              espaceUnique
            );
            setEspaceConnexion(espaceUnique);
          }
        }
      } else {
        setProfil(null);
        setEspaceConnexion(null);
      }
      setChargement(false);
    }
    initialiserSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, nouvelleSession) => {
        if (!actif) {
          return;
        }
        setSession(nouvelleSession);
        if (event === "SIGNED_OUT") {
          sessionStorage.removeItem(
            CLE_ESPACE_CONNEXION
          );
          setProfil(null);
          setEspaceConnexion(null);
          setChargement(false);
          return;
        }
        if (nouvelleSession?.user) {
          const profilCharge =
            await chargerProfil(
              nouvelleSession.user.id
            );
          if (!actif) {
            return;
          }
          const espaceMemorise =
            sessionStorage.getItem(
              CLE_ESPACE_CONNEXION
            );
          if (espaceMemorise) {
            setEspaceConnexion(
              espaceMemorise
            );
          } else {
            const espaceUnique =
              determinerEspaceUnique(
                profilCharge
              );
            if (espaceUnique) {
              sessionStorage.setItem(
                CLE_ESPACE_CONNEXION,
                espaceUnique
              );
              setEspaceConnexion(
                espaceUnique
              );
            }
          }
        } else {
          setProfil(null);
          setEspaceConnexion(null);
        }
        setChargement(false);
      }
    );
    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, []);
  // =========================================================
  // CHARGEMENT
  // =========================================================
  if (window.location.pathname === "/reinitialiser-mot-de-passe") {
    return <ReinitialiserMotDePasse />;
  }
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
          onClick={deconnexion}
        >
          Retour à l'accueil
        </button>
      </main>
    );
  }
  // =========================================================
  // COMPTE GLOBAL DÉSACTIVÉ
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
          onClick={deconnexion}
        >
          Retour à l'accueil
        </button>
      </main>
    );
  }
  // =========================================================
  // PARENT
  // =========================================================
  if (
    espaceConnexion === "parent" &&
    profil.est_parent
  ) {
    return (
      <EspaceParent profil={profil} />
    );
  }
  // =========================================================
  // ENTRAÎNEUR
  // =========================================================
  if (
    espaceConnexion === "entraineur" &&
    profil.est_entraineur
  ) {
    return (
      <EspaceEntraineur profil={profil} />
    );
  }
  // =========================================================
  // ADMINISTRATION
  // =========================================================
  if (
    espaceConnexion === "administration" &&
    profil.est_administrateur
  ) {
    return (
      <AdministrationApp
        profil={profil}
      />
    );
  }
  // =========================================================
  // ESPACE MÉMORISÉ NON AUTORISÉ
  // =========================================================
  const espacesDisponibles = [];
  if (profil.est_parent) {
    espacesDisponibles.push("parent");
  }
  if (profil.est_entraineur) {
    espacesDisponibles.push("entraineur");
  }
  if (profil.est_administrateur) {
    espacesDisponibles.push("administration");
  }
  // =========================================================
  // AUCUN ACCÈS
  // =========================================================
  if (espacesDisponibles.length === 0) {
    return (
      <main className="page-chargement">
        <p>
          Votre compte ne possède actuellement
          aucun accès actif.
        </p>
        <button
          type="button"
          className="bouton bouton-secondaire"
          onClick={deconnexion}
        >
          Déconnexion
        </button>
      </main>
    );
  }
  // =========================================================
  // PLUSIEURS ACCÈS :
  // CHOISIR L'ESPACE À OUVRIR
  // =========================================================
  return (
    <main className="page-chargement">
      <h1>Choisir un espace</h1>
      <p>
        Votre compte possède plusieurs accès.
        Choisissez l'espace que vous souhaitez
        ouvrir.
      </p>
      {profil.est_parent && (
        <button
          type="button"
          className="bouton bouton-principal"
          onClick={() =>
            choisirEspace("parent")
          }
        >
          Espace parent
        </button>
      )}
      {profil.est_entraineur && (
        <button
          type="button"
          className="bouton bouton-principal"
          onClick={() =>
            choisirEspace("entraineur")
          }
        >
          Espace entraîneur
        </button>
      )}
      {profil.est_administrateur && (
        <button
          type="button"
          className="bouton bouton-principal"
          onClick={() =>
            choisirEspace("administration")
          }
        >
          Administration
        </button>
      )}
      <button
        type="button"
        className="bouton bouton-secondaire"
        onClick={deconnexion}
      >
        Déconnexion
      </button>
    </main>
  );
}
export default App;
