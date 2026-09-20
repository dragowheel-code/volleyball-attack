import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function ModalFusionGroupes({
  cours,
  gymnases,
  onFermer,
  onFusionTerminee,
}) {

    const [groupes, setGroupes] = useState([]);
    const [chargement, setChargement] = useState(true);
    const [groupeSourceId, setGroupeSourceId] = useState("");
    const [groupeDestinationId, setGroupeDestinationId] = useState("");
    const [nomGroupeFinal, setNomGroupeFinal] = useState("");
    const [horaires, setHoraires] = useState([]);
    const [horairesSelectionnes, setHorairesSelectionnes] = useState([]);
    const [entraineurs, setEntraineurs] = useState([]);
    const [entraineursSelectionnes, setEntraineursSelectionnes] = useState([]);
    const [previsualisation, setPrevisualisation] = useState(null);
    const [erreur, setErreur] = useState("");
    const [previsualisationEnCours, setPrevisualisationEnCours] = useState(false);
    const [fusionEnCours, setFusionEnCours] = useState(false);

async function chargerEntraineursFusion(
  sourceId,
  destinationId
) {
    setPrevisualisation(null);
  if (!sourceId || !destinationId) {
    setEntraineurs([]);
    setEntraineursSelectionnes([]);
    return;
  }

  const { data, error } = await supabase
    .from("entraineurs_groupes")
    .select(`
      entraineur_id,
      groupe_id,
      profils!inner (
        id,
        prenom,
        nom
      )
    `)
    .in("groupe_id", [sourceId, destinationId])
    .eq("profils.est_entraineur", true)
    .eq("profils.actif", true)
    .eq("actif", true);

  if (error) {
    console.error(error);
    setEntraineurs([]);
    setErreur(
  error.message ?? "Impossible de charger les entraîneurs."
);
    setEntraineursSelectionnes([]);
    return;
  }

  setEntraineurs(data ?? []);
  setEntraineursSelectionnes(
    [...new Set(
      (data ?? []).map(
        (affectation) => affectation.entraineur_id
      )
    )]
  );
}

           async function chargerHorairesFusion(
  sourceId,
  destinationId
) {
    setPrevisualisation(null);
  if (!sourceId || !destinationId) {
    setHoraires([]);
    setHorairesSelectionnes([]);
    return;
  }

  const { data, error } = await supabase
    .from("horaires_groupes")
    .select(
      "id, groupe_id, jour_semaine, heure_debut, heure_fin, gymnase_id, ordre"
    )
    .in("groupe_id", [
  sourceId,
  destinationId,
])
    .order("ordre");

  if (error) {
    console.error(error);
    setHoraires([]);
    setErreur(
  error.message ?? "Impossible de charger les horaires."
);
    setHorairesSelectionnes([]);
    return;
  }

  setHoraires(data ?? []);
  setHorairesSelectionnes(
    (data ?? []).map((horaire) => horaire.id)
  );
}
async function executerFusion() {
    if (fusionEnCours) {
  return;
}
    if (!groupeSourceId || !groupeDestinationId) {
  setErreur("Sélectionnez les deux groupes.");
  return;
}
    if (!nomGroupeFinal.trim()) {
  setErreur("Indiquez le nom du groupe final.");
  return;
}
    if (horairesSelectionnes.length === 0) {
  setErreur("Sélectionnez au moins un horaire à conserver.");
  return;
}
  if (!previsualisation) {
    setErreur("Prévisualisez la fusion avant de l'exécuter.");
    return;
  }

  setErreur("");
  const confirmation = window.confirm(
  `Confirmer la fusion vers « ${nomGroupeFinal.trim()} » ?\n\n` +
    "Cette opération déplacera les inscriptions et désactivera le groupe source."
);

if (!confirmation) {
  return;
}
  setFusionEnCours(true);
  try {
  const { data, error } = await supabase.rpc(
  "fusionner_groupes",
  {
    p_groupe_source_id: groupeSourceId,
    p_groupe_destination_id: groupeDestinationId,
    p_nom_groupe_final: nomGroupeFinal.trim(),
    p_horaires_conserves: horairesSelectionnes,
    p_entraineurs_conserves: entraineursSelectionnes,
  }
);
if (error) {
  console.error(error);
  setErreur(error.message);
  return;
}

console.log("Fusion créée :", data);

await onFusionTerminee();
} catch (error) {
  console.error(error);
  setErreur(
    error?.message ??
      "Une erreur inattendue est survenue pendant la fusion."
  );
} finally {
  setFusionEnCours(false);
}
}
async function previsualiserFusion() {
  if (
  !groupeSourceId ||
  !groupeDestinationId ||
  !nomGroupeFinal.trim()
) {
    setErreur(
  "Sélectionnez les deux groupes et indiquez le nom du groupe final."
);
    return;
  }
if (horairesSelectionnes.length === 0) {
  setErreur("Sélectionnez au moins un horaire à conserver.");
  return;
}
  setErreur("");
  setPrevisualisation(null);
  setPrevisualisationEnCours(true);
  try {

  const { data, error } = await supabase.rpc(
    "previsualiser_fusion_groupes",
    {
      p_groupe_source_id: groupeSourceId,
      p_groupe_destination_id: groupeDestinationId,
    }
  );

  if (error) {
    console.error(error);
    setErreur(error.message);
  } else {
    setPrevisualisation(data?.[0] ?? null);
  }

  } catch (error) {
  console.error(error);
  setErreur(
    error?.message ??
      "Une erreur inattendue est survenue pendant la prévisualisation."
  );
} finally {
  setPrevisualisationEnCours(false);
}
}
    useEffect(() => {
  async function chargerGroupes() {
    setChargement(true);

    const { data, error } = await supabase
      .from("groupes")
      .select("id, nom, capacite, ordre")
      .eq("cours_id", cours.id)
      .eq("actif", true)
      .is("fusionne_vers_id", null)
      .order("ordre");

    if (error) {
      console.error(error);
      setGroupes([]);
      setErreur(
      error.message ?? "Impossible de charger les groupes."
      );
    } else {
      setGroupes(data ?? []);
      setErreur("");
    }

    setChargement(false);
  }

  chargerGroupes();
}, [cours.id]);

  return (
    <div
  className="modal-overlay"
  onClick={() => {
    if (!fusionEnCours) {
      onFermer();
    }
  }}
>
      <div
  className="modal-contenu"
  onClick={(event) => event.stopPropagation()}
>
        <h2>Fusionner des groupes</h2>

        <p>{cours.nom}</p>

        {chargement ? (
  <p>Chargement des groupes...</p>
) : (
  <>
    <label>
      Groupe source
      <select
        value={groupeSourceId}
        onChange={(event) => {
          const nouvelId = event.target.value;

setGroupeSourceId(nouvelId);
setErreur("");

if (nouvelId && groupeDestinationId) {
  chargerHorairesFusion(
    nouvelId,
    groupeDestinationId
  );
chargerEntraineursFusion(
  nouvelId,
  groupeDestinationId
);
} else {
  setHoraires([]);
  setHorairesSelectionnes([]);
  setEntraineurs([]);
  setEntraineursSelectionnes([]);
}
          setPrevisualisation(null);
          }}
      >
        <option value="">Sélectionner un groupe</option>

        {groupes
          .filter(
            (groupe) => groupe.id !== groupeDestinationId
          )
          .map((groupe) => (
            <option key={groupe.id} value={groupe.id}>
              {groupe.nom}
            </option>
          ))}
      </select>
    </label>

    <label>
      Groupe destination
      <select
        value={groupeDestinationId}
        onChange={(event) => {
          const nouvelId = event.target.value;

setGroupeDestinationId(nouvelId);
setPrevisualisation(null);
setErreur("");

if (groupeSourceId && nouvelId) {
  chargerHorairesFusion(
    groupeSourceId,
    nouvelId
  );
  chargerEntraineursFusion(
  groupeSourceId,
  nouvelId
);
} else {
  setHoraires([]);
  setHorairesSelectionnes([]);
  setEntraineurs([]);
  setEntraineursSelectionnes([]);
}

const groupeDestination = groupes.find(
  (groupe) => groupe.id === nouvelId
);

setNomGroupeFinal(groupeDestination?.nom ?? "");
        }}
      >
        <option value="">Sélectionner un groupe</option>

        {groupes
          .filter(
            (groupe) => groupe.id !== groupeSourceId
          )
          .map((groupe) => (
            <option key={groupe.id} value={groupe.id}>
              {groupe.nom}
            </option>
          ))}
      </select>
    </label>
    <label>
  Nom du groupe final
  <input
    type="text"
    value={nomGroupeFinal}
    onChange={(event) => {
      setNomGroupeFinal(event.target.value);
      setPrevisualisation(null);
      setErreur("");
     }}
    placeholder="Nom du groupe après la fusion"
  />
</label>
  </>
)}
{entraineurs.length > 0 && (
  <div>
    <h3>Entraîneurs à conserver</h3>

    {entraineurs
  .filter(
    (affectation, index, liste) =>
      index ===
      liste.findIndex(
        (element) =>
          element.entraineur_id ===
          affectation.entraineur_id
      )
  )
  .map((affectation) => (
      <label key={affectation.entraineur_id}>
        <input
          type="checkbox"
          checked={entraineursSelectionnes.includes(
            affectation.entraineur_id
          )}
          onChange={(event) => {
            if (event.target.checked) {
              setEntraineursSelectionnes((actuels) => [
                ...new Set([
                  ...actuels,
                  affectation.entraineur_id,
                ]),
              ]);
            } else {
              setEntraineursSelectionnes((actuels) =>
                actuels.filter(
                  (id) => id !== affectation.entraineur_id
                )
              );
            }

            setPrevisualisation(null);
            setErreur("");
          }}
        />
<strong>
 {entraineurs
  .filter(
    (element) =>
      element.entraineur_id === affectation.entraineur_id
  )
  .map(
    (element) =>
      groupes.find(
        (groupe) => groupe.id === element.groupe_id
      )?.nom
  )
  .filter(Boolean)
  .join(" + ") || "Groupe inconnu"}
  {" — "}
</strong>
        {affectation.profils?.prenom}{" "}
        {affectation.profils?.nom}
      </label>
    ))}
  </div>
)}
{horaires.length > 0 && (
  <div>
    <h3>Horaires à conserver</h3>

    {horaires.map((horaire) => (
      <label key={horaire.id}>
        <input
          type="checkbox"
          checked={horairesSelectionnes.includes(horaire.id)}
          onChange={(event) => {
            if (event.target.checked) {
              setHorairesSelectionnes((actuels) => [
                ...actuels,
                horaire.id,
              ]);
            } else {
              setHorairesSelectionnes((actuels) =>
                actuels.filter(
                  (id) => id !== horaire.id
                )
              );
            }

            setPrevisualisation(null);
            setErreur("");
          }}
        />
<strong>
  {groupes.find(
    (groupe) => groupe.id === horaire.groupe_id
  )?.nom ?? "Groupe inconnu"}
  {" — "}
</strong>
        {horaire.jour_semaine}{" "}
        {horaire.heure_debut?.slice(0, 5)} à{" "}
        {horaire.heure_fin?.slice(0, 5)}
        {" — "}
{gymnases.find(
  (gymnase) => gymnase.id === horaire.gymnase_id
)?.nom ?? "Gymnase inconnu"}
      </label>
    ))}
  </div>
)}

{erreur && (
  <p>{erreur}</p>
)}

{previsualisation && (
  <div>
    <h3>Prévisualisation</h3>
    <p>
  Groupe final :{" "}
  <strong>{nomGroupeFinal.trim()}</strong>
</p>
<p>
  Horaires conservés :{" "}
  <strong>
    {horairesSelectionnes.length}
  </strong>
</p>
<p>
  Entraîneurs conservés :{" "}
  <strong>
    {entraineursSelectionnes.length}
  </strong>
</p>
    <p>
  <strong>{previsualisation?.groupe_source_nom}</strong>
  {" → "}
  <strong>{previsualisation?.groupe_destination_nom}</strong>
</p>

<p>
  Inscriptions du groupe source :{" "}
  <strong>{previsualisation?.nombre_source}</strong>
</p>

<p>
  Inscriptions du groupe destination :{" "}
  <strong>{previsualisation?.nombre_destination}</strong>
</p>

<p>
  Listes d&apos;attente :{" "}
  <strong>
    {previsualisation?.nombre_liste_attente_source} +{" "}
    {previsualisation?.nombre_liste_attente_destination}
  </strong>
</p>
{Number(
  previsualisation?.nombre_liste_attente_source ?? 0
) +
  Number(
    previsualisation?.nombre_liste_attente_destination ?? 0
  ) >
  0 && (
  <p>
    Les listes d&apos;attente seront regroupées en conservant
    l&apos;ordre original des inscriptions.
  </p>
)}
<p>
  Enfants inscrits dans les deux groupes :{" "}
  <strong>{previsualisation?.nombre_doublons}</strong>
</p>
<p>
  Inscriptions après la fusion :{" "}
  <strong>
    {Number(previsualisation?.nombre_source ?? 0) +
      Number(previsualisation?.nombre_destination ?? 0) -
      Number(previsualisation?.nombre_doublons ?? 0)}
  </strong>
</p>
{Number(previsualisation?.nombre_doublons ?? 0) > 0 && (
  <p>
    <strong>Attention :</strong>{" "}
{previsualisation?.nombre_doublons} inscription
{Number(previsualisation?.nombre_doublons) > 1 ? "s" : ""} en double{" "}
{Number(previsualisation?.nombre_doublons) > 1
  ? "seront absorbées"
  : "sera absorbée"}{" "}
dans le groupe final. La situation financière sera recalculée
automatiquement et un remboursement sera signalé si un trop-perçu
est constaté.
  </p>
)}
  </div>
)}

<button
  type="button"
  onClick={previsualiserFusion}
  disabled={
  !groupeSourceId ||
  !groupeDestinationId ||
  !nomGroupeFinal.trim() ||
   horairesSelectionnes.length === 0 ||
   previsualisationEnCours ||
   fusionEnCours
}
>
  {previsualisationEnCours
    ? "Prévisualisation..."
    : "Prévisualiser la fusion"}
</button>
{previsualisation && (
  <button
    type="button"
    onClick={executerFusion}
    disabled={
  fusionEnCours ||
!nomGroupeFinal.trim() ||
horairesSelectionnes.length === 0
}
  >
    {fusionEnCours
      ? "Fusion en cours..."
      : "Confirmer la fusion"}
  </button>
)}
        <button
          type="button"
          onClick={onFermer}
          disabled={fusionEnCours}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default ModalFusionGroupes;