import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DirectionalTransition } from "@/components/directional-transition";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <DirectionalTransition>
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <h2 className="text-7xl font-bold font-mono tracking-tight text-foreground">
          404
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The requested path could not be found in Command Centre.
        </p>
        <Button
          variant="outline"
          size="sm"
          render={
            <Link href="/" transitionTypes={["nav-back"]}>
              <ArrowLeft data-icon="inline-start" />
              Return to Command Centre
            </Link>
          }
          className="mt-6"
        />
      </div>
    </DirectionalTransition>
  );
}
