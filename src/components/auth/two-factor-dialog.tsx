"use client";

import {
  Check,
  Copy,
  Download,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

interface TwoFactorDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface SetupData {
  secret: string;
  qr_code: string;
  otpauth_url: string;
}

export function TwoFactorDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TwoFactorDialogProps) {
  const { user, refresh } = useAuth();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? controlledOnOpenChange || (() => {})
    : setInternalOpen;

  // Setup state
  const [loading, setLoading] = React.useState(false);
  const [setupData, setSetupData] = React.useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = React.useState("");
  const [activating, setActivating] = React.useState(false);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);

  // Disable state
  const [disableMode, setDisableMode] = React.useState(false);
  const [disablePassword, setDisablePassword] = React.useState("");
  const [disabling, setDisabling] = React.useState(false);

  const is2FAEnabled = Boolean(user?.two_factor_enabled);

  const startSetup = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Setup Error", {
          description: data.error || "Failed to initialize 2FA setup.",
        });
        return;
      }
      setSetupData(data);
    } catch {
      toast.error("Error", {
        description: "Failed to connect to authentication server.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch setup info when opening dialog if 2FA is not enabled
  React.useEffect(() => {
    if (open && !is2FAEnabled && !setupData && recoveryCodes.length === 0) {
      startSetup();
    }
    if (!open) {
      // Reset transient state when closed
      setVerifyCode("");
      setDisableMode(false);
      setDisablePassword("");
    }
  }, [open, is2FAEnabled, setupData, recoveryCodes.length, startSetup]);

  const onActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || verifyCode.length !== 6) return;

    setActivating(true);
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: verifyCode,
          secret: setupData.secret,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Activation Failed", {
          description: data.error || "Invalid verification code.",
        });
        return;
      }

      setRecoveryCodes(data.recovery_codes || []);
      toast.success("2FA Activated", {
        description: "Two-factor authentication is now active.",
      });
      await refresh();
    } catch {
      toast.error("Error", {
        description: "Failed to activate two-factor authentication.",
      });
    } finally {
      setActivating(false);
    }
  };

  const onDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword.trim()) {
      toast.error("Password Required", {
        description: "Please enter your password to disable 2FA.",
      });
      return;
    }

    setDisabling(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Disable Failed", {
          description: data.error || "Incorrect confirmation password.",
        });
        return;
      }

      toast.success("2FA Disabled", {
        description: "Two-factor authentication has been turned off.",
      });
      setDisableMode(false);
      setDisablePassword("");
      setSetupData(null);
      setRecoveryCodes([]);
      await refresh();
      setOpen(false);
    } catch {
      toast.error("Error", {
        description: "Failed to disable two-factor authentication.",
      });
    } finally {
      setDisabling(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    toast.success("Copied", {
      description: "Recovery codes copied to clipboard.",
    });
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes.length) return;
    const content =
      `Realm HQ - Emergency Backup Recovery Codes\nAccount: ${user?.email || "Admin"}\nDate: ${new Date().toISOString()}\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      "\n\nEach code can be used once if you lose access to your authenticator app.";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realm-hq-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded", {
      description: "Recovery codes saved to file.",
    });
  };

  const copySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    toast.success("Copied", { description: "Secret key copied." });
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Two-Factor Authentication (2FA)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Time-based one-time password (TOTP) security for your account.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STATE 1: RECOVERY CODES REVEAL (JUST ACTIVATED) */}
        {recoveryCodes.length > 0 ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  2FA Activated Successfully!
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Save these 8 recovery codes now. If you lose access to your
                  authenticator device, each code can be used once to access
                  Realm HQ.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-muted/60 p-3 rounded-lg border border-border font-mono text-xs text-center font-medium">
              {recoveryCodes.map((code) => (
                <div
                  key={code}
                  className="bg-background py-1.5 px-2 rounded border border-border/80 tracking-wider selection:bg-primary selection:text-primary-foreground"
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={copyRecoveryCodes}
              >
                {copiedCodes ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy All
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 cursor-pointer"
                onClick={downloadRecoveryCodes}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download .txt
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                className="w-full cursor-pointer"
                onClick={() => {
                  setRecoveryCodes([]);
                  setOpen(false);
                }}
              >
                I Have Saved My Recovery Codes
              </Button>
            </DialogFooter>
          </div>
        ) : is2FAEnabled ? (
          /* STATE 2: 2FA ALREADY ACTIVE */
          <div className="space-y-4 py-2">
            {!disableMode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Account Security Protected
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        TOTP 2FA is active and required for every administrative
                        login.
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[11px]"
                  >
                    Active
                  </Badge>
                </div>

                <div className="rounded-lg border border-border bg-card p-3 space-y-2 text-xs">
                  <p className="text-muted-foreground leading-relaxed">
                    When signing in, you must provide a 6-digit one-time code
                    from your authenticator application (Google Authenticator,
                    1Password, Bitwarden, etc.) or a backup recovery code.
                  </p>
                </div>

                <DialogFooter className="pt-2 sm:justify-between flex-row gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setDisableMode(true)}
                  >
                    Disable 2FA
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              /* DISABLE 2FA CONFIRMATION */
              <form onSubmit={onDisable} className="space-y-4">
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-destructive">
                      Disable Two-Factor Authentication?
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      This lowers your account security. Please verify your
                      administrator password to proceed.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="disable-password"
                    className="text-xs font-medium"
                  >
                    Account Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="disable-password"
                      type="password"
                      placeholder="••••••••••••"
                      className="pl-9 text-sm"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      disabled={disabling}
                      autoFocus
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      setDisableMode(false);
                      setDisablePassword("");
                    }}
                    disabled={disabling}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer"
                    disabled={disabling || !disablePassword.trim()}
                  >
                    {disabling ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Disabling...
                      </>
                    ) : (
                      "Confirm & Disable"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </div>
        ) : (
          /* STATE 3: 2FA NOT YET ENABLED (SETUP FLOW) */
          <div className="space-y-4 py-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Generating secure TOTP key...
                </p>
              </div>
            ) : setupData ? (
              <form onSubmit={onActivate} className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    1. Scan QR code in Authenticator App
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Use Google Authenticator, 1Password, Apple Passwords, or
                    Bitwarden.
                  </p>

                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-border shadow-xs">
                    {/* Render data URL QR code */}
                    {/* biome-ignore lint/performance/noImgElement: Data URI QR Code is dynamically generated */}
                    <img
                      src={setupData.qr_code}
                      alt="TOTP QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground">
                      Can't scan? Use manual key:
                    </Label>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="text-[11px] text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {copiedSecret ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy key
                    </button>
                  </div>
                  <div className="p-2 rounded bg-muted/70 border border-border font-mono text-xs text-center select-all tracking-wider text-foreground">
                    {setupData.secret}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <Label htmlFor="setup-otp" className="text-xs font-medium">
                    2. Enter 6-digit confirmation code:
                  </Label>
                  <div className="flex justify-center py-1">
                    <InputOTP
                      maxLength={6}
                      value={verifyCode}
                      onChange={setVerifyCode}
                      disabled={activating}
                    >
                      <InputOTPGroup className="gap-1.5">
                        <InputOTPSlot
                          index={0}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                        <InputOTPSlot
                          index={1}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                        <InputOTPSlot
                          index={2}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                        <InputOTPSlot
                          index={3}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                        <InputOTPSlot
                          index={4}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                        <InputOTPSlot
                          index={5}
                          className="h-10 w-10 text-sm font-semibold"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="submit"
                    className="w-full cursor-pointer"
                    disabled={activating || verifyCode.length !== 6}
                  >
                    {activating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying &amp; Activating...
                      </>
                    ) : (
                      "Verify & Enable 2FA"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
