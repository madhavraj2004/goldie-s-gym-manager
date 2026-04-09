import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find active members whose membership_end has passed
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredMembers, error: fetchErr } = await adminClient
      .from("member_profiles")
      .select("user_id, membership_end")
      .eq("membership_status", "active")
      .not("membership_end", "is", null)
      .lte("membership_end", today);

    if (fetchErr) throw fetchErr;
    if (!expiredMembers?.length) {
      return new Response(JSON.stringify({ expired: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = expiredMembers.map((m: any) => m.user_id);

    // Mark them as expired
    const { error: updateErr } = await adminClient
      .from("member_profiles")
      .update({ membership_status: "expired" })
      .in("user_id", userIds);

    if (updateErr) throw updateErr;

    // Send notification to each expired member
    const notifications = userIds.map((uid: string) => ({
      user_id: uid,
      title: "Membership Expired",
      message:
        "Your membership has expired. Please renew your plan to continue enjoying gym facilities.",
      type: "warning",
      is_read: false,
    }));

    const { error: notifErr } = await adminClient
      .from("notifications")
      .insert(notifications);

    if (notifErr) throw notifErr;

    // Send push notifications for expiry
    const fcmKeyJson = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY");
    if (fcmKeyJson) {
      try {
        const serviceAccount = JSON.parse(fcmKeyJson);
        const accessToken = await getAccessToken(serviceAccount);

        const { data: tokens } = await adminClient
          .from("push_tokens")
          .select("token, user_id")
          .in("user_id", userIds);

        if (tokens?.length) {
          await Promise.allSettled(
            tokens.map(async (t: any) => {
              await fetch(
                `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    message: {
                      token: t.token,
                      notification: {
                        title: "Membership Expired",
                        body: "Your membership has expired. Please renew your plan to continue.",
                      },
                      android: {
                        priority: "high",
                        notification: { sound: "default", channel_id: "default" },
                      },
                    },
                  }),
                }
              );
            })
          );
        }
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }
    }

    // Check for members whose membership expires in 3 days (reminder)
    const threeDaysLater = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const { data: expiringMembers } = await adminClient
      .from("member_profiles")
      .select("user_id")
      .eq("membership_status", "active")
      .not("membership_end", "is", null)
      .eq("membership_end", threeDaysLater);

    if (expiringMembers?.length) {
      const expiringIds = expiringMembers.map((m: any) => m.user_id);
      const reminderNotifs = expiringIds.map((uid: string) => ({
        user_id: uid,
        title: "Membership Expiring Soon",
        message: "Your membership expires in 3 days. Renew now to avoid interruption.",
        type: "warning",
        is_read: false,
      }));
      await adminClient.from("notifications").insert(reminderNotifs);

      // Push for expiring soon
      if (fcmKeyJson) {
        try {
          const serviceAccount = JSON.parse(fcmKeyJson);
          const accessToken = await getAccessToken(serviceAccount);
          const { data: tokens } = await adminClient
            .from("push_tokens")
            .select("token")
            .in("user_id", expiringIds);

          if (tokens?.length) {
            await Promise.allSettled(
              tokens.map(async (t: any) => {
                await fetch(
                  `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      message: {
                        token: t.token,
                        notification: {
                          title: "Membership Expiring Soon",
                          body: "Your membership expires in 3 days. Renew now!",
                        },
                        android: {
                          priority: "high",
                          notification: { sound: "default", channel_id: "default" },
                        },
                      },
                    }),
                  }
                );
              })
            );
          }
        } catch (pushErr) {
          console.error("Expiry reminder push error:", pushErr);
        }
      }
    }

    return new Response(JSON.stringify({ expired: userIds.length, expiring_soon: expiringMembers?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
