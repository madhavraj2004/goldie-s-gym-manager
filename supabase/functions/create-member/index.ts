import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: admin only");

    const body = await req.json();
    const { email, password, full_name, phone, ...memberData } = body;

    if (!email || !password || !full_name) {
      throw new Error("email, password, and full_name are required");
    }

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "member" },
    });
    if (createErr) throw createErr;

    const userId = newUser.user.id;

    // Update phone on profile if provided
    if (phone) {
      await supabaseAdmin.from("profiles").update({ phone }).eq("user_id", userId);
    }

    // Update member profile (trigger already creates it, so we upsert extra fields)
    const { weight_kg, height_cm, date_of_birth, gender, emergency_contact, emergency_phone, fitness_goal, medical_notes, assigned_trainer_id } = memberData;
    const updates: Record<string, any> = {};
    if (weight_kg !== undefined) updates.weight_kg = weight_kg;
    if (height_cm !== undefined) updates.height_cm = height_cm;
    if (date_of_birth) updates.date_of_birth = date_of_birth;
    if (gender) updates.gender = gender;
    if (emergency_contact) updates.emergency_contact = emergency_contact;
    if (emergency_phone) updates.emergency_phone = emergency_phone;
    if (fitness_goal) updates.fitness_goal = fitness_goal;
    if (medical_notes) updates.medical_notes = medical_notes;
    if (assigned_trainer_id) updates.assigned_trainer_id = assigned_trainer_id;

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("member_profiles").update(updates).eq("user_id", userId);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
