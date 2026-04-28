import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes("admin") && !roles.includes("super_admin")) {
      return json({ error: "Admin only" }, 403);
    }

    const { action, userId } = await req.json();
    if (!userId || !["verify", "unverify"].includes(action)) {
      return json({ error: "Invalid request" }, 400);
    }

    if (action === "unverify") {
      const { error } = await admin
        .from("profiles")
        .update({ is_verified: false, phone_verified_at: null })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // VERIFY: mark user verified, then purge other accounts sharing the phone
    const { data: profile, error: pErr } = await admin
      .from("profiles").select("phone").eq("id", userId).single();
    if (pErr || !profile) return json({ error: "User not found" }, 404);

    const phone = profile.phone;
    const { error: vErr } = await admin
      .from("profiles")
      .update({ is_verified: true, phone_verified_at: new Date().toISOString() })
      .eq("id", userId);
    if (vErr) return json({ error: vErr.message }, 500);

    let deleted = 0;
    if (phone && /^03\d{9}$/.test(phone)) {
      const { data: dupes } = await admin
        .from("profiles").select("id").eq("phone", phone).neq("id", userId);
      for (const d of dupes ?? []) {
        // Delete owned data first (no FK cascade configured)
        await admin.from("orders").delete().eq("customer_id", d.id);
        await admin.from("user_roles").delete().eq("user_id", d.id);
        await admin.from("password_reset_otps").delete().eq("user_id", d.id);
        await admin.from("profiles").delete().eq("id", d.id);
        // Finally remove the auth user — this invalidates their sessions
        await admin.auth.admin.deleteUser(d.id);
        deleted++;
      }
    }

    return json({ ok: true, deletedDuplicates: deleted });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
