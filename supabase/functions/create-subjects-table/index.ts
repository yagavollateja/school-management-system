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

    // Create subjects table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS subjects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        code TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      );
      
      ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
      ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Allow all for authenticated users" ON subjects;
      CREATE POLICY "Allow all for authenticated users" ON subjects
        FOR ALL USING (true) WITH CHECK (true);
    `;

    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });
    
    if (tableError) {
      // Try alternate approach - check if table exists first
      const { data: checkData } = await supabaseAdmin.from("subjects").select("id").limit(1);
      if (!checkData && tableError.message.includes("does not exist")) {
        return new Response(JSON.stringify({ error: "Table does not exist. Please run this SQL in Supabase SQL Editor:\n\nCREATE TABLE subjects (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name TEXT NOT NULL,\n  code TEXT,\n  order_index INTEGER DEFAULT 0,\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nALTER TABLE subjects ENABLE ROW LEVEL SECURITY;\nALTER TABLE subjects FORCE ROW LEVEL SECURITY;\n\nCREATE POLICY \"Allow all for subjects\" ON subjects FOR ALL USING (true) WITH CHECK (true);" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Subjects table created or already exists" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err), instructions: "Run this SQL in Supabase SQL Editor:\n\nCREATE TABLE subjects (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  name TEXT NOT NULL,\n  code TEXT,\n  order_index INTEGER DEFAULT 0,\n  created_at TIMESTAMPTZ DEFAULT now()\n);\n\nALTER TABLE subjects ENABLE ROW LEVEL SECURITY;\nALTER TABLE subjects FORCE ROW LEVEL SECURITY;\n\nCREATE POLICY \"Allow all for subjects\" ON subjects FOR ALL USING (true) WITH CHECK (true);" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});