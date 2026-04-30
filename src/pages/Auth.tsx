import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { MapPin, Eye, EyeOff } from "lucide-react";

const phoneToEmail = (phone: string) => `${phone}@sheharlink.local`;
const validPhone = (p: string) => /^03\d{9}$/.test(p);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const redirectTo = (location.state as any)?.from || "/";

  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");

  // shared
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // signup-only
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [waSame, setWaSame] = useState(true);
  const [address, setAddress] = useState("");

  // forgot-only
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone(phone)) return toast.error("Phone must be 03xxxxxxxxx (11 digits)");
    setSubmitting(true);
    // Try phone-based synthetic email first; fallback to literal email for legacy admin
    let { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(phone), password });
    if (error) {
      // legacy fallback: maybe user typed an email-like phone or admin
      const { error: e2 } = await supabase.auth.signInWithPassword({ email: phone, password });
      error = e2 ?? error;
    }
    setSubmitting(false);
    if (error) toast.error("Invalid phone or password");
    else toast.success("Welcome back!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone(phone)) return toast.error("Phone must be 03xxxxxxxxx (11 digits)");
    const wa = waSame ? phone : whatsapp;
    if (!waSame && !validPhone(wa)) return toast.error("WhatsApp must be 03xxxxxxxxx");
    if (!name.trim()) return toast.error("Name required");
    if (!address.trim()) return toast.error("Default address required");
    if (!password) return toast.error("Password required");

    setSubmitting(true);
    // Check phone availability against verified accounts (with fallback)
    try {
      const { data: check, error: checkErr } = await supabase.functions.invoke("check-phone-available", {
        body: { phone },
      });
      if (checkErr) {
        console.warn("Phone validation function failed:", checkErr);
        // Continue with signup anyway - function might be deploying
      } else if (check && (check as any).available === false) {
        setSubmitting(false);
        return toast.error((check as any).reason || "This phone number is already registered.");
      }
    } catch (err) {
      console.warn("Could not validate phone:", err);
      // Continue with signup - will be validated at database level
    }

    const { error } = await supabase.auth.signUp({
      email: phoneToEmail(phone),
      password,
      options: {
        data: { name, phone, whatsapp: wa, address },
      },
    });
    setSubmitting(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error("This phone number is already registered.");
      } else toast.error(error.message);
    } else {
      toast.success("Account created! Logging you in...");
      // Auto-redirect after signup since email confirmation is disabled
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validPhone(phone)) return toast.error("Phone must be 03xxxxxxxxx");
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { action: "request", phone },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed");
    } else {
      toast.success("OTP created. Contact admin to receive your code.");
      setForgotStep(2);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPwd) return toast.error("Enter OTP and new password");
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("reset-password", {
      body: { action: "verify", phone, otp, newPassword: newPwd },
    });
    if (error || (data as any)?.error) {
      setSubmitting(false);
      return toast.error((data as any)?.error || error?.message || "Failed");
    }
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone), password: newPwd,
    });
    setSubmitting(false);
    if (signInErr) toast.error("Password updated. Please sign in.");
    else toast.success("Password reset & signed in");
    setMode("signin");
    setForgotStep(1);
    setOtp(""); setNewPwd("");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-2">
        <img src="/logo.png" alt="SheharLink Logo" className="h-16 w-16 object-contain rounded-2xl" />
        <h1 className="text-2xl font-bold">SheharLink</h1>
        <p className="text-sm text-muted-foreground">Muzaffarabad delivery</p>
      </div>

      <Card className="w-full max-w-sm p-6">
        {mode !== "forgot" ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <PhoneField value={phone} onChange={setPhone} />
                <PasswordField value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd(!showPwd)} />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Signing in..." : "Sign In"}
                </Button>
                <button type="button" onClick={() => setMode("forgot")} className="block w-full text-center text-xs text-primary underline">
                  Forgot password?
                </button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <PhoneField value={phone} onChange={setPhone} />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="wasame" checked={waSame} onCheckedChange={(v) => setWaSame(!!v)} />
                    <Label htmlFor="wasame" className="cursor-pointer text-xs">WhatsApp same as phone</Label>
                  </div>
                  {!waSame && (
                    <Input
                      placeholder="03xxxxxxxxx"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    />
                  )}
                </div>
                <PasswordField value={password} onChange={setPassword} show={showPwd} onToggle={() => setShowPwd(!showPwd)} />
                <div className="space-y-2">
                  <Label htmlFor="su-addr">Default address</Label>
                  <Textarea id="su-addr" required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="pt-2">
            <h2 className="mb-3 text-lg font-bold">Forgot Password</h2>
            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-4">
                <PhoneField value={phone} onChange={setPhone} />
                <p className="text-xs text-muted-foreground">
                  An OTP will be created. Contact our admin to receive it.
                </p>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Requesting..." : "Request OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>OTP code</Label>
                  <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" />
                </div>
                <PasswordField value={newPwd} onChange={setNewPwd} show={showPwd} onToggle={() => setShowPwd(!showPwd)} label="New password" />
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            )}
            <button type="button" onClick={() => { setMode("signin"); setForgotStep(1); }} className="mt-3 block w-full text-center text-xs text-primary underline">
              Back to sign in
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">Continue browsing without account</Link>
        </p>
      </Card>
    </div>
  );
};

const PhoneField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <Label htmlFor="phone">Phone number</Label>
    <Input
      id="phone"
      inputMode="numeric"
      placeholder="03xxxxxxxxx"
      required
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
    />
  </div>
);

const PasswordField = ({ value, onChange, show, onToggle, label = "Password" }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; label?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor="pwd">{label}</Label>
    <div className="relative">
      <Input id="pwd" type={show ? "text" : "password"} required value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
      <button type="button" onClick={onToggle} aria-label={show ? "Hide" : "Show"} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

export default Auth;
