import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";

import { supabase } from "../../../lib/supabaseClient";

import "./GestionFinance.css";

const LIBELLES_PAIEMENT = {
  a_recevoir: "À recevoir",
  recu: "Reçu",
  rembourse: "Remboursé",
};

function GestionFinance() {
  const [saisonActive, setSaisonActive] =
    useState(null);

  const [transactions, setTransactions] =
    useState([]);

  const [chargement, setChargement] =
    useState(true);

  const [erreur, setErreur] =
    useState("");

  const [filtreStatut, setFiltreStatut] =
    useState("tous");

  const [recherche, setRecherche] =
    useState("");

  useEffect(() => {
    chargerFinance();
  }, []);

  async function chargerFinance() {
    setChargement(true);
    setErreur("");

    const {
      data: saison,
      error: erreurSaison,
    } = await supabase
      .from("saisons")
      .select(`
        id,
        nom,
        date_debut,
        date_fin
      `)
      .eq("active", true)
      .maybeSingle();

    if (erreurSaison) {
      console.error(erreurSaison);

      setErreur(
        "Impossible de charger la saison active."
      );

      setChargement(false);

      return;
    }

    if (!saison) {
      setSaisonActive(null);
      setTransactions([]);
      setChargement(false);

      return;
    }

    setSaisonActive(saison);

    const {
      data: cours,
      error: erreurCours,
    } = await supabase
      .from("cours")
      .select(`
        id,
        nom
      `)
      .eq("saison_id", saison.id);

    if (erreurCours) {
      console.error(erreurCours);

      setErreur(
        "Impossible de charger les cours."
      );

      setChargement(false);

      return;
    }

    const idsCours = (cours ?? []).map(
      (coursItem) => coursItem.id
    );

    if (idsCours.length === 0) {
      setTransactions([]);
      setChargement(false);

      return;
    }

    const {
      data: groupes,
      error: erreurGroupes,
    } = await supabase
      .from("groupes")
      .select(`
        id,
        nom,
        cours_id
      `)
      .in("cours_id", idsCours);

    if (erreurGroupes) {
      console.error(erreurGroupes);

      setErreur(
        "Impossible de charger les groupes."
      );

      setChargement(false);

      return;
    }

    const idsGroupes = (groupes ?? []).map(
      (groupe) => groupe.id
    );

    if (idsGroupes.length === 0) {
      setTransactions([]);
      setChargement(false);

      return;
    }

    const {
      data: inscriptions,
      error: erreurInscriptions,
    } = await supabase
      .from("inscriptions")
      .select(`
        id,
        groupe_id,
        prix_facture,
        statut,
        date_inscription,
        enfants (
          id,
          prenom,
          nom
        ),
        paiements (
          id,
          statut,
          montant,
          reference,
          date_facturation,
          date_paiement,
          date_remboursement,
          montant_rembourse
        )
      `)
      .in("groupe_id", idsGroupes);

    if (erreurInscriptions) {
      console.error(erreurInscriptions);

      setErreur(
        "Impossible de charger les données financières."
      );

      setChargement(false);

      return;
    }

    const coursParId = new Map(
      (cours ?? []).map(
        (coursItem) => [
          coursItem.id,
          coursItem,
        ]
      )
    );

    const groupesParId = new Map(
      (groupes ?? []).map(
        (groupe) => [
          groupe.id,
          groupe,
        ]
      )
    );

    const lignes = [];

    for (
      const inscription of
      inscriptions ?? []
    ) {
      const groupe =
        groupesParId.get(
          inscription.groupe_id
        );

      const coursItem = groupe
        ? coursParId.get(
            groupe.cours_id
          )
        : null;

      const paiements =
        Array.isArray(
          inscription.paiements
        )
          ? inscription.paiements
          : inscription.paiements
          ? [inscription.paiements]
          : [];

      for (
        const paiement of paiements
      ) {
        lignes.push({
          ...paiement,

          inscriptionId:
            inscription.id,

          statutInscription:
            inscription.statut,

          prixFacture:
            inscription.prix_facture,

          enfant:
            inscription.enfants,

          groupe,

          cours: coursItem,
        });
      }
    }

    lignes.sort((a, b) => {
      const dateA =
        a.date_paiement ??
        a.date_facturation ??
        "";

      const dateB =
        b.date_paiement ??
        b.date_facturation ??
        "";

      return (
        new Date(dateB).getTime() -
        new Date(dateA).getTime()
      );
    });

    setTransactions(lignes);
    setChargement(false);
  }

  const statistiques = useMemo(() => {
    let aRecevoir = 0;
    let encaisse = 0;
    let rembourse = 0;

    for (
      const transaction of transactions
    ) {
      const montant = Number(
        transaction.montant ?? 0
      );

      const montantRembourse =
        Number(
          transaction.montant_rembourse ??
            0
        );

      if (
        transaction.statut ===
        "a_recevoir"
      ) {
        aRecevoir += montant;
      }

      if (
        transaction.statut === "recu" ||
        transaction.statut ===
          "rembourse"
      ) {
        encaisse += montant;
      }

      rembourse += montantRembourse;
    }

    return {
      aRecevoir,
      encaisse,
      rembourse,
      net:
        encaisse -
        rembourse,
    };
  }, [transactions]);

  const resumeParCours = useMemo(() => {
    const map = new Map();

    for (
      const transaction of transactions
    ) {
      const coursId =
        transaction.cours?.id ??
        "sans-cours";

      const coursNom =
        transaction.cours?.nom ??
        "Sans cours";

      if (!map.has(coursId)) {
        map.set(coursId, {
          id: coursId,
          nom: coursNom,
          facture: 0,
          aRecevoir: 0,
          encaisse: 0,
          rembourse: 0,
        });
      }

      const ligne =
        map.get(coursId);

      const montant = Number(
        transaction.montant ?? 0
      );

      const montantRembourse =
        Number(
          transaction.montant_rembourse ??
            0
        );

      ligne.facture += montant;

      if (
        transaction.statut ===
        "a_recevoir"
      ) {
        ligne.aRecevoir += montant;
      }

      if (
        transaction.statut === "recu" ||
        transaction.statut ===
          "rembourse"
      ) {
        ligne.encaisse += montant;
      }

      ligne.rembourse +=
        montantRembourse;
    }

    return Array.from(
      map.values()
    )
      .map((ligne) => ({
        ...ligne,

        net:
          ligne.encaisse -
          ligne.rembourse,
      }))
      .sort((a, b) =>
        a.nom.localeCompare(
          b.nom,
          "fr-CA"
        )
      );
  }, [transactions]);

  const transactionsFiltrees =
    useMemo(() => {
      const texte = recherche
        .trim()
        .toLowerCase();

      return transactions.filter(
        (transaction) => {
          if (
            filtreStatut !==
              "tous" &&
            transaction.statut !==
              filtreStatut
          ) {
            return false;
          }

          if (!texte) {
            return true;
          }

          const nomEnfant =
            `${transaction.enfant?.prenom ?? ""} ${
              transaction.enfant?.nom ?? ""
            }`.toLowerCase();

          const nomCours = (
            transaction.cours?.nom ??
            ""
          ).toLowerCase();

          const nomGroupe = (
            transaction.groupe?.nom ??
            ""
          ).toLowerCase();

          const reference = (
            transaction.reference ??
            ""
          ).toLowerCase();

          return (
            nomEnfant.includes(
              texte
            ) ||
            nomCours.includes(
              texte
            ) ||
            nomGroupe.includes(
              texte
            ) ||
            reference.includes(
              texte
            )
          );
        }
      );
    }, [
      transactions,
      filtreStatut,
      recherche,
    ]);

  function formaterMontant(
    montant
  ) {
    return new Intl.NumberFormat(
      "fr-CA",
      {
        style: "currency",
        currency: "CAD",
      }
    ).format(
      Number(montant ?? 0)
    );
  }

  function formaterDate(date) {
    if (!date) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      "fr-CA",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(
      new Date(date)
    );
  }

  function formaterDateExcel(date) {
    if (!date) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "fr-CA",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date(date)
    );
  }

  function nettoyerNomFichier(
    texte
  ) {
    return String(
      texte ?? "Saison"
    )
      .trim()
      .replace(
        /[\\/:*?"<>|]/g,
        "-"
      )
      .replace(
        /\s+/g,
        "-"
      );
  }

  function exporterExcel() {
    if (
      !saisonActive ||
      transactions.length === 0
    ) {
      alert(
        "Aucune donnée financière à exporter."
      );

      return;
    }

    const donneesTransactions =
      transactions.map(
        (transaction) => ({
          Enfant:
            `${transaction.enfant?.prenom ?? ""} ${
              transaction.enfant?.nom ?? ""
            }`.trim(),

          Cours:
            transaction.cours?.nom ??
            "",

          Groupe:
            transaction.groupe?.nom ??
            "",

          "Montant facturé":
            Number(
              transaction.prixFacture ??
                transaction.montant ??
                0
            ),

          "Montant paiement":
            Number(
              transaction.montant ??
                0
            ),

          "Statut paiement":
            LIBELLES_PAIEMENT[
              transaction.statut
            ] ??
            transaction.statut,

          "Référence Interac":
            transaction.reference ??
            "",

          "Date facturation":
            formaterDateExcel(
              transaction.date_facturation
            ),

          "Date paiement":
            formaterDateExcel(
              transaction.date_paiement
            ),

          "Montant remboursé":
            Number(
              transaction.montant_rembourse ??
                0
            ),

          "Date remboursement":
            formaterDateExcel(
              transaction.date_remboursement
            ),
        })
      );

    const donneesResume =
      resumeParCours.map(
        (ligne) => ({
          Cours: ligne.nom,

          Facturé:
            Number(
              ligne.facture
            ),

          "À recevoir":
            Number(
              ligne.aRecevoir
            ),

          Encaissé:
            Number(
              ligne.encaisse
            ),

          Remboursé:
            Number(
              ligne.rembourse
            ),

          Net:
            Number(
              ligne.net
            ),
        })
      );

    const feuilleTransactions =
      XLSX.utils.json_to_sheet(
        donneesTransactions
      );

    const feuilleResume =
      XLSX.utils.json_to_sheet(
        donneesResume
      );

    feuilleTransactions[
      "!cols"
    ] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
    ];

    feuilleResume[
      "!cols"
    ] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
    ];

    const classeur =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      classeur,
      feuilleTransactions,
      "Transactions"
    );

    XLSX.utils.book_append_sheet(
      classeur,
      feuilleResume,
      "Résumé par cours"
    );

    const nomSaison =
      nettoyerNomFichier(
        saisonActive.nom
      );

    XLSX.writeFile(
      classeur,
      `Finance-${nomSaison}.xlsx`
    );
  }

  return (
    <section className="gestion-finance">
      <div className="gestion-finance-entete">
        <div>
          <p className="gestion-finance-sur-titre">
            Finance
          </p>

          <h1>
            Vue financière
          </h1>

          <p>
            {saisonActive
              ? `Saison ${saisonActive.nom}`
              : "Aucune saison active"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="admin-bouton admin-bouton-principal"
            onClick={exporterExcel}
            disabled={
              chargement ||
              !saisonActive ||
              transactions.length ===
                0
            }
          >
            Exporter Excel
          </button>

          <button
            type="button"
            className="admin-bouton admin-bouton-secondaire"
            onClick={
              chargerFinance
            }
            disabled={
              chargement
            }
          >
            {chargement
              ? "Chargement..."
              : "Actualiser"}
          </button>
        </div>
      </div>

      {erreur && (
        <div className="gestion-finance-erreur">
          {erreur}
        </div>
      )}

      {!chargement &&
        !saisonActive && (
          <div className="gestion-finance-vide">
            <h2>
              Aucune saison active
            </h2>

            <p>
              Activez une saison
              pour consulter les
              données financières.
            </p>
          </div>
        )}

      {saisonActive && (
        <>
          <div className="gestion-finance-stats">
            <div className="gestion-finance-stat">
              <span>
                À recevoir
              </span>

              <strong>
                {formaterMontant(
                  statistiques.aRecevoir
                )}
              </strong>
            </div>

            <div className="gestion-finance-stat">
              <span>
                Encaissé
              </span>

              <strong>
                {formaterMontant(
                  statistiques.encaisse
                )}
              </strong>
            </div>

            <div className="gestion-finance-stat">
              <span>
                Remboursé
              </span>

              <strong>
                {formaterMontant(
                  statistiques.rembourse
                )}
              </strong>
            </div>

            <div className="gestion-finance-stat gestion-finance-stat-net">
              <span>
                Revenu net
              </span>

              <strong>
                {formaterMontant(
                  statistiques.net
                )}
              </strong>
            </div>
          </div>

          <div className="gestion-finance-resume-cours">
            <h2>
              Résumé par cours
            </h2>

            {resumeParCours.length ===
            0 ? (
              <div className="gestion-finance-vide">
                Aucune donnée
                financière par cours.
              </div>
            ) : (
              <div className="gestion-finance-table-conteneur">
                <table className="gestion-finance-table">
                  <thead>
                    <tr>
                      <th>
                        Cours
                      </th>

                      <th>
                        Facturé
                      </th>

                      <th>
                        À recevoir
                      </th>

                      <th>
                        Encaissé
                      </th>

                      <th>
                        Remboursé
                      </th>

                      <th>
                        Net
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {resumeParCours.map(
                      (ligne) => (
                        <tr
                          key={
                            ligne.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                ligne.nom
                              }
                            </strong>
                          </td>

                          <td>
                            {formaterMontant(
                              ligne.facture
                            )}
                          </td>

                          <td>
                            {formaterMontant(
                              ligne.aRecevoir
                            )}
                          </td>

                          <td>
                            {formaterMontant(
                              ligne.encaisse
                            )}
                          </td>

                          <td>
                            {formaterMontant(
                              ligne.rembourse
                            )}
                          </td>

                          <td>
                            <strong>
                              {formaterMontant(
                                ligne.net
                              )}
                            </strong>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="gestion-finance-outils">
            <input
              type="search"
              value={recherche}
              placeholder="Rechercher un enfant, cours, groupe ou référence..."
              onChange={(
                event
              ) =>
                setRecherche(
                  event.target.value
                )
              }
            />

            <select
              value={
                filtreStatut
              }
              onChange={(
                event
              ) =>
                setFiltreStatut(
                  event.target.value
                )
              }
            >
              <option value="tous">
                Tous les paiements
              </option>

              <option value="a_recevoir">
                À recevoir
              </option>

              <option value="recu">
                Reçus
              </option>

              <option value="rembourse">
                Remboursés
              </option>
            </select>
          </div>

          {chargement ? (
            <div className="gestion-finance-vide">
              Chargement...
            </div>
          ) : transactionsFiltrees.length ===
            0 ? (
            <div className="gestion-finance-vide">
              <h2>
                Aucune transaction
              </h2>

              <p>
                Aucune transaction
                ne correspond aux
                critères.
              </p>
            </div>
          ) : (
            <div className="gestion-finance-table-conteneur">
              <table className="gestion-finance-table">
                <thead>
                  <tr>
                    <th>
                      Enfant
                    </th>

                    <th>
                      Cours
                    </th>

                    <th>
                      Groupe
                    </th>

                    <th>
                      Montant
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Référence
                    </th>

                    <th>
                      Paiement
                    </th>

                    <th>
                      Remboursement
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactionsFiltrees.map(
                    (
                      transaction
                    ) => (
                      <tr
                        key={
                          transaction.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              transaction
                                .enfant
                                ?.prenom
                            }{" "}
                            {
                              transaction
                                .enfant
                                ?.nom
                            }
                          </strong>
                        </td>

                        <td>
                          {transaction
                            .cours?.nom ??
                            "—"}
                        </td>

                        <td>
                          {transaction
                            .groupe?.nom ??
                            "—"}
                        </td>

                        <td>
                          {formaterMontant(
                            transaction.montant
                          )}
                        </td>

                        <td>
                          <span
                            className={`gestion-finance-statut paiement-${transaction.statut}`}
                          >
                            {LIBELLES_PAIEMENT[
                              transaction
                                .statut
                            ] ??
                              transaction.statut}
                          </span>
                        </td>

                        <td>
                          {transaction.reference ??
                            "—"}
                        </td>

                        <td>
                          {formaterDate(
                            transaction.date_paiement
                          )}
                        </td>

                        <td>
                          {Number(
                            transaction.montant_rembourse ??
                              0
                          ) > 0 ? (
                            <div className="gestion-finance-remboursement">
                              <strong>
                                {formaterMontant(
                                  transaction.montant_rembourse
                                )}
                              </strong>

                              <small>
                                {formaterDate(
                                  transaction.date_remboursement
                                )}
                              </small>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default GestionFinance;