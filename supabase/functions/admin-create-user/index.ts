import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    let userId: string | null = null;
    
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      userId = user?.id ?? null;
    }
    
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: No valid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (!profile || profile.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: Admin only. Your role: " + (profile?.role ?? "none") }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { name, email, password, role, phone, class_id, section_id, roll_number, parent_name, parent_phone, address, date_of_birth } = body;

    if (!name || !email || !password || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, password, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if email already exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = users?.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return new Response(JSON.stringify({ error: "Email already in use" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: newUser.user.id,
      name,
      email,
      role,
      phone: phone ?? null,
    }, { onConflict: "user_id" });

    // Create student record
    if (role === "student" && class_id && section_id) {
      const studentRoll = roll_number || 1;
      await supabaseAdmin.from("students").insert({
        user_id: newUser.user.id,
        class_id,
        section_id,
        roll_number: studentRoll,
        parent_name: parent_name ?? null,
        parent_phone: parent_phone ?? null,
        address: address ?? null,
        date_of_birth: date_of_birth ?? null,
      });
    }

    // Create teacher record
    if (role === "faculty") {
      await supabaseAdmin.from("teachers").insert({
        user_id: newUser.user.id,
        qualification: "TBD",
        experience_years: 0,
      });
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.user.id, message: "User created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});