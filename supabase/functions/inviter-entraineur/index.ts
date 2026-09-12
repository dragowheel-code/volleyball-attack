import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reponseJson(contenu: unknown, status = 200) {
  return new Response(JSON.stringify(contenu), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

async function trouverUtilisateurParCourriel(
  supabaseAdmin: ReturnType<typeof createClient>,
  courriel: string
) {
  const parPage = 1000;
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: parPage });
    if (error) throw error;
    const utilisateur = data.users.find(
      (item) => item.email?.trim().toLowerCase() === courriel
    );
    if (utilisateur) return utilisateur;
    if (data.users.length < parPage) return null;
    page += 1;
  }
}

async function envoyerCourrielInvitation({
  resendApiKey,
  courriel,
  prenom,
  lienInvitation,
  organisation,
  modeTest = false,
}: {
  resendApiKey: string;
  courriel: string;
  prenom: string;
  lienInvitation: string;
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
  const prenomHtml = echapperHtml(prenom);
  const nomOrganisationHtml = echapperHtml(nomOrganisation);
  const lienHtml = echapperHtml(lienInvitation);
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
          ${modeTest ? `<div style="display:inline-block;margin-bottom:16px;padding:7px 12px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;">MODE TEST — aucun compte créé</div>` : ""}
          <h1 style="margin:0;font-size:24px;line-height:1.3;">Invitation entraîneur</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;font-size:16px;line-height:1.6;">
          <p>Bonjour ${prenomHtml},</p>
          ${modeTest ? `<p style="padding:12px 14px;border-radius:8px;background:#fff7ed;color:#9a3412;"><strong>Courriel de test :</strong> ce message sert uniquement à vérifier l'apparence de l'invitation. Aucun utilisateur, profil ou accès entraîneur n'a été créé.</p>` : ""}
          <p>Vous avez été invité à accéder à l'espace entraîneur de <strong>${nomOrganisationHtml}</strong>.</p>
          <p>Pour activer votre compte et choisir votre mot de passe, utilisez le bouton ci-dessous.</p>
          <p style="text-align:center;margin:30px 0;">
            <a href="${lienHtml}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px;">Accepter l'invitation</a>
          </p>
          <p style="font-size:14px;color:#4b5563;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="font-size:13px;word-break:break-all;color:#4b5563;">${lienHtml}</p>
          <p>Si vous ne vous attendiez pas à recevoir cette invitation, vous pouvez simplement ignorer ce courriel.</p>
          <p style="margin-top:28px;">${nomOrganisationHtml}</p>
          ${coordonnees ? `<p style="font-size:13px;color:#6b7280;margin-top:4px;">${coordonnees}</p>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const payload: Record<string, unknown> = {
    from: `${nomOrganisation} <noreply@volleyballattack.ca>`,
    to: [courriel],
    subject: `${modeTest ? "[TEST] " : ""}Invitation entraîneur — ${nomOrganisation}`,
    html,
  };
  if (courrielOrganisation) payload.reply_to = courrielOrganisation;

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
      resultat?.message || resultat?.error || "Impossible d'envoyer le courriel d'invitation."
    );
  }
  return resultat;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return reponseJson({ error: "Méthode non autorisée." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !resendApiKey) {
      return reponseJson({ error: "Configuration Supabase ou Resend incomplète." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return reponseJson({ error: "Authentification requise." }, 401);
    }

    const supabaseUtilisateur = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: utilisateur, error: erreurUtilisateur } =
      await supabaseUtilisateur.auth.getUser();
    if (erreurUtilisateur || !utilisateur?.user) {
      return reponseJson({ error: "Utilisateur invalide." }, 401);
    }

    const { data: profil, error: erreurProfil } = await supabaseUtilisateur
      .from("profils")
      .select("id, actif, est_administrateur")
      .eq("id", utilisateur.user.id)
      .maybeSingle();
    if (
      erreurProfil ||
      !profil ||
      profil.actif !== true ||
      profil.est_administrateur !== true
    ) {
      return reponseJson({ error: "Accès administrateur requis." }, 403);
    }

    const corps = await req.json();
    const action = String(corps?.action ?? "inviter").trim().toLowerCase();
    const modeTest = corps?.mode_test === true;
    const testEmail = String(corps?.test_email ?? "").trim().toLowerCase();
    const prenom = String(corps?.prenom ?? "").trim();
    const nom = String(corps?.nom ?? "").trim();
    const courriel = String(corps?.courriel ?? "").trim().toLowerCase();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (modeTest) {
      if (!testEmail) {
        return reponseJson(
          { error: "Une adresse test_email est requise en mode test." },
          400
        );
      }

      const { data: organisation, error: erreurOrganisation } = await supabaseAdmin
        .from("organisation")
        .select("nom_affichage, nom_legal, courriel, telephone, logo_url")
        .limit(1)
        .maybeSingle();
      if (erreurOrganisation) throw erreurOrganisation;

      const resultatCourriel = await envoyerCourrielInvitation({
        resendApiKey,
        courriel: testEmail,
        prenom: prenom || "Prénom",
        lienInvitation: "https://www.volleyballattack.ca/",
        organisation,
        modeTest: true,
      });

      return reponseJson({
        success: true,
        mode_test: true,
        message: "Courriel d'invitation entraîneur de test envoyé.",
        email_id: resultatCourriel?.id ?? null,
        destination: testEmail,
        aucune_creation: true,
      });
    }

    if (!prenom || !nom || !courriel) {
      return reponseJson({ error: "Tous les champs sont obligatoires." }, 400);
    }

    const utilisateurExistant = await trouverUtilisateurParCourriel(
      supabaseAdmin,
      courriel
    );

    if (utilisateurExistant) {
      const { data: profilExistant, error: erreurProfilExistant } =
        await supabaseAdmin
          .from("profils")
          .select(
            "id, prenom, nom, actif, est_parent, est_entraineur, est_administrateur, entraineur_enregistre"
          )
          .eq("id", utilisateurExistant.id)
          .maybeSingle();
      if (erreurProfilExistant) throw erreurProfilExistant;
      if (!profilExistant) {
        return reponseJson(
          { error: "Le compte existe, mais son profil est introuvable." },
          500
        );
      }
      if (profilExistant.actif !== true) {
        return reponseJson({ error: "Ce compte est actuellement désactivé." }, 400);
      }
      if (profilExistant.est_entraineur === true) {
  if (action !== "renvoyer") {
    return reponseJson(
      { error: "Cette personne possède déjà un accès entraîneur." },
      400
    );
  }

  const redirectTo = "https://www.volleyballattack.ca/accepter-invitation";

  const { data: nouveauLien, error: erreurNouveauLien } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: courriel,
      options: {
        redirectTo,
      },
    });

  if (erreurNouveauLien) throw erreurNouveauLien;

  const lienInvitation = nouveauLien.properties?.action_link;

  if (!lienInvitation) {
    return reponseJson(
      { error: "Le nouveau lien d'invitation n'a pas pu être généré." },
      500
    );
  }

  const { data: organisation, error: erreurOrganisation } =
    await supabaseAdmin
      .from("organisation")
      .select("nom_affichage, nom_legal, courriel, telephone, logo_url")
      .limit(1)
      .maybeSingle();

  if (erreurOrganisation) throw erreurOrganisation;

  const resultatCourriel = await envoyerCourrielInvitation({
    resendApiKey,
    courriel,
    prenom: profilExistant.prenom || prenom,
    lienInvitation,
    organisation,
  });

  return reponseJson({
    success: true,
    type: "invitation_renvoyee",
    message: "Invitation entraîneur renvoyée.",
    utilisateur_id: utilisateurExistant.id,
    email_id: resultatCourriel?.id ?? null,
  });
}

      const { error: erreurActivation } = await supabaseAdmin
        .from("profils")
        .update({
          est_entraineur: true,
          entraineur_enregistre: true,
          date_modification: new Date().toISOString(),
        })
        .eq("id", utilisateurExistant.id);
      if (erreurActivation) throw erreurActivation;

      return reponseJson({
        success: true,
        type: "acces_ajoute",
        message: "L'accès entraîneur a été ajouté au compte existant.",
        utilisateur_id: utilisateurExistant.id,
      });
    }

    const redirectTo = "https://www.volleyballattack.ca/accepter-invitation";
    const { data: invitationAuth, error: erreurInvitationAuth } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: courriel,
        options: {
          data: { prenom, nom },
          redirectTo,
        },
      });
    if (erreurInvitationAuth) throw erreurInvitationAuth;

    const nouvelUtilisateurId = invitationAuth.user?.id;
    const lienInvitation = invitationAuth.properties?.action_link;
    if (!nouvelUtilisateurId || !lienInvitation) {
      return reponseJson(
        { error: "L'invitation n'a pas pu être générée correctement." },
        500
      );
    }

    const { data: profilMisAJour, error: erreurProfilEntraineur } =
      await supabaseAdmin
        .from("profils")
        .update({
          prenom,
          nom,
          actif: true,
          est_parent: false,
          est_entraineur: true,
          est_administrateur: false,
          entraineur_enregistre: true,
          administrateur_enregistre: false,
          date_modification: new Date().toISOString(),
        })
        .eq("id", nouvelUtilisateurId)
        .select("id")
        .maybeSingle();
    if (erreurProfilEntraineur) throw erreurProfilEntraineur;
    if (!profilMisAJour) {
      throw new Error("Le profil de l'entraîneur n'a pas pu être créé correctement.");
    }

    const { data: parentTemporaire, error: erreurParentTemporaire } =
      await supabaseAdmin
        .from("parents")
        .select("profil_id, famille_id")
        .eq("profil_id", nouvelUtilisateurId)
        .maybeSingle();
    if (erreurParentTemporaire) throw erreurParentTemporaire;

    if (parentTemporaire) {
      const familleId = parentTemporaire.famille_id;
      const { error: erreurSuppressionParent } = await supabaseAdmin
        .from("parents")
        .delete()
        .eq("profil_id", nouvelUtilisateurId);
      if (erreurSuppressionParent) throw erreurSuppressionParent;

      if (familleId) {
        const { count: nombreParentsRestants, error: erreurVerificationFamille } =
          await supabaseAdmin
            .from("parents")
            .select("profil_id", { count: "exact", head: true })
            .eq("famille_id", familleId);
        if (erreurVerificationFamille) throw erreurVerificationFamille;
        if (nombreParentsRestants === 0) {
          const { error: erreurSuppressionFamille } = await supabaseAdmin
            .from("familles")
            .delete()
            .eq("id", familleId);
          if (erreurSuppressionFamille) throw erreurSuppressionFamille;
        }
      }
    }

    const { data: organisation, error: erreurOrganisation } = await supabaseAdmin
      .from("organisation")
      .select("nom_affichage, nom_legal, courriel, telephone, logo_url")
      .limit(1)
      .maybeSingle();
    if (erreurOrganisation) throw erreurOrganisation;

    const resultatCourriel = await envoyerCourrielInvitation({
      resendApiKey,
      courriel,
      prenom,
      lienInvitation,
      organisation,
    });

    return reponseJson({
      success: true,
      type: "invitation_envoyee",
      message: "Invitation entraîneur envoyée.",
      utilisateur_id: nouvelUtilisateurId,
      email_id: resultatCourriel?.id ?? null,
    });
  } catch (error) {
    console.error("Erreur inviter-entraineur:", error);
    return reponseJson(
      {
        error:
          error instanceof Error ? error.message : "Une erreur est survenue.",
      },
      500
    );
  }
});
