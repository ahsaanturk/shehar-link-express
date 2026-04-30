import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const phoneToEmail = (phone: string) => `${phone}@sheharlink.local`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, phone, otp, newPassword } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!phone || !/^03\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid phone format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "request") {
      // find user by phone
      const { data: profile } = await admin
        .from("profiles").select("id").eq("phone", phone).maybeSingle();
      if (!profile) {
        return new Response(JSON.stringify({ error: "No account with this phone" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check for existing valid OTP
      const { data: existing } = await admin
        .from("password_reset_otps")
        .select("*")
        .eq("phone", phone)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const createdAt = new Date(existing.created_at).getTime();
        const now = new Date().getTime();
        const diffMs = now - createdAt;
        
        // Cooldown: 2 minutes (120,000 ms)
        if (diffMs < 120000) {
          const waitSec = Math.ceil((120000 - diffMs) / 1000);
          return new Response(JSON.stringify({ error: `Please wait ${waitSec} seconds before requesting again.` }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Reuse OTP and reset expiry to 10 mins from now
        const newExpiry = new Date(now + 600000).toISOString();
        await admin.from("password_reset_otps").update({ expires_at: newExpiry }).eq("id", existing.id);
        
        return new Response(JSON.stringify({ ok: true, message: "OTP refreshed. Contact admin to receive it." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create new OTP
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(new Date().getTime() + 600000).toISOString(); // 10 mins
      await admin.from("password_reset_otps").insert({
        phone, user_id: profile.id, otp: code, expires_at: expiresAt
      });
      return new Response(JSON.stringify({ ok: true, message: "OTP created. Contact admin to receive it." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!otp || !newPassword) {
        return new Response(JSON.stringify({ error: "OTP and new password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: row } = await admin
        .from("password_reset_otps")
        .select("*")
        .eq("phone", phone).eq("otp", otp).eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1).maybeSingle();
      if (!row) {
        return new Response(JSON.stringify({ error: "Invalid or expired OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: upErr } = await admin.auth.admin.updateUserById(row.user_id, {
        password: newPassword,
      });
      if (upErr) {
        return new Response(JSON.stringify({ error: upErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("password_reset_otps").update({ used: true }).eq("id", row.id);
      return new Response(JSON.stringify({ ok: true, email: phoneToEmail(phone) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
