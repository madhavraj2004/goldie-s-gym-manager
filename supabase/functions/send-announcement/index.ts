import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  // Create JWT for Google OAuth2
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const toBase64Url = (data: Uint8Array) =>
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = toBase64Url(encoder.encode(JSON.stringify(header)));
  const claimB64 = toBase64Url(encoder.encode(JSON.stringify(claim)));
  const unsignedJwt = `${headerB64}.${claimB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedJwt)
  );

  const signedJwt = `${unsignedJwt}.${toBase64Url(new Uint8Array(signature))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`OAuth error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string
) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title, body },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "default",
            },
          },
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error(`FCM send failed for token ${deviceToken.slice(0, 10)}...: ${err}`);
  }
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) throw new Error("Admin access required");

    const { title, message, type, target_type, target_user_ids, target_status, target_plan_id } = await req.json();
    if (!title || !message) throw new Error("Title and message are required");

    let targetUserIds: string[] = [];

    if (target_type === "specific" && target_user_ids?.length) {
      targetUserIds = target_user_ids;
    } else if (target_type === "filter") {
      let query = adminClient.from("member_profiles").select("user_id");
      if (target_status && target_status !== "all") {
        query = query.eq("membership_status", target_status);
      }
      if (target_plan_id && target_plan_id !== "all") {
        query = query.eq("plan_id", target_plan_id);
      }
      const { data: filtered, error: fErr } = await query;
      if (fErr) throw fErr;
      targetUserIds = (filtered || []).map((m: any) => m.user_id);
    } else {
      const { data: members, error: mErr } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "member");
      if (mErr) throw mErr;
      targetUserIds = (members || []).map((m: any) => m.user_id);
    }

    if (!targetUserIds.length) {
      return new Response(JSON.stringify({ sent: 0, pushed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert in-app notifications
    const rows = targetUserIds.map((uid: string) => ({
      user_id: uid,
      title,
      message,
      type: type || "announcement",
      is_read: false,
    }));

    const { error: insertErr } = await adminClient
      .from("notifications")
      .insert(rows);
    if (insertErr) throw insertErr;

    // Send FCM push notifications
    let pushed = 0;
    const fcmKeyJson = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");
    if (fcmKeyJson) {
      try {
        const serviceAccount = JSON.parse(fcmKeyJson);
        const accessToken = await getAccessToken(serviceAccount);

        // Get push tokens for target users
        const { data: tokens } = await adminClient
          .from("push_tokens")
          .select("token")
          .in("user_id", targetUserIds);

        if (tokens?.length) {
          const results = await Promise.allSettled(
            tokens.map((t: any) =>
              sendFcmNotification(accessToken, serviceAccount.project_id, t.token, title, message)
            )
          );
          pushed = results.filter((r) => r.status === "fulfilled" && r.value).length;
        }
      } catch (fcmErr) {
        console.error("FCM error:", fcmErr);
      }
    } else {
      console.warn("FCM_SERVICE_ACCOUNT_KEY not configured, skipping push notifications");
    }

    return new Response(JSON.stringify({ sent: rows.length, pushed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
