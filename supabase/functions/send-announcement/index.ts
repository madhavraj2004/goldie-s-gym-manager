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
      // Send to specific members
      targetUserIds = target_user_ids;
    } else if (target_type === "filter") {
      // Filter by status and/or plan
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
      // Default: all members
      const { data: members, error: mErr } = await adminClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "member");
      if (mErr) throw mErr;
      targetUserIds = (members || []).map((m: any) => m.user_id);
    }

    if (!targetUserIds.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    return new Response(JSON.stringify({ sent: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
