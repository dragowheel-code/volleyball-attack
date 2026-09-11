import { createClient } from "npm:@supabase/supabase-js@2";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "\*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
function html(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function money(value: unknown) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number(value ?? 0));
}
function ligneAdresse(
  ville?: string | null,
  province?: string | null,
  codePostal?: string | null,
) {
  const villeProvince = [ville?.trim(), province?.trim()]
    .filter(Boolean)
    .join(", ");
  return [villeProvince, codePostal?.trim()]
    .filter(Boolean)
    .join(" ");
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Méthode non permise." }, 405);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    console.error("Configuration serveur incomplète.");
    return json({ error: "Configuration serveur incomplète." }, 500);
  }
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    return json({ error: "Authentification requise." }, 401);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) {
    console.error(userError);
    return json({ error: "Session invalide." }, 401);
  }
  const { data: profil, error: profilError } = await admin
    .from("profils")
    .select("actif, est_administrateur")
    .eq("id", user.id)
    .maybeSingle();
  if (
    profilError ||
    !profil ||
    !profil.actif ||
    !profil.est_administrateur
  ) {
    if (profilError) {
      console.error(profilError);
    }
    return json({ error: "Accès administrateur requis." }, 403);
  }
  let body: {
    inscription_id?: string;
    numero_versement?: number;
    test_email?: string;
    scenario_test?: "1_sur_1" | "1_sur_2" | "2_sur_2";
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide." }, 400);
  }
  const inscriptionId = body.inscription_id?.trim();
  const numeroVersement = Number(body.numero_versement);
  const testEmail = body.test_email?.trim() || null;
  const scenarioTest = body.scenario_test ?? null;
  if (!inscriptionId) {
    return json({ error: "inscription_id est requis." }, 400);
  }
  if (
    !Number.isInteger(numeroVersement) ||
    numeroVersement < 1 ||
    numeroVersement > 2
  ) {
    return json({ error: "numero_versement est invalide." }, 400);
  }
  if (
    testEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)
  ) {
    return json({ error: "test_email est invalide." }, 400);
  }
  if (scenarioTest && !testEmail) {
    return json(
      { error: "scenario_test est permis uniquement avec test_email." },
      400,
    );
  }
  if (
    scenarioTest &&
    !["1_sur_1", "1_sur_2", "2_sur_2"].includes(scenarioTest)
  ) {
    return json({ error: "scenario_test est invalide." }, 400);
  }
  const { data: inscription, error: inscriptionError } = await admin
    .from("inscriptions")
    .select(`
      id,
      parent_createur_id,
      prix_facture,
      nombre_versements,
      enfants (
        prenom,
        nom
      ),
      groupes (
        nom,
        cours (
          nom
        )
      ),
      paiements (
        numero_versement,
        statut,
        montant,
        reference,
        date_paiement
      )
    `)
    .eq("id", inscriptionId)
    .maybeSingle();
  if (inscriptionError) {
    console.error(inscriptionError);
    return json({ error: "Impossible de charger l'inscription." }, 500);
  }
  if (!inscription) {
    return json({ error: "Inscription introuvable." }, 404);
  }
  const paiements = Array.isArray(inscription.paiements)
    ? [...inscription.paiements].sort(
        (a, b) =>
          Number(a.numero_versement ?? 1) -
          Number(b.numero_versement ?? 1),
      )
    : [];
  const nombreVersementsReel = Number(inscription.nombre_versements ?? 1);
  if (![1, 2].includes(nombreVersementsReel)) {
    return json({ error: "Nombre de versements invalide." }, 400);
  }
  const modeSimulation = Boolean(testEmail && scenarioTest);
  let nombreVersements = nombreVersementsReel;
  let numeroVersementCourriel = numeroVersement;
  let paiement = paiements.find(
    (item) => Number(item.numero_versement ?? 1) === numeroVersement,
  );
  if (modeSimulation) {
    if (scenarioTest === "1_sur_1") {
      nombreVersements = 1;
      numeroVersementCourriel = 1;
    } else if (scenarioTest === "1_sur_2") {
      nombreVersements = 2;
      numeroVersementCourriel = 1;
    } else {
      nombreVersements = 2;
      numeroVersementCourriel = 2;
    }
  } else {
    if (!paiement || paiement.statut !== "recu") {
      return json(
        { error: "Le versement doit être reçu avant l'envoi du courriel." },
        400,
      );
    }
    if (numeroVersement > nombreVersements) {
      return json(
        { error: "Le versement ne correspond pas à cette inscription." },
        400,
      );
    }
  }
  const { data: parent, error: parentError } = await admin
    .from("parents")
    .select("profil_id")
    .eq("id", inscription.parent_createur_id)
    .maybeSingle();
  if (parentError || !parent?.profil_id) {
    if (parentError) {
      console.error(parentError);
    }
    return json({ error: "Compte parent introuvable." }, 404);
  }
  const {
    data: { user: parentUser },
    error: parentUserError,
  } = await admin.auth.admin.getUserById(parent.profil_id);
  if (parentUserError || !parentUser?.email) {
    if (parentUserError) {
      console.error(parentUserError);
    }
    return json(
      { error: "Adresse courriel du parent introuvable." },
      404,
    );
  }
  const enfant = Array.isArray(inscription.enfants)
    ? inscription.enfants[0]
    : inscription.enfants;
  const groupe = Array.isArray(inscription.groupes)
    ? inscription.groupes[0]
    : inscription.groupes;
  const coursBrut = groupe?.cours;
  const cours = Array.isArray(coursBrut) ? coursBrut[0] : coursBrut;
  const nomEnfant =
    `${enfant?.prenom ?? ""} ${enfant?.nom ?? ""}`.trim() ||
    "votre enfant";
  const nomCours = cours?.nom ?? "Activité";
  const nomGroupe = groupe?.nom ?? "Groupe";
  const total = Number(inscription.prix_facture ?? 0);
  let montantRecu = 0;
  let solde = 0;
  let paiementComplet = false;
  let reference = "";
  let montantProchainPaiement = 0;
  if (modeSimulation) {
    if (nombreVersements === 1) {
      montantRecu = total;
      solde = 0;
      paiementComplet = true;
    } else {
      const premierVersement = Math.ceil((total / 2) * 100) / 100;
      const deuxiemeVersement =
        Math.round((total - premierVersement) * 100) / 100;
      if (numeroVersementCourriel === 1) {
        montantRecu = premierVersement;
        solde = deuxiemeVersement;
        paiementComplet = false;
        montantProchainPaiement = deuxiemeVersement;
      } else {
        montantRecu = deuxiemeVersement;
        solde = 0;
        paiementComplet = true;
      }
    }
    reference = "TEST";
  } else {
    montantRecu = Number(paiement?.montant ?? 0);
    const totalRecu = paiements.reduce(
      (somme, item) =>
        item.statut === "recu"
          ? somme + Number(item.montant ?? 0)
          : somme,
      0,
    );
    solde = Math.max(0, total - totalRecu);
    paiementComplet = solde < 0.005;
    reference = paiement?.reference?.trim() || "";
    const prochainPaiement = paiements.find(
      (item) => item.statut === "a_recevoir",
    );
    montantProchainPaiement = prochainPaiement
      ? Number(prochainPaiement.montant ?? 0)
      : 0;
  }
  const { data: organisation, error: organisationError } = await admin
    .from("organisation")
    .select(`
      nom_legal,
      nom_affichage,
      adresse,
      ville,
      province,
      code_postal,
      telephone,
      courriel,
      logo_url
    `)
    .limit(1)
    .maybeSingle();
  if (organisationError) {
    console.error(organisationError);
  }
  const nomOrganisation =
    organisation?.nom_affichage?.trim() ||
    organisation?.nom_legal?.trim() ||
    "Volley-Ball Attack";
  const logoUrl = organisation?.logo_url?.trim() || "";
  const adresse = organisation?.adresse?.trim() || "";
  const ville = ligneAdresse(
    organisation?.ville,
    organisation?.province,
    organisation?.code_postal,
  );
  const telephone = organisation?.telephone?.trim() || "";
  const courriel = organisation?.courriel?.trim() || "";
  let sujet = "";
  let titre = "";
  let introduction = "";
  let detail = "";
  let etiquette = "";
  if (nombreVersements === 1) {
    sujet = `Paiement reçu — ${nomCours}`;
    titre = "Paiement reçu";
    introduction =
      "Nous confirmons la réception de votre paiement.";
    detail =
      "Le paiement de cette inscription est maintenant complet. Votre reçu final est disponible dans votre espace parent.";
    etiquette = "PAIEMENT COMPLET";
  } else if (numeroVersementCourriel === 1) {
    sujet = `Premier versement reçu — ${nomCours}`;
    titre = "Premier versement reçu";
    introduction =
      "Nous confirmons la réception de votre premier versement.";
    detail = `Un deuxième versement de ${money(
      montantProchainPaiement,
    )} reste à effectuer. Le reçu final sera disponible lorsque le deuxième versement aura été reçu.`;
    etiquette = "VERSEMENT REÇU";
  } else {
    sujet = `Paiement complet reçu — ${nomCours}`;
    titre = "Paiement complet reçu";
    introduction =
      "Nous confirmons la réception de votre deuxième versement.";
    detail =
      "Les deux versements ont maintenant été reçus. Votre reçu final est disponible dans votre espace parent.";
    etiquette = "PAIEMENT COMPLET";
  }
  const logoBlock = logoUrl
    ? `
      <tr>
        <td align="center" style="padding:28px 28px 16px;">
          <img
            src="${html(logoUrl)}"
            alt="${html(`Logo ${nomOrganisation}`)}"
            style="display:block;max-width:180px;max-height:110px;width:auto;height:auto;border:0;"
          >
        </td>
      </tr>
    `
    : "";
  const referenceBlock = reference
    ? `
      <tr>
        <td style="padding:5px 0;font-size:15px;color:#1f2937;">
          Référence Interac
        </td>
        <td align="right" style="padding:5px 0;font-size:15px;color:#1f2937;font-weight:700;">
          ${html(reference)}
        </td>
      </tr>
    `
    : "";
  const coordonneesHtml = [
    adresse ? html(adresse) : "",
    ville ? html(ville) : "",
    telephone ? `Téléphone : ${html(telephone)}` : "",
    courriel
      ? `Courriel : <a href="mailto:${html(
          courriel,
        )}" style="color:#17375e;text-decoration:none;">${html(
          courriel,
        )}</a>`
      : "",
  ]
    .filter(Boolean)
    .map(
      (ligne) =>
        `<div style="margin:2px 0;font-size:13px;line-height:1.5;color:#6b7280;">${ligne}</div>`,
    )
    .join("");
  const testBanner = testEmail
    ? `
      <tr>
        <td style="background:#fff4cc;padding:10px 18px;text-align:center;font-size:12px;font-weight:700;color:#7a5a00;">
          MODE TEST — aucun paiement ni aucune donnée financière n'a été modifié par cet envoi.
        </td>
      </tr>
    `
    : "";
  const emailHtml = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${html(sujet)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.08);">
          ${testBanner}
          ${logoBlock}
          <tr>
            <td align="center" style="padding:0 28px 24px;">
              <div style="font-size:14px;font-weight:700;letter-spacing:.02em;color:#17375e;">
                ${html(nomOrganisation)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#3d6b49;padding:22px 28px;">
              <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;font-weight:700;">
                ${html(titre)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;">
                Bonjour,
              </p>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.65;">
                ${html(introduction)}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="margin:0 0 10px;font-size:15px;line-height:1.5;">
                      <strong>Enfant :</strong> ${html(nomEnfant)}
                    </div>
                    <div style="margin:0 0 10px;font-size:15px;line-height:1.5;">
                      <strong>Activité :</strong> ${html(nomCours)}
                    </div>
                    <div style="margin:0;font-size:15px;line-height:1.5;">
                      <strong>Groupe :</strong> ${html(nomGroupe)}
                    </div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;background:#eef7f0;border-radius:12px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="display:inline-block;padding:5px 9px;background:#dcecdf;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;color:#31583c;">
                      ${html(etiquette)}
                    </div>
                    <div style="font-size:18px;font-weight:700;color:#3d6b49;margin:14px 0 10px;">
                      Versement ${numeroVersementCourriel}/${nombreVersements} reçu
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:5px 0;font-size:15px;color:#1f2937;">
                          Montant reçu
                        </td>
                        <td align="right" style="padding:5px 0;font-size:15px;color:#1f2937;font-weight:700;">
                          ${html(money(montantRecu))}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:15px;color:#1f2937;">
                          Total de l'inscription
                        </td>
                        <td align="right" style="padding:5px 0;font-size:15px;color:#1f2937;font-weight:700;">
                          ${html(money(total))}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:5px 0;font-size:15px;color:#1f2937;">
                          Solde restant
                        </td>
                        <td align="right" style="padding:5px 0;font-size:15px;color:#1f2937;font-weight:700;">
                          ${html(money(solde))}
                        </td>
                      </tr>
                      ${referenceBlock}
                    </table>
                    <div style="height:1px;background:#d9e8dc;margin:16px 0;"></div>
                    <div style="font-size:14px;line-height:1.65;color:#374151;">
                      ${html(detail)}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:26px 0 0;font-size:15px;line-height:1.6;">
                Merci,<br>
                <strong>${html(nomOrganisation)}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 24px;border-top:1px solid #e5e7eb;text-align:center;">
              ${coordonneesHtml}
              <div style="margin-top:12px;font-size:12px;line-height:1.5;color:#9ca3af;">
                Ce courriel a été envoyé automatiquement. Veuillez conserver ce message pour vos dossiers.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const coordonneesTexte = [
    adresse,
    ville,
    telephone ? `Téléphone : ${telephone}` : "",
    courriel ? `Courriel : ${courriel}` : "",
  ].filter(Boolean);
  const emailText = [
    ...(testEmail
      ? ["MODE TEST — aucune donnée financière n'a été modifiée.", ""]
      : []),
    nomOrganisation,
    "",
    titre,
    "",
    "Bonjour,",
    "",
    introduction,
    "",
    `Enfant : ${nomEnfant}`,
    `Activité : ${nomCours}`,
    `Groupe : ${nomGroupe}`,
    "",
    `Versement ${numeroVersementCourriel}/${nombreVersements} reçu`,
    `Montant reçu : ${money(montantRecu)}`,
    `Total de l'inscription : ${money(total)}`,
    `Solde restant : ${money(solde)}`,
    ...(reference ? [`Référence Interac : ${reference}`] : []),
    "",
    detail,
    ...(paiementComplet
      ? ["", "Votre reçu final est disponible dans votre espace parent."]
      : []),
    "",
    "Merci,",
    nomOrganisation,
    ...(coordonneesTexte.length ? ["", ...coordonneesTexte] : []),
  ].join("\n");
  const resendPayload: Record<string, unknown> = {
    from: `${nomOrganisation} <noreply@volleyballattack.ca>`,
    to: [testEmail ?? parentUser.email],
    subject: testEmail ? `[TEST] ${sujet}` : sujet,
    html: emailHtml,
    text: emailText,
  };
  if (courriel) {
    resendPayload.reply_to = courriel;
  }
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resendPayload),
  });
  const resendResult = await resendResponse.json();
  if (!resendResponse.ok) {
    console.error("Erreur Resend :", resendResult);
    return json(
      {
        error:
          "Le paiement est enregistré, mais le courriel n'a pas pu être envoyé.",
      },
      502,
    );
  }
  return json({
    success: true,
    email_id: resendResult.id ?? null,
    numero_versement: numeroVersement,
    nombre_versements: nombreVersements,
    scenario_test: scenarioTest,
    paiement_complet: paiementComplet,
    mode_test: Boolean(testEmail),
    destinataire: testEmail ?? parentUser.email,
  });
});
