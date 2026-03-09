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

    return new Response(JSON.stringify({ expired: userIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
