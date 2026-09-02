import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";

import "./AccepterInvitationAdministrateur.css";

export default function AccepterInvitationAdministrateur() {
  const [chargement, setChargement] = useState(true);
  const [sessionValide, setSessionValide] = useState(false);
  const [role, setRole] = useState(null);

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");

  async function chargerRole(userId) {
    if (!userId) {
      setRole(null);
      return;
    }

    const { data, error } = await supabase
      .from("profils")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        "Impossible de charger le rôle :",
        error
      );

      setRole(null);
      return;
    }

    setRole(data?.role ?? null);
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

        await chargerRole(
          session.user.id
        );
      } else {
        setSessionValide(false);
        setRole(null);
      }

      if (actif) {
        setChargement(false);
      }
    };

    verifierSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!actif) {
          return;
        }

        if (session?.user) {
          setSessionValide(true);

          await chargerRole(
            session.user.id
          );
        } else {
          setSessionValide(false);
          setRole(null);
        }

        if (actif) {
          setChargement(false);
        }
      }
    );

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
      setErreur(
        "Le mot de passe doit contenir au moins 8 caractères."
      );

      return;
    }

    if (motDePasse !== confirmation) {
      setErreur(
        "Les deux mots de passe ne correspondent pas."
      );

      return;
    }

    setEnregistrement(true);

    const { error } =
      await supabase.auth.updateUser({
        password: motDePasse,
      });

    setEnregistrement(false);

    if (error) {
      setErreur(error.message);
      return;
    }

    setMotDePasse("");
    setConfirmation("");

    if (role === "entraineur") {
      setSucces(
        "Votre accès entraîneur est maintenant activé."
      );
    } else if (
      role === "administrateur"
    ) {
      setSucces(
        "Votre accès administrateur est maintenant activé."
      );
    } else {
      setSucces(
        "Votre accès est maintenant activé."
      );
    }
  };

  const libelleRole =
    role === "entraineur"
      ? "entraîneur"
      : role === "administrateur"
        ? "administrateur"
        : "";

  if (chargement) {
    return (
      <div className="acceptation-admin-page">
        <div className="acceptation-admin-carte">
          <p>
            Validation de l'invitation...
          </p>
        </div>
      </div>
    );
  }

  if (!sessionValide) {
    return (
      <div className="acceptation-admin-page">
        <div className="acceptation-admin-carte">
          <h1>
            Invitation
          </h1>

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
          Choisissez votre mot de passe pour terminer
          l'activation de votre accès
          {libelleRole
            ? ` ${libelleRole}`
            : ""}.
        </p>

        {erreur && (
          <div className="acceptation-admin-erreur">
            {erreur}
          </div>
        )}

        {succes ? (
          <div className="acceptation-admin-succes">
            <strong>
              {succes}
            </strong>

            <p>
              Vous pouvez maintenant accéder à
              l'application.
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
                onChange={(event) =>
                  setMotDePasse(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirmer le mot de passe

              <input
                type="password"
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                required
              />
            </label>

            <button
              type="submit"
              className="acceptation-admin-bouton"
              disabled={enregistrement}
            >
              {enregistrement
                ? "Activation..."
                : "Activer mon accès"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}