"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Command,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { DirectionalTransition } from "@/components/directional-transition";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth-context";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verify2FA } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Sign In | Realm HQ";
    }
  }, []);

  // 2FA Challenge state
  const [twoFactorToken, setTwoFactorToken] = React.useState<string | null>(
    null,
  );
  const [otpCode, setOtpCode] = React.useState("");
  const [useRecoveryCode, setUseRecoveryCode] = React.useState(false);
  const [recoveryCode, setRecoveryCode] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const res = await login(values);
      if (!res.success) {
        toast.error("Authentication Failed", {
          description:
            res.error || "Please verify your credentials and permissions.",
        });
        return;
      }

      if (res.twoFactorRequired && res.tempToken) {
        setTwoFactorToken(res.tempToken);
        toast.info("Two-Factor Authentication Required", {
          description:
            "Please enter the verification code from your authenticator app.",
        });
        return;
      }

      toast.success("Command Centre Authorized", {
        description: "Welcome back, Administrator.",
      });

      const destination = searchParams.get("from") || "/";
      router.push(destination);
    } catch {
      toast.error("Error", {
        description:
          "Unexpected error during login. Check server connectivity.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorToken) return;

    const codeToVerify = useRecoveryCode ? recoveryCode.trim() : otpCode.trim();

    if (!codeToVerify) {
      toast.error("Code Required", {
        description: useRecoveryCode
          ? "Please enter your emergency recovery code."
          : "Please enter your 6-digit authentication code.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await verify2FA({
        tempToken: twoFactorToken,
        code: codeToVerify,
      });

      if (!res.success) {
        toast.error("Verification Failed", {
          description:
            res.error || "Invalid verification code. Please try again.",
        });
        return;
      }

      toast.success("Command Centre Authorized", {
        description: "Two-factor verification confirmed. Welcome back!",
      });

      const destination = searchParams.get("from") || "/";
      router.push(destination);
    } catch {
      toast.error("Error", {
        description: "Unexpected error during 2FA verification.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (twoFactorToken) {
    return (
      <Card className="border-border/80 shadow-2xl backdrop-blur-xl bg-card/90">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Two-Factor Authentication
              </CardTitle>
              <CardDescription className="text-xs">
                {useRecoveryCode
                  ? "Enter one of your 8 emergency backup recovery codes."
                  : "Enter the 6-digit code from your authenticator app."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onVerify2FA} className="space-y-5">
            {!useRecoveryCode ? (
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <Label
                  htmlFor="otp-input"
                  className="text-xs text-muted-foreground"
                >
                  Security Passcode
                </Label>
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  disabled={submitting}
                  autoFocus
                >
                  <InputOTPGroup className="gap-1.5">
                    <InputOTPSlot
                      index={0}
                      className="h-11 w-11 text-base font-semibold"
                    />
                    <InputOTPSlot
                      index={1}
                      className="h-11 w-11 text-base font-semibold"
                    />
                    <InputOTPSlot
                      index={2}
                      className="h-11 w-11 text-base font-semibold"
                    />
                    <InputOTPSlot
                      index={3}
                      className="h-11 w-11 text-base font-semibold"
                    />
                    <InputOTPSlot
                      index={4}
                      className="h-11 w-11 text-base font-semibold"
                    />
                    <InputOTPSlot
                      index={5}
                      className="h-11 w-11 text-base font-semibold"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            ) : (
              <div className="space-y-2 py-1">
                <Label htmlFor="recovery-code" className="text-xs font-medium">
                  Emergency Recovery Code
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="recovery-code"
                    placeholder="ABCD-EF12"
                    value={recoveryCode}
                    onChange={(e) =>
                      setRecoveryCode(e.target.value.toUpperCase())
                    }
                    className="pl-9 font-mono uppercase tracking-wider text-sm"
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Backup codes can each be used once in emergency scenarios.
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-medium cursor-pointer"
              disabled={
                submitting ||
                (!useRecoveryCode && otpCode.length !== 6) ||
                (useRecoveryCode && !recoveryCode.trim())
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify &amp; Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setUseRecoveryCode(!useRecoveryCode);
                  setOtpCode("");
                  setRecoveryCode("");
                }}
                className="text-xs text-primary hover:underline cursor-pointer text-center"
              >
                {useRecoveryCode
                  ? "Use 6-digit Authenticator code instead"
                  : "Can't access your authenticator? Use a recovery code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTwoFactorToken(null);
                  setOtpCode("");
                  setRecoveryCode("");
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-2xl backdrop-blur-xl bg-card/90">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg">Sign In</CardTitle>
        <CardDescription className="text-xs">
          Enter your administrative credentials to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="identifier" className="text-xs font-medium">
              Identifier (Email or Username)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="identifier"
                placeholder="admin@example.com"
                className="pl-9 text-sm"
                disabled={submitting}
                {...register("identifier")}
              />
            </div>
            {errors.identifier && (
              <p className="text-xs text-destructive font-medium">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                className="pl-9 text-sm"
                disabled={submitting}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive font-medium">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-medium cursor-pointer"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Enter Command Centre
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <DirectionalTransition>
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden selection:bg-primary selection:text-primary-foreground">
        {/* Subtle background ambient mesh */}
        <div className="absolute inset-0 bg-radial-[at_top_right] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="w-full max-w-md z-10">
          <div className="flex flex-col items-center gap-2 mb-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-white/10">
              <Command className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mt-2">
              Realm HQ
            </h1>
            <p className="text-xs text-muted-foreground max-w-xs">
              Authorized Command Centre. Restricted access for site owners and
              authenticated staff.
            </p>
          </div>

          <React.Suspense
            fallback={
              <Card className="border-border/80 shadow-2xl backdrop-blur-xl bg-card/90 p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </Card>
            }
          >
            <LoginForm />
          </React.Suspense>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Encrypted storage &amp; secure administrative access</span>
          </div>
        </div>
      </div>
    </DirectionalTransition>
  );
}
