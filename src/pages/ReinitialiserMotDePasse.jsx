import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function ReinitialiserMotDePasse() {
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [sessionPrete, setSessionPrete] = useState(false);
  const [traitement, setTraitement] = useState(false);

  useEffect(() => {
    let actif = true;

    async function verifierSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!actif) return;

      if (error) {
        console.error("Erreur getSession :", error);
        setMessage(
          "Impossible de valider le lien de réinitialisation. Veuillez demander un nouveau lien."
        );
        return;
      }

      if (data.session) {
        setSessionPrete(true);
      }
    }

    verifierSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!actif) return;

      if (
        (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
        session
      ) {
        setSessionPrete(true);
        setMessage("");
      }
    });

    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    setMessage("");

    if (motDePasse.length < 6) {
      setMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setTraitement(true);

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    setTraitement(false);

    if (error) {
      console.error("Erreur updateUser :", error);

      const messageErreur = error.message?.toLowerCase() || "";

      if (
        messageErreur.includes("same password") ||
        messageErreur.includes("different from the old password") ||
        messageErreur.includes("new password should be different")
      ) {
        setMessage(
          "Votre nouveau mot de passe doit être différent de votre mot de passe actuel."
        );
      } else {
        setMessage(
          "Impossible de modifier le mot de passe. Veuillez demander un nouveau lien de récupération et réessayer."
        );
      }

      return;
    }

    setMessage("Mot de passe modifié avec succès. Retour à la connexion...");

    await supabase.auth.signOut();
    sessionStorage.removeItem("volleyball-attack-espace");

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  }

  return (
    <main className="page-accueil">
      <div className="accueil-conteneur">
        <section className="carte-connexion carte-parent">
          <h2>Réinitialiser le mot de passe</h2>

          {!sessionPrete ? (
            <>
              <p className="message-creation">
                Validation du lien de réinitialisation...
              </p>

              {message && (
                <p className="message-creation">{message}</p>
              )}
            </>
          ) : (
            <form className="formulaire-connexion" onSubmit={soumettre}>
              <div className="champ-formulaire">
                <label htmlFor="nouveau-mot-passe">
                  Nouveau mot de passe
                </label>

                <input
                  id="nouveau-mot-passe"
                  type="password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <div className="champ-formulaire">
                <label htmlFor="confirmation-mot-passe">
                  Confirmer le mot de passe
                </label>

                <input
                  id="confirmation-mot-passe"
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              {message && (
                <p className="message-creation">{message}</p>
              )}

              <button
                type="submit"
                className="bouton bouton-principal"
                disabled={traitement}
              >
                {traitement
                  ? "Modification..."
                  : "Modifier le mot de passe"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default ReinitialiserMotDePasse;
