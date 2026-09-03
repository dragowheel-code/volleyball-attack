import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./AccepterInvitationAdministrateur.css";

export default function AccepterInvitationAdministrateur() {
  const [chargement, setChargement] = useState(true);
  const [sessionValide, setSessionValide] = useState(false);
  const [acces, setAcces] = useState({
    est_parent: false,
    est_entraineur: false,
    est_administrateur: false,
  });
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  async function chargerAcces(userId) {
    if (!userId) {
      setAcces({
        est_parent: false,
        est_entraineur: false,
        est_administrateur: false,
      });
      return;
    }

    const { data, error } = await supabase
      .from("profils")
      .select(`
        est_parent,
        est_entraineur,
        est_administrateur,
        actif
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Impossible de charger les accès :", error);
      setAcces({
        est_parent: false,
        est_entraineur: false,
        est_administrateur: false,
      });
      return;
    }

    if (!data || data.actif !== true) {
      setAcces({
        est_parent: false,
        est_entraineur: false,
        est_administrateur: false,
      });
      return;
    }

    setAcces({
      est_parent: data.est_parent === true,
      est_entraineur: data.est_entraineur === true,
      est_administrateur: data.est_administrateur === true,
    });
  }

  useEffect(() => {
    let actif = true;

    const verifierSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!actif) {
        return;
      }

      if (session?.user) {
        setSessionValide(true);
        await chargerAcces(session.user.id);
      } else {
        setSessionValide(false);
        setAcces({
          est_parent: false,
          est_entraineur: false,
          est_administrateur: false,
        });
      }

      if (actif) {
        setChargement(false);
      }
    };

    verifierSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!actif) {
        return;
      }

      if (session?.user) {
        setSessionValide(true);
        await chargerAcces(session.user.id);
      } else {
        setSessionValide(false);
        setAcces({
          est_parent: false,
          est_entraineur: false,
          est_administrateur: false,
        });
      }

      if (actif) {
        setChargement(false);
      }
    });

    return () => {
      actif = false;
      subscription.unsubscribe();
    };
  }, []);

  const enregistrerMotDePasse = async (event) => {
    event.preventDefault();
    setErreur("");
    setSucces("");

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnregistrement(true);

    const { error } = await supabase.auth.updateUser({
      password: motDePasse,
    });

    setEnregistrement(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    setMotDePasse("");
    setConfirmation("");

    if (acces.est_administrateur && acces.est_entraineur) {
      setSucces(
        "Vos accès administrateur et entraîneur sont maintenant activés."
      );
    } else if (acces.est_administrateur) {
      setSucces("Votre accès administrateur est maintenant activé.");
    } else if (acces.est_entraineur) {
      setSucces("Votre accès entraîneur est maintenant activé.");
    } else if (acces.est_parent) {
      setSucces("Votre accès parent est maintenant activé.");
    } else {
      setSucces("Votre accès est maintenant activé.");
    }
  };

  function libelleAcces() {
    const libelles = [];

    if (acces.est_parent) {
      libelles.push("parent");
    }

    if (acces.est_entraineur) {
      libelles.push("entraîneur");
    }

    if (acces.est_administrateur) {
      libelles.push("administrateur");
    }

    if (libelles.length === 0) {
      return "";
    }

    if (libelles.length === 1) {
      return ` ${libelles[0]}`;
    }

    if (libelles.length === 2) {
      return ` ${libelles[0]} et ${libelles[1]}`;
    }

    return ` ${libelles[0]}, ${libelles[1]} et ${libelles[2]}`;
  }

  if (chargement) {
    return (
      <div className="acceptation-admin-page">
        <div className="acceptation-admin-carte">
          <p>Validation de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (!sessionValide) {
    return (
      <div className="acceptation-admin-page">
        <div className="acceptation-admin-carte">
          <h1>Invitation</h1>
          <div className="acceptation-admin-erreur">
            Cette invitation est invalide ou expirée.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="acceptation-admin-page">
      <div className="acceptation-admin-carte">
        <h1>Bienvenue</h1>

        <p className="acceptation-admin-description">
          Choisissez votre mot de passe pour terminer l'activation de votre
          accès{libelleAcces()}.
        </p>

        {erreur && (
          <div className="acceptation-admin-erreur">
            {erreur}
          </div>
        )}

        {succes ? (
          <div className="acceptation-admin-succes">
            <strong>{succes}</strong>

            <p>
              Vous pouvez maintenant accéder à l'application.
            </p>

            <button
              type="button"
              className="acceptation-admin-bouton"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Continuer
            </button>
          </div>
        ) : (
          <form
            className="acceptation-admin-formulaire"
            onSubmit={enregistrerMotDePasse}
          >
            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirmer le mot de passe
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <button
              type="submit"
              className="acceptation-admin-bouton"
              disabled={enregistrement}
            >
              {enregistrement ? "Activation..." : "Activer mon accès"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}