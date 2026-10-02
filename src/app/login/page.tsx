"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Command,
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DirectionalTransition } from "@/components/directional-transition";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

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
            <span>Dual-engine S3 storage &amp; gRPC protected endpoint</span>
          </div>
        </div>
      </div>
    </DirectionalTransition>
  );
}
