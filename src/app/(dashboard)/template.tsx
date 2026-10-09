import type * as React from "react";
import { DirectionalTransition } from "@/components/directional-transition";

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DirectionalTransition>{children}</DirectionalTransition>;
}
