import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import "./GestionPresences.css";

function GestionPresences() {
  const [presences, setPresences] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  const [joueuseSelectionnee, setJoueuseSelectionnee] = useState(null);
  const [detailPresences, setDetailPresences] = useState([]);
  const [chargementDetail, setChargementDetail] = useState(false);
  const [erreurDetail, setErreurDetail] = useState("");

  useEffect(() => {
    async function chargerPresences() {
      setChargement(true);
      setErreur("");

      const { data, error } = await supabase.rpc(
        "lister_cumul_presences_admin"
      );

      if (error) {
        console.error(
          "Erreur lors du chargement du cumulatif des présences :",
          error
        );
        setErreur(
          "Impossible de charger le cumulatif des présences."
        );
        setPresences([]);
        setChargement(false);
        return;
      }

      setPresences(data ?? []);
      setChargement(false);
    }

    chargerPresences();
  }, []);

  const presencesFiltrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();

    if (!terme) {
      return presences;
    }

    return presences.filter((presence) => {
      const nomComplet =
        `${presence.prenom ?? ""} ${presence.nom ?? ""}`.toLowerCase();

      return nomComplet.includes(terme);
    });
  }, [presences, recherche]);

  async function ouvrirDetailJoueuse(presence) {
    if (!presence?.enfant_id) {
      return;
    }

    if (joueuseSelectionnee?.enfant_id === presence.enfant_id) {
      setJoueuseSelectionnee(null);
      setDetailPresences([]);
      setErreurDetail("");
      return;
    }

    setJoueuseSelectionnee(presence);
    setChargementDetail(true);
    setErreurDetail("");
    setDetailPresences([]);

    const { data, error } = await supabase.rpc(
      "lister_detail_presences_joueuse_admin",
      {
        p_enfant_id: presence.enfant_id,
      }
    );

    if (error) {
      console.error(
        "Erreur lors du chargement du détail des présences :",
        error
      );
      setErreurDetail(
        "Impossible de charger le détail des présences de cette joueuse."
      );
      setChargementDetail(false);
      return;
    }

    setDetailPresences(data ?? []);
    setChargementDetail(false);
  }

  function formaterDate(date) {
    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat("fr-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(`${date}T12:00:00`));
  }

  function formaterHeure(heure) {
    if (!heure) {
      return "—";
    }

    return heure.slice(0, 5);
  }

  function libelleStatut(statut) {
    if (statut === "presente") {
      return "Présente";
    }

    if (statut === "absente") {
      return "Absente";
    }

    if (statut === "retard") {
      return "Retard";
    }

    return "Non saisie";
  }

  function calculerTauxPresence(presence) {
    const saisies = Number(presence.presences_saisies ?? 0);
    const presentes = Number(presence.presentes ?? 0);
    const retards = Number(presence.retards ?? 0);

    if (saisies === 0) {
      return "—";
    }

    const taux = ((presentes + retards) / saisies) * 100;

    return `${Math.round(taux)} %`;
  }

  return (
    <section className="gestion-presences">
      <div className="gestion-presences-entete">
        <div>
          <h1>Présences</h1>
          <p>
            Cumulatif des présences par joueuse pour la saison active.
          </p>
        </div>
      </div>

      <div className="gestion-presences-outils">
        <input
          type="search"
          placeholder="Rechercher une joueuse..."
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
        />
      </div>

      {chargement && (
        <div className="gestion-presences-message">
          Chargement des présences...
        </div>
      )}

      {!chargement && erreur && (
        <div className="gestion-presences-erreur">
          {erreur}
        </div>
      )}

      {!chargement &&
        !erreur &&
        presencesFiltrees.length === 0 && (
          <div className="gestion-presences-message">
            Aucune présence à afficher.
          </div>
        )}

      {!chargement &&
        !erreur &&
        presencesFiltrees.length > 0 && (
          <div className="gestion-presences-tableau-conteneur">
            <table className="gestion-presences-tableau">
              <thead>
                <tr>
                  <th>Joueuse</th>
                  <th>Séances</th>
                  <th>Saisies</th>
                  <th>Présente</th>
                  <th>Absente</th>
                  <th>Retard</th>
                  <th>Non saisie</th>
                  <th>Taux</th>
                </tr>
              </thead>

              <tbody>
                {presencesFiltrees.map((presence) => (
                  <tr key={presence.enfant_id}>
                    <td>
                      <button
                        type="button"
                        className="gestion-presences-joueuse"
                        onClick={() => ouvrirDetailJoueuse(presence)}
                      >
                        <strong>
                          {presence.prenom} {presence.nom}
                        </strong>
                      </button>
                    </td>

                    <td>{presence.nombre_seances ?? 0}</td>
                    <td>{presence.presences_saisies ?? 0}</td>
                    <td>{presence.presentes ?? 0}</td>
                    <td>{presence.absentes ?? 0}</td>
                    <td>{presence.retards ?? 0}</td>
                    <td>{presence.non_renseignees ?? 0}</td>
                    <td>
                      <strong>{calculerTauxPresence(presence)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {joueuseSelectionnee && (
        <section className="gestion-presences-detail">
          <div className="gestion-presences-detail-entete">
            <div>
              <h2>
                {joueuseSelectionnee.prenom}{" "}
                {joueuseSelectionnee.nom}
              </h2>
              <p>Détail des séances de la saison active.</p>
            </div>

            <button
              type="button"
              className="gestion-presences-detail-fermer"
              onClick={() => {
                setJoueuseSelectionnee(null);
                setDetailPresences([]);
                setErreurDetail("");
              }}
            >
              Fermer
            </button>
          </div>

          {chargementDetail && (
            <div className="gestion-presences-message">
              Chargement du détail...
            </div>
          )}

          {!chargementDetail && erreurDetail && (
            <div className="gestion-presences-erreur">
              {erreurDetail}
            </div>
          )}

          {!chargementDetail &&
            !erreurDetail &&
            detailPresences.length === 0 && (
              <div className="gestion-presences-message">
                Aucune séance à afficher pour cette joueuse.
              </div>
            )}

          {!chargementDetail &&
            !erreurDetail &&
            detailPresences.length > 0 && (
              <div className="gestion-presences-tableau-conteneur">
                <table className="gestion-presences-tableau">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cours</th>
                      <th>Groupe</th>
                      <th>Heure</th>
                      <th>Gymnase</th>
                      <th>Statut</th>
                      <th>Commentaire</th>
                    </tr>
                  </thead>

                  <tbody>
                    {detailPresences.map((detail) => (
                      <tr
                        key={`${detail.inscription_id}-${detail.seance_id}`}
                      >
                        <td>{formaterDate(detail.date_seance)}</td>
                        <td>{detail.cours_nom || "—"}</td>
                        <td>{detail.groupe_nom || "—"}</td>
                        <td>
                          {formaterHeure(detail.heure_debut)}
                          {" à "}
                          {formaterHeure(detail.heure_fin)}
                        </td>
                        <td>{detail.gymnase_nom || "—"}</td>
                        <td>
                          <span
                            className={`gestion-presences-statut gestion-presences-statut-${detail.statut_presence || "non-saisie"}`}
                          >
                            {libelleStatut(detail.statut_presence)}
                          </span>
                        </td>
                        <td>{detail.commentaire || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      )}
    </section>
  );
}

export default GestionPresences;
