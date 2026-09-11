import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const messageNeutre =
  "Si un compte correspond à ce courriel, un lien de réinitialisation vous sera envoyé.";

function reponseJson(contenu: unknown, status = 200) {
  return new Response(JSON.stringify(contenu), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function echapperHtml(valeur: unknown) {
  return String(valeur ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function chargerOrganisation(
  supabaseAdmin: ReturnType<typeof createClient>
) {
  const { data, error } = await supabaseAdmin
    .from("organisation")
    .select("nom_affichage, nom_legal, courriel, telephone, logo_url")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function verifierAdministrateur({
  supabaseUrl,
  supabaseAnonKey,
  authorization,
}: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authorization: string | null;
}) {
  if (!authorization) return false;

  const supabaseUtilisateur = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: erreurUtilisateur,
  } = await supabaseUtilisateur.auth.getUser();

  if (erreurUtilisateur || !user) return false;

  const { data: profil, error: erreurProfil } = await supabaseUtilisateur
    .from("profils")
    .select("actif, est_administrateur")
    .eq("id", user.id)
    .maybeSingle();

  return (
    !erreurProfil &&
    profil?.actif === true &&
    profil?.est_administrateur === true
  );
}

async function envoyerCourrielReinitialisation({
  resendApiKey,
  courriel,
  lienReinitialisation,
  organisation,
  modeTest = false,
}: {
  resendApiKey: string;
  courriel: string;
  lienReinitialisation: string;
  organisation: {
    nom_affichage?: string | null;
    nom_legal?: string | null;
    courriel?: string | null;
    telephone?: string | null;
    logo_url?: string | null;
  } | null;
  modeTest?: boolean;
}) {
  const nomOrganisation =
    organisation?.nom_affichage?.trim() ||
    organisation?.nom_legal?.trim() ||
    "Volley-Ball Attack";

  const logoUrl = organisation?.logo_url?.trim() || "";
  const courrielOrganisation = organisation?.courriel?.trim() || "";
  const telephoneOrganisation = organisation?.telephone?.trim() || "";

  const nomOrganisationHtml = echapperHtml(nomOrganisation);
  const lienHtml = echapperHtml(lienReinitialisation);

  const logoHtml = logoUrl
    ? `<img src="${echapperHtml(logoUrl)}" alt="${nomOrganisationHtml}" style="max-width:180px;max-height:90px;display:block;margin:0 auto 20px;">`
    : "";

  const coordonnees = [courrielOrganisation, telephoneOrganisation]
    .filter(Boolean)
    .map((valeur) => echapperHtml(valeur))
    .join(" · ");

  const html = `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:32px 32px 12px;text-align:center;">
          ${logoHtml}
          ${
            modeTest
              ? `<div style="display:inline-block;margin-bottom:16px;padding:7px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;">MODE TEST — aucun mot de passe modifié</div>`
              : ""
          }
          <h1 style="margin:0;font-size:24px;line-height:1.3;">Réinitialisation du mot de passe</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;font-size:16px;line-height:1.6;">
          ${
            modeTest
              ? `<p style="padding:12px 14px;border-radius:8px;background:#fff7ed;color:#9a3412;"><strong>Courriel de test :</strong> ce message sert uniquement à vérifier l'apparence du courriel. Aucun lien de récupération réel n'a été généré et aucun mot de passe n'a été modifié.</p>`
              : ""
          }
          <p>Une demande de réinitialisation du mot de passe a été faite pour votre compte <strong>${nomOrganisationHtml}</strong>.</p>
          <p>Utilisez le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${lienHtml}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px;">Réinitialiser mon mot de passe</a>
          </p>
          <p style="font-size:14px;color:#4b5563;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="font-size:13px;word-break:break-all;color:#4b5563;">${lienHtml}</p>
          <p>Ce lien est temporaire. Si vous n'avez pas demandé cette réinitialisation, vous pouvez simplement ignorer ce courriel et conserver votre mot de passe actuel.</p>
          <p style="margin-top:28px;">${nomOrganisationHtml}</p>
          ${
            coordonnees
              ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">${coordonnees}</p>`
              : ""
          }
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const payload: Record<string, unknown> = {
    from: `${nomOrganisation} <noreply@volleyballattack.ca>`,
    to: [courriel],
    subject: `${
      modeTest ? "[TEST] " : ""
    }Réinitialisation de votre mot de passe — ${nomOrganisation}`,
    html,
  };

  if (courrielOrganisation) {
    payload.reply_to = courrielOrganisation;
  }

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resultat = await reponse.json().catch(() => null);

  if (!reponse.ok) {
    throw new Error(
      resultat?.message ||
        resultat?.error ||
        "Impossible d'envoyer le courriel de réinitialisation."
    );
  }

  return resultat;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reponseJson({ error: "Méthode non autorisée." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !resendApiKey) {
    console.error("Configuration Supabase ou Resend incomplète.");
    return reponseJson(
      { error: "Le service de réinitialisation est temporairement indisponible." },
      500
    );
  }

  let corps: Record<string, unknown>;

  try {
    corps = await req.json();
  } catch {
    return reponseJson({ error: "Requête invalide." }, 400);
  }

  const modeTest = corps?.mode_test === true;
  const testEmail = String(corps?.test_email ?? "").trim().toLowerCase();
  const courriel = String(corps?.courriel ?? "").trim().toLowerCase();

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    if (modeTest) {
      const estAdministrateur = await verifierAdministrateur({
        supabaseUrl,
        supabaseAnonKey,
        authorization: req.headers.get("Authorization"),
      });

      if (!estAdministrateur) {
        return reponseJson({ error: "Accès administrateur requis." }, 403);
      }

      if (!testEmail) {
        return reponseJson(
          { error: "Une adresse test_email est requise en mode test." },
          400
        );
      }

      const organisation = await chargerOrganisation(supabaseAdmin);

      const resultatCourriel = await envoyerCourrielReinitialisation({
        resendApiKey,
        courriel: testEmail,
        lienReinitialisation: "https://www.volleyballattack.ca/",
        organisation,
        modeTest: true,
      });

      return reponseJson({
        success: true,
        mode_test: true,
        message: "Courriel de réinitialisation de test envoyé.",
        email_id: resultatCourriel?.id ?? null,
        destination: testEmail,
        aucune_modification: true,
      });
    }

    if (!courriel) {
      return reponseJson({ success: true, message: messageNeutre });
    }

    const redirectTo =
      "https://www.volleyballattack.ca/reinitialiser-mot-de-passe";

    const { data: lien, error: erreurLien } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: courriel,
        options: {
          redirectTo,
        },
      });

    const lienReinitialisation = lien?.properties?.action_link;

    if (erreurLien || !lienReinitialisation) {
      console.info(
        "Réinitialisation non envoyée pour le courriel demandé :",
        erreurLien?.message || "Aucun lien généré."
      );
      return reponseJson({ success: true, message: messageNeutre });
    }

    const organisation = await chargerOrganisation(supabaseAdmin);

    try {
      await envoyerCourrielReinitialisation({
        resendApiKey,
        courriel,
        lienReinitialisation,
        organisation,
      });
    } catch (erreurCourriel) {
      console.error(
        "Erreur d'envoi du courriel de réinitialisation :",
        erreurCourriel
      );
    }

    return reponseJson({ success: true, message: messageNeutre });
  } catch (error) {
    console.error("Erreur envoyer-courriel-reinitialisation :", error);

    if (modeTest) {
      return reponseJson(
        {
          error:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue pendant le test.",
        },
        500
      );
    }

    return reponseJson({ success: true, message: messageNeutre });
  }
});
