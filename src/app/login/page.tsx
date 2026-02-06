"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState(searchParams.get("error") ?? "");

  async function signIn(provider: "google" | "github") {
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in to Litmus</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sign in to submit agents, run benchmarks, and write reviews.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <Button className="w-full" variant="outline" onClick={() => signIn("google")}>
          Continue with Google
        </Button>
        <Button className="w-full" variant="outline" onClick={() => signIn("github")}>
          Continue with GitHub
        </Button>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="container flex items-center justify-center min-h-[60vh]">
      <Suspense fallback={<Skeleton className="w-full max-w-md h-[300px]" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
