import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


function echapperHtml(valeur: unknown) {
  return String(valeur ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
          <h1 style="margin:0;font-size:24px;line-height:1.3;">Invitation comme deuxième parent</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 32px;font-size:16px;line-height:1.6;">
          <p>Bonjour ${prenomHtml},</p>
          ${modeTest ? `<p style="padding:12px 14px;border-radius:8px;background:#fff7ed;color:#9a3412;"><strong>Courriel de test :</strong> ce message sert uniquement à vérifier l'apparence de l'invitation. Aucun compte, parent ni rattachement familial n'a été créé.</p>` : ""}
          <p>Vous avez été invité à rejoindre une famille dans l'espace parent de <strong>${nomOrganisationHtml}</strong>.</p>
          <p>Pour activer votre compte et choisir votre mot de passe, utilisez le bouton ci-dessous.</p>
          <p style="text-align:center;margin:30px 0;"><a href="${lienHtml}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:8px;">Accepter l'invitation</a></p>
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
    subject: `${modeTest ? "[TEST] " : ""}Invitation deuxième parent — ${nomOrganisation}`,
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !resendApiKey) {
      throw new Error("Configuration Supabase ou Resend incomplète.");
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return reponseErreur("Authentification requise.", 401);
    }

    const supabaseUtilisateur = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: erreurUtilisateur,
    } = await supabaseUtilisateur.auth.getUser();

    if (erreurUtilisateur || !user) {
      return reponseErreur("Authentification invalide.", 401);
    }

    const { data: profilInviteur, error: erreurProfilInviteur } =
      await supabaseAdmin
        .from("profils")
        .select("id, actif, est_parent")
        .eq("id", user.id)
        .maybeSingle();

    if (erreurProfilInviteur) throw erreurProfilInviteur;

    if (
      !profilInviteur ||
      profilInviteur.actif !== true ||
      profilInviteur.est_parent !== true
    ) {
      return reponseErreur("Accès parent requis.", 403);
    }

    const { data: parentInviteur, error: erreurParentInviteur } =
      await supabaseAdmin
        .from("parents")
        .select("id, famille_id")
        .eq("profil_id", user.id)
        .maybeSingle();

    if (erreurParentInviteur) throw erreurParentInviteur;

    if (!parentInviteur?.famille_id) {
      return reponseErreur(
        "Aucune famille n'est associée à votre compte.",
        400
      );
    }

    const corps = await req.json();
    const modeTest = corps?.mode_test === true;
    const testEmail = String(corps?.test_email ?? "").trim().toLowerCase();

    const prenom = String(corps.prenom ?? "").trim();
    const nom = String(corps.nom ?? "").trim();
    const courriel = String(corps.courriel ?? "").trim().toLowerCase();
    const telephone = String(corps.telephone ?? "").trim();
    const lien = String(corps.lien ?? "").trim();

    if (modeTest) {
      if (!testEmail) {
        return reponseErreur("Une adresse test_email est requise en mode test.", 400);
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
      return reponseSucces({
        success: true,
        mode_test: true,
        message: "Courriel d'invitation deuxième parent de test envoyé.",
        email_id: resultatCourriel?.id ?? null,
        destination: testEmail,
        aucune_creation: true,
      });
    }

    if (!prenom || !nom || !courriel || !lien) {
      return reponseErreur(
        "Le prénom, le nom, le courriel et le lien sont obligatoires.",
        400
      );
    }

    if (user.email?.toLowerCase() === courriel) {
      return reponseErreur(
        "Vous ne pouvez pas vous inviter vous-même comme deuxième parent.",
        400
      );
    }

    const utilisateurExistant =
      await trouverUtilisateurParCourriel(supabaseAdmin, courriel);

    if (utilisateurExistant) {
      const resultat = await rattacherUtilisateurExistant({
        supabaseAdmin,
        utilisateurId: utilisateurExistant.id,
        familleId: parentInviteur.famille_id,
        prenom,
        nom,
        telephone,
        lien,
      });

      return reponseSucces(resultat);
    }

    const redirectTo = "https://www.volleyballattack.ca/accepter-invitation";

    const { data: invitation, error: erreurInvitation } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: courriel,
        options: {
          data: { prenom, nom, telephone },
          redirectTo,
        },
      });

    if (erreurInvitation) throw erreurInvitation;

    const nouvelUtilisateurId = invitation.user?.id;
    const lienInvitation = invitation.properties?.action_link;

    if (!nouvelUtilisateurId || !lienInvitation) {
      throw new Error("Impossible de générer l'invitation.");
    }

    const { data: parentCree, error: erreurParentCree } =
      await supabaseAdmin
        .from("parents")
        .select("id, famille_id")
        .eq("profil_id", nouvelUtilisateurId)
        .maybeSingle();

    if (erreurParentCree) throw erreurParentCree;

    let parentId: string;

    if (parentCree) {
      parentId = parentCree.id;
      const ancienneFamilleId = parentCree.famille_id;

      const { error } = await supabaseAdmin
        .from("parents")
        .update({
          famille_id: parentInviteur.famille_id,
          telephone: telephone || null,
          date_modification: new Date().toISOString(),
        })
        .eq("id", parentCree.id);

      if (error) throw error;

      if (
        ancienneFamilleId &&
        ancienneFamilleId !== parentInviteur.famille_id
      ) {
        await supprimerFamilleVide(
          supabaseAdmin,
          ancienneFamilleId
        );
      }
    } else {
      const { data: nouveauParent, error } = await supabaseAdmin
        .from("parents")
        .insert({
          profil_id: nouvelUtilisateurId,
          famille_id: parentInviteur.famille_id,
          telephone: telephone || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      parentId = nouveauParent.id;
    }

    const { error: erreurProfil } = await supabaseAdmin
      .from("profils")
      .update({
        prenom,
        nom,
        actif: true,
        est_parent: true,
        date_modification: new Date().toISOString(),
      })
      .eq("id", nouvelUtilisateurId);

    if (erreurProfil) throw erreurProfil;

    await rattacherParentAuxEnfants({
      supabaseAdmin,
      parentId,
      familleId: parentInviteur.famille_id,
      lien,
    });

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

    return reponseSucces({
      success: true,
      type: "invitation_envoyee",
      message: "L'invitation du deuxième parent a été envoyée.",
      email_id: resultatCourriel?.id ?? null,
    });
  } catch (error) {
    console.error("inviter-deuxieme-parent :", error);

    return reponseErreur(
      error instanceof Error
        ? error.message
        : "Une erreur est survenue.",
      500
    );
  }
});

async function rattacherUtilisateurExistant({
  supabaseAdmin,
  utilisateurId,
  familleId,
  prenom,
  nom,
  telephone,
  lien,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  utilisateurId: string;
  familleId: string;
  prenom: string;
  nom: string;
  telephone: string;
  lien: string;
}) {
  const { data: profil, error: erreurProfil } = await supabaseAdmin
    .from("profils")
    .select("id, actif, est_parent")
    .eq("id", utilisateurId)
    .maybeSingle();

  if (erreurProfil) throw erreurProfil;

  if (!profil) {
    throw new Error("Le profil utilisateur est introuvable.");
  }

  if (!profil.actif) {
    throw new Error(
      "Ce compte utilisateur est actuellement désactivé."
    );
  }

  const { data: parentExistant, error: erreurParent } =
    await supabaseAdmin
      .from("parents")
      .select("id, famille_id")
      .eq("profil_id", utilisateurId)
      .maybeSingle();

  if (erreurParent) throw erreurParent;

  if (
    parentExistant &&
    parentExistant.famille_id !== familleId
  ) {
    throw new Error(
      "Ce compte parent est déjà rattaché à une autre famille."
    );
  }

  let parentId: string;

  if (parentExistant) {
    parentId = parentExistant.id;

    const { error } = await supabaseAdmin
      .from("parents")
      .update({
        telephone: telephone || null,
        date_modification: new Date().toISOString(),
      })
      .eq("id", parentExistant.id);

    if (error) throw error;
  } else {
    const { data: nouveauParent, error } = await supabaseAdmin
      .from("parents")
      .insert({
        profil_id: utilisateurId,
        famille_id: familleId,
        telephone: telephone || null,
      })
      .select("id")
      .single();

    if (error) throw error;

    parentId = nouveauParent.id;
  }

  const { error: erreurMiseAJourProfil } = await supabaseAdmin
    .from("profils")
    .update({
      prenom,
      nom,
      est_parent: true,
      date_modification: new Date().toISOString(),
    })
    .eq("id", utilisateurId);

  if (erreurMiseAJourProfil) {
    throw erreurMiseAJourProfil;
  }

  await rattacherParentAuxEnfants({
    supabaseAdmin,
    parentId,
    familleId,
    lien,
  });

  return {
    success: true,
    type: profil.est_parent
      ? "parent_existant"
      : "acces_parent_ajoute",
    message: profil.est_parent
      ? "Ce parent est maintenant rattaché à votre famille."
      : "L'accès parent a été ajouté au compte existant.",
  };
}

async function rattacherParentAuxEnfants({
  supabaseAdmin,
  parentId,
  familleId,
  lien,
}: {
  supabaseAdmin: ReturnType<typeof createClient>;
  parentId: string;
  familleId: string;
  lien: string;
}) {
  const { data: enfants, error: erreurEnfants } =
    await supabaseAdmin
      .from("enfants")
      .select("id")
      .eq("famille_id", familleId)
      .eq("actif", true);

  if (erreurEnfants) throw erreurEnfants;

  if (!enfants?.length) return;

  const enfantIds = enfants.map((enfant) => enfant.id);

  const { data: liensExistants, error: erreurLiens } =
    await supabaseAdmin
      .from("parents_enfants")
      .select("enfant_id")
      .eq("parent_id", parentId)
      .in("enfant_id", enfantIds);

  if (erreurLiens) throw erreurLiens;

  const idsExistants = new Set(
    (liensExistants || []).map((item) => item.enfant_id)
  );

  const nouveauxLiens = enfants
    .filter((enfant) => !idsExistants.has(enfant.id))
    .map((enfant) => ({
      parent_id: parentId,
      enfant_id: enfant.id,
      lien,
      principal: false,
    }));

  if (nouveauxLiens.length > 0) {
    const { error } = await supabaseAdmin
      .from("parents_enfants")
      .insert(nouveauxLiens);

    if (error) throw error;
  }
}

async function trouverUtilisateurParCourriel(
  supabaseAdmin: ReturnType<typeof createClient>,
  courriel: string
) {
  let page = 1;

  while (true) {
    const { data, error } =
      await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

    if (error) throw error;

    const utilisateur = data.users.find(
      (item) => item.email?.toLowerCase() === courriel
    );

    if (utilisateur) return utilisateur;

    if (data.users.length < 1000) return null;

    page += 1;
  }
}

async function supprimerFamilleVide(
  supabaseAdmin: ReturnType<typeof createClient>,
  familleId: string
) {
  const { count, error } = await supabaseAdmin
    .from("parents")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("famille_id", familleId);

  if (error) {
    console.error(
      "Impossible de vérifier l'ancienne famille :",
      error
    );
    return;
  }

  if (count !== 0) return;

  const { count: enfantsRestants, error: erreurEnfants } =
    await supabaseAdmin
      .from("enfants")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("famille_id", familleId);

  if (erreurEnfants || enfantsRestants !== 0) return;

  const { error: erreurSuppression } = await supabaseAdmin
    .from("familles")
    .delete()
    .eq("id", familleId);

  if (erreurSuppression) {
    console.error(
      "Impossible de supprimer l'ancienne famille vide :",
      erreurSuppression
    );
  }
}

function reponseSucces(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function reponseErreur(message: string, status: number) {
  return new Response(
    JSON.stringify({
      success: false,
      message,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}