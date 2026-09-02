import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionContrats.css";

const LIBELLES_TYPES = {
  code_conduite: "Code de conduite",
  intervention: "Intervention",
  photos_videos: "Photos et vidéos",
  remboursement: "Remboursement",
};

function proposerVersionSuivante(versionActuelle) {
  const texte = String(versionActuelle ?? "").trim();

  const correspondance = texte.match(/^(\d+)(?:\.(\d+))?$/);

  if (!correspondance) {
    return "";
  }

  const majeure = Number(correspondance[1]);
  const mineure = Number(correspondance[2] ?? 0);

  return `${majeure}.${mineure + 1}`;
}

function formaterDate(date) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date));
}

function GestionContrats() {
  const [contrats, setContrats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [messageSucces, setMessageSucces] =
    useState("");

  const [contratEnModification, setContratEnModification] =
    useState(null);

  const [titre, setTitre] = useState("");
  const [version, setVersion] = useState("");
  const [contenu, setContenu] = useState("");
  const [enregistrement, setEnregistrement] =
    useState(false);

  useEffect(() => {
    chargerContrats();
  }, []);

  async function chargerContrats() {
    setChargement(true);
    setErreur("");

    const { data, error } = await supabase.rpc(
      "lister_contrats_admin"
    );

    if (error) {
      console.error(error);
      setContrats([]);
      setErreur(
        error.message ||
          "Impossible de charger les contrats."
      );
      setChargement(false);
      return;
    }

    setContrats(data ?? []);
    setChargement(false);
  }

  const contratsParType = useMemo(() => {
    const resultat = new Map();

    for (const contrat of contrats) {
      resultat.set(contrat.type, contrat);
    }

    return resultat;
  }, [contrats]);

  const contratsOrdonnes = useMemo(() => {
    return [
      "code_conduite",
      "intervention",
      "photos_videos",
      "remboursement",
    ]
      .map((type) => contratsParType.get(type))
      .filter(Boolean);
  }, [contratsParType]);

  function ouvrirModification(contrat) {
    setErreur("");
    setMessageSucces("");
    setContratEnModification(contrat);
    setTitre(contrat.titre ?? "");
    setVersion(
      proposerVersionSuivante(contrat.version)
    );
    setContenu(contrat.contenu ?? "");
  }

  function fermerModification() {
    if (enregistrement) {
      return;
    }

    setContratEnModification(null);
    setTitre("");
    setVersion("");
    setContenu("");
  }

  async function enregistrerNouvelleVersion(event) {
    event.preventDefault();

    if (!contratEnModification) {
      return;
    }

    const titreNettoye = titre.trim();
    const versionNettoyee = version.trim();
    const contenuNettoye = contenu.trim();

    if (!titreNettoye) {
      setErreur("Le titre est obligatoire.");
      return;
    }

    if (!versionNettoyee) {
      setErreur("La version est obligatoire.");
      return;
    }

    if (!contenuNettoye) {
      setErreur("Le contenu est obligatoire.");
      return;
    }

    const confirmation = window.confirm(
      "Enregistrer cette nouvelle version du contrat ? L'ancienne version sera conservée dans l'historique."
    );

    if (!confirmation) {
      return;
    }

    setEnregistrement(true);
    setErreur("");
    setMessageSucces("");

    const { error } = await supabase.rpc(
      "creer_nouvelle_version_politique_admin",
      {
        p_politique_id:
          contratEnModification.politique_id,
        p_titre: titreNettoye,
        p_version: versionNettoyee,
        p_contenu: contenuNettoye,
      }
    );

    if (error) {
      console.error(error);
      setErreur(
        error.message ||
          "Impossible d'enregistrer la nouvelle version."
      );
      setEnregistrement(false);
      return;
    }

    setEnregistrement(false);
    setContratEnModification(null);
    setTitre("");
    setVersion("");
    setContenu("");

    setMessageSucces(
      "La nouvelle version du contrat a été enregistrée."
    );

    await chargerContrats();
  }

  return (
    <section className="gestion-contrats">
      <div className="gestion-contrats-entete">
        <div>
          <h1>Contrats</h1>
          <p>
            Gérez les textes présentés aux parents lors
            d'une inscription.
          </p>
        </div>

        <button
          type="button"
          className="admin-bouton admin-bouton-secondaire"
          onClick={chargerContrats}
          disabled={chargement}
        >
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="gestion-contrats-message gestion-contrats-message-erreur">
          {erreur}
        </div>
      )}

      {messageSucces && (
        <div className="gestion-contrats-message gestion-contrats-message-succes">
          {messageSucces}
        </div>
      )}

      {chargement ? (
        <div className="gestion-contrats-vide">
          Chargement...
        </div>
      ) : contratsOrdonnes.length === 0 ? (
        <div className="gestion-contrats-vide">
          <h2>Aucun contrat</h2>
          <p>
            Aucun contrat n'est actuellement configuré.
          </p>
        </div>
      ) : (
        <div className="gestion-contrats-grille">
          {contratsOrdonnes.map((contrat) => (
            <article
              key={contrat.politique_id}
              className="gestion-contrats-carte"
            >
              <div className="gestion-contrats-carte-entete">
                <div>
                  <span className="gestion-contrats-type">
                    {LIBELLES_TYPES[contrat.type] ??
                      contrat.type}
                  </span>

                  <h2>{contrat.titre}</h2>
                </div>

                <span
                  className={`gestion-contrats-statut ${
                    contrat.active
                      ? "gestion-contrats-statut-actif"
                      : "gestion-contrats-statut-inactif"
                  }`}
                >
                  {contrat.active
                    ? "Actif"
                    : "Inactif"}
                </span>
              </div>

              <div className="gestion-contrats-version">
                <span>
                  Version actuelle
                </span>
                <strong>
                  {contrat.version || "—"}
                </strong>
              </div>

              <div className="gestion-contrats-contenu">
                {contrat.contenu || "Aucun contenu."}
              </div>

              <div className="gestion-contrats-meta">
                Dernière modification :{" "}
                {formaterDate(
                  contrat.date_modification
                )}
              </div>

              <div className="gestion-contrats-actions">
                <button
                  type="button"
                  className="admin-bouton admin-bouton-primaire"
                  onClick={() =>
                    ouvrirModification(contrat)
                  }
                >
                  Modifier
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {contratEnModification && (
        <div
          className="gestion-contrats-modal-fond"
          onMouseDown={fermerModification}
        >
          <div
            className="gestion-contrats-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="gestion-contrats-modal-entete">
              <div>
                <span>
                  {
                    LIBELLES_TYPES[
                      contratEnModification.type
                    ]
                  }
                </span>
                <h2>
                  Nouvelle version du contrat
                </h2>
              </div>

              <button
                type="button"
                className="gestion-contrats-fermer"
                onClick={fermerModification}
                disabled={enregistrement}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="gestion-contrats-version-actuelle">
              Version actuellement utilisée :{" "}
              <strong>
                {contratEnModification.version ||
                  "—"}
              </strong>
            </div>

            <form
              onSubmit={enregistrerNouvelleVersion}
              className="gestion-contrats-formulaire"
            >
              <label>
                <span>Titre</span>
                <input
                  type="text"
                  value={titre}
                  onChange={(event) =>
                    setTitre(event.target.value)
                  }
                  disabled={enregistrement}
                />
              </label>

              <label>
                <span>Nouvelle version</span>
                <input
                  type="text"
                  value={version}
                  onChange={(event) =>
                    setVersion(event.target.value)
                  }
                  placeholder="Ex. 1.1"
                  disabled={enregistrement}
                />
              </label>

              <label>
                <span>Contenu</span>
                <textarea
                  value={contenu}
                  onChange={(event) =>
                    setContenu(event.target.value)
                  }
                  rows={12}
                  disabled={enregistrement}
                />
              </label>

              <p className="gestion-contrats-avertissement">
                L'ancienne version sera conservée afin que
                les consentements déjà enregistrés restent
                liés au texte accepté au moment de
                l'inscription.
              </p>

              <div className="gestion-contrats-modal-actions">
                <button
                  type="button"
                  className="admin-bouton admin-bouton-secondaire"
                  onClick={fermerModification}
                  disabled={enregistrement}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="admin-bouton admin-bouton-primaire"
                  disabled={enregistrement}
                >
                  {enregistrement
                    ? "Enregistrement..."
                    : "Enregistrer la nouvelle version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default GestionContrats;
