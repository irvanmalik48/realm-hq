"use client";

import { ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth/auth-context";

export function ProfileSettingsCard({
  searchQuery = "",
}: {
  searchQuery?: string;
}) {
  const { user, admin } = useAuth();

  const matchQuery = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const matches =
    matchQuery("Administrator Profile") ||
    matchQuery("Account") ||
    matchQuery("User") ||
    matchQuery("Two-Factor Authentication") ||
    matchQuery("Role");

  if (!matches) return null;

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || "AD";

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>Administrator Profile</CardTitle>
        </div>
        <CardDescription>
          Account identity and role credentials currently authenticated in this
          session.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border border-border">
              {user?.avatar_url && (
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {user?.full_name || "Administrator"}
                </span>
                {admin?.is_superadmin ? (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary bg-primary/5 text-xs"
                  >
                    Superadmin
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Operator
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                @{user?.username || "admin"} · {user?.email || "internal"}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            render={
              <Link href="/admins" transitionTypes={["nav-forward"]}>
                Manage Admins
              </Link>
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={`h-4 w-4 ${
                  user?.two_factor_enabled
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-sm font-medium text-foreground">
                Two-Factor Authentication (2FA)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.two_factor_enabled
                ? "TOTP authenticator security is active on your administrator account."
                : "2FA is recommended to protect administrative operations."}
            </p>
          </div>
          <Badge
            variant={user?.two_factor_enabled ? "default" : "outline"}
            className={
              user?.two_factor_enabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "text-amber-600 dark:text-amber-400 border-amber-500/20"
            }
          >
            {user?.two_factor_enabled ? "Active" : "Unset"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
