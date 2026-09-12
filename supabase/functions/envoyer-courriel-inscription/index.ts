import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
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

function ligneCoordonnee(...parties: Array<string | null | undefined>) {
  const valeur = parties
    .map((partie) => partie?.trim())
    .filter(Boolean)
    .join(", ");

  return valeur || "";
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

  let body: {
    inscription_id?: string;
    origine?: string;
  };

  try {
    body = await req.json();
  } catch {
    return json({ error: "Corps de requête invalide." }, 400);
  }

  const inscriptionId = body.inscription_id?.trim();
  const origine = body.origine?.trim() || "";

  if (!inscriptionId) {
    return json({ error: "inscription_id est requis." }, 400);
  }

  const { data: inscription, error: inscriptionError } = await admin
    .from("inscriptions")
    .select(`
      id,
      parent_createur_id,
      statut,
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
        montant
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

  const { data: parentConnecte, error: parentConnecteError } = await admin
  .from("parents")
  .select("id")
  .eq("profil_id", user.id)
  .maybeSingle();

if (parentConnecteError) {
  console.error(parentConnecteError);

  return json(
    { error: "Impossible de vérifier le compte parent." },
    500,
  );
}

const estParentCreateur =
  parentConnecte?.id === inscription.parent_createur_id;

  const { data: profilConnecte, error: profilConnecteError } = await admin
  .from("profils")
  .select("actif, est_administrateur")
  .eq("id", user.id)
  .maybeSingle();

if (profilConnecteError) {
  console.error(profilConnecteError);

  return json(
    { error: "Impossible de vérifier le profil utilisateur." },
    500,
  );
}

const estAdministrateur =
  profilConnecte?.actif === true &&
  profilConnecte?.est_administrateur === true;

  if (!estParentCreateur && !estAdministrateur) {
  return json(
    { error: "Accès refusé à cette inscription." },
    403,
  );
}

let courrielDestinataire = user.email ?? "";

if (estAdministrateur && !estParentCreateur) {
  const { data: parentCreateur, error: parentCreateurError } = await admin
    .from("parents")
    .select("profil_id")
    .eq("id", inscription.parent_createur_id)
    .maybeSingle();

  if (parentCreateurError) {
    console.error(parentCreateurError);

    return json(
      { error: "Impossible de charger le parent de l'inscription." },
      500,
    );
  }

  if (!parentCreateur?.profil_id) {
    return json(
      { error: "Parent associé à l'inscription introuvable." },
      404,
    );
  }

  const {
    data: { user: parentUser },
    error: parentUserError,
  } = await admin.auth.admin.getUserById(
    parentCreateur.profil_id,
  );

  if (parentUserError) {
    console.error(parentUserError);

    return json(
      { error: "Impossible de charger le compte du parent." },
      500,
    );
  }

  courrielDestinataire = parentUser?.email ?? "";
}
if (!courrielDestinataire) {
  return json(
    { error: "Aucune adresse courriel associée au parent." },
    400,
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
    `${enfant?.prenom ?? ""} ${enfant?.nom ?? ""}`.trim() || "votre enfant";
  const nomCours = cours?.nom ?? "Activité";
  const nomGroupe = groupe?.nom ?? "Groupe";

  const paiements = Array.isArray(inscription.paiements)
    ? [...inscription.paiements].sort(
        (a, b) =>
          Number(a.numero_versement ?? 1) -
          Number(b.numero_versement ?? 1),
      )
    : [];

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
      numero_tps,
      numero_tvq,
      instructions_paiement,
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

  const instructionsPaiement =
    organisation?.instructions_paiement?.trim() ||
    "Les instructions de paiement sont disponibles dans votre espace parent.";

  const logoUrl = organisation?.logo_url?.trim() || "";
  const adresseOrganisation = organisation?.adresse?.trim() || "";
  const villeProvinceCodePostal = ligneCoordonnee(
    organisation?.ville,
    organisation?.province,
  );
  const codePostal = organisation?.code_postal?.trim() || "";
  const telephoneOrganisation = organisation?.telephone?.trim() || "";
  const courrielOrganisation = organisation?.courriel?.trim() || "";

  const ligneVille =
    [villeProvinceCodePostal, codePostal].filter(Boolean).join(" ") || "";

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

  const coordonneesHtml = [
    adresseOrganisation,
    ligneVille,
    telephoneOrganisation
      ? `Téléphone : ${html(telephoneOrganisation)}`
      : "",
    courrielOrganisation
      ? `Courriel : <a href="mailto:${html(courrielOrganisation)}" style="color:#17375e;text-decoration:none;">${html(courrielOrganisation)}</a>`
      : "",
  ]
    .filter(Boolean)
    .map(
      (ligne) =>
        `<div style="margin:2px 0;font-size:13px;line-height:1.5;color:#6b7280;">${ligne}</div>`,
    )
    .join("");

  const coordonneesTexte = [
    adresseOrganisation,
    ligneVille,
    telephoneOrganisation ? `Téléphone : ${telephoneOrganisation}` : "",
    courrielOrganisation ? `Courriel : ${courrielOrganisation}` : "",
  ].filter(Boolean);

  let sujet = "";
  let titre = "";
  let message = "";
  let accent = "#17375e";
  let fondAccent = "#eef3f8";
  let paymentBlock = "";
  let paymentText: string[] = [];

  if (inscription.statut === "en_attente_paiement") {
  if (origine === "validation_conditionnelle") {
    sujet = `Inscription acceptée — ${nomCours}`;
    titre = "Inscription acceptée";
    message =
      "L'inscription conditionnelle a été acceptée. La place est maintenant réservée. Vous pouvez procéder au paiement selon les instructions ci-dessous.";
  } else {
    sujet = `Confirmation d'inscription — ${nomCours}`;
    titre = "Inscription reçue";
    message =
      "La place est réservée. Votre inscription sera confirmée selon le processus de paiement prévu.";
  }

  accent = "#3d6b49";
  fondAccent = "#eef7f0";

    const lignesPaiement = paiements
      .filter((paiement) => paiement.statut === "a_recevoir")
      .map(
        (paiement) => `
          <tr>
            <td style="padding:5px 0;font-size:15px;color:#1f2937;">
              Versement ${html(paiement.numero_versement ?? 1)}
            </td>
            <td align="right" style="padding:5px 0;font-size:15px;color:#1f2937;font-weight:700;">
              ${html(money(paiement.montant))}
            </td>
          </tr>
        `,
      )
      .join("");

    paymentBlock = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;background:${fondAccent};border-radius:12px;">
        <tr>
          <td style="padding:20px;">
            <div style="font-size:18px;font-weight:700;color:${accent};margin-bottom:12px;">
              Paiement Interac
            </div>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding:5px 0;font-size:15px;color:#1f2937;">
                  Montant total
                </td>
                <td align="right" style="padding:5px 0;font-size:17px;color:#1f2937;font-weight:700;">
                  ${html(money(inscription.prix_facture))}
                </td>
              </tr>
              ${lignesPaiement}
            </table>

            <div style="height:1px;background:#d9e8dc;margin:16px 0;"></div>

            <div style="font-size:14px;line-height:1.65;color:#374151;white-space:pre-line;">${html(instructionsPaiement)}</div>
          </td>
        </tr>
      </table>
    `;

    paymentText = [
      `Montant total : ${money(inscription.prix_facture)}`,
      ...paiements
        .filter((paiement) => paiement.statut === "a_recevoir")
        .map(
          (paiement) =>
            `Versement ${paiement.numero_versement ?? 1} : ${money(paiement.montant)}`,
        ),
      "",
      instructionsPaiement,
    ];
  } else if (inscription.statut === "liste_attente") {
    sujet = `Liste d'attente — ${nomCours}`;
    titre = "Inscription sur la liste d'attente";
    message =
      "Le groupe est actuellement complet. L'inscription a été placée sur la liste d'attente. Aucun paiement n'est demandé pour le moment.";
    accent = "#a66a00";
    fondAccent = "#fff7e6";
  } else if (inscription.statut === "en_attente_validation") {
    sujet = `Inscription en attente de validation — ${nomCours}`;
    titre = "Inscription reçue pour validation";
    message =
      "Cette inscription doit être validée par l'administration avant qu'une place et un paiement puissent être confirmés. Aucun paiement n'est demandé pour le moment.";
    accent = "#7a5a00";
    fondAccent = "#fff8dc";
  } else {
    return json(
      {
        error: `Aucun courriel initial n'est prévu pour le statut ${inscription.statut}.`,
      },
      400,
    );
  }

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
          ${logoBlock}

          <tr>
            <td align="center" style="padding:0 28px 24px;">
              <div style="font-size:14px;font-weight:700;letter-spacing:.02em;color:#17375e;">
                ${html(nomOrganisation)}
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:${accent};padding:22px 28px;">
              <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;font-weight:700;">
                ${html(titre)}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#1f2937;">
                Bonjour,
              </p>

              <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#1f2937;">
                ${html(message)}
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

              ${paymentBlock}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;background:${fondAccent};border-radius:10px;">
                <tr>
                  <td style="padding:16px 18px;border-left:4px solid ${accent};">
                    <div style="font-size:14px;line-height:1.6;color:#374151;">
                      Vous pouvez consulter votre espace parent pour suivre l'état de l'inscription.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:26px 0 0;font-size:15px;line-height:1.6;color:#1f2937;">
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

  const emailText = [
    nomOrganisation,
    "",
    titre,
    "",
    "Bonjour,",
    "",
    message,
    "",
    `Enfant : ${nomEnfant}`,
    `Activité : ${nomCours}`,
    `Groupe : ${nomGroupe}`,
    ...(paymentText.length ? ["", ...paymentText] : []),
    "",
    "Vous pouvez consulter votre espace parent pour suivre l'état de l'inscription.",
    "",
    "Merci,",
    nomOrganisation,
    ...(coordonneesTexte.length ? ["", ...coordonneesTexte] : []),
  ].join("\n");

  const resendPayload: Record<string, unknown> = {
    from: `${nomOrganisation} <noreply@volleyballattack.ca>`,
    to: [courrielDestinataire],
    subject: sujet,
    html: emailHtml,
    text: emailText,
  };

  if (courrielOrganisation) {
    resendPayload.reply_to = courrielOrganisation;
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
          "L'inscription existe, mais le courriel n'a pas pu être envoyé.",
      },
      502,
    );
  }

  return json({
    success: true,
    email_id: resendResult.id ?? null,
    statut: inscription.statut,
  });
});
