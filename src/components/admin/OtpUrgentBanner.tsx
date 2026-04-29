import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageCircle, Smartphone } from "lucide-react";

interface OtpRow {
  id: string;
  phone: string;
  otp: string;
  expires_at: string;
  user_id: string | null;
  created_at: string;
  used: boolean;
  profile_name?: string;
}

/**
 * Urgent banner shown on Admin Home when there are unexpired, unused
 * password-reset OTPs. Provides one-tap SMS / WhatsApp delivery to the user.
 */
export const OtpUrgentBanner = () => {
  const [rows, setRows] = useState<OtpRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("password_reset_otps")
      .select("id,phone,otp,expires_at,user_id,created_at,used")
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    const list = (data ?? []) as OtpRow[];
    // enrich with profile name
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean) as string[]));
    if (ids.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", ids);
      const nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.name]));
      list.forEach((r) => { if (r.user_id) r.profile_name = nameMap[r.user_id]; });
    }
    setRows(list);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-otp-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "password_reset_otps" }, load)
      .subscribe();
    const interval = setInterval(load, 30_000); // re-fetch to drop expired
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  if (rows.length === 0) return null;

  const sendSms = (r: OtpRow) => {
    const body = encodeURIComponent(`Your SheharLink password reset code is ${r.otp}. It expires in 10 minutes. Do not share this code.`);
    // sms: link with body
    window.location.href = `sms:+92${r.phone.replace(/^0/, "")}?body=${body}`;
  };
  const sendWhatsApp = (r: OtpRow) => {
    const body = encodeURIComponent(`Your SheharLink password reset code is ${r.otp}. It expires in 10 minutes. Do not share this code.`);
    window.open(`https://wa.me/92${r.phone.replace(/^0/, "")}?text=${body}`, "_blank");
  };

  return (
    <Card className="border-destructive/50 bg-destructive/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm font-bold text-destructive">Urgent action: {rows.length} password reset OTP{rows.length !== 1 ? "s" : ""} pending</p>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const minsLeft = Math.max(0, Math.round((new Date(r.expires_at).getTime() - Date.now()) / 60000));
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card p-2.5">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{r.profile_name || "User"} · {r.phone}</p>
                  <p className="text-[11px] text-muted-foreground">OTP: <span className="font-mono font-bold tracking-wider text-foreground">{r.otp}</span> · expires in {minsLeft}m</p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => sendSms(r)}>
                  <Smartphone className="mr-1 h-3.5 w-3.5" /> SMS
                </Button>
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => sendWhatsApp(r)}>
                  <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
