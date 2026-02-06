import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiscoveryResults } from "@/components/discovery-results";
import type {
  MatchedCandidate,
  CustomScenario,
  ScenarioEvalResult,
  FinalRecommendation,
} from "@/types/discovery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DiscoveryResultsPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/discover");

  const serviceClient = createServiceRoleClient();
  const { data: session, error } = await serviceClient
    .from("discovery_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !session) redirect("/discover");

  const matchedCandidates = (session.matched_candidates ?? []) as unknown as MatchedCandidate[];
  const scenarios = (session.custom_scenarios ?? []) as unknown as CustomScenario[];
  const evaluationResults = (session.evaluation_results ?? []) as unknown as ScenarioEvalResult[];
  const recommendation = session.final_recommendation as unknown as FinalRecommendation | null;

  // If still evaluating, show loading state
  if (session.status === "evaluating") {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-2xl font-bold">Evaluating Candidates...</h1>
          <p className="text-muted-foreground">
            We&apos;re generating custom test scenarios and evaluating each candidate.
            This typically takes 30-60 seconds.
          </p>
          <div className="flex justify-center gap-1">
            <span className="w-3 h-3 bg-primary rounded-full animate-bounce" />
            <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-muted-foreground">
            Refresh this page in a few seconds to check if results are ready.
          </p>
          <Button asChild variant="outline">
            <Link href={`/discover/${id}`}>Refresh</Link>
          </Button>
        </div>
      </div>
    );
  }

  // If not complete, redirect back to discover
  if (session.status !== "complete" || !recommendation) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold">Discovery Session</h1>
          <Badge variant="secondary">{session.status}</Badge>
          <p className="text-muted-foreground">
            This session hasn&apos;t been completed yet.
          </p>
          <Button asChild>
            <Link href="/discover">Back to Discovery</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/discover"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Discovery
          </Link>
          <span className="text-sm text-muted-foreground mx-2">/</span>
          <span className="text-sm">Results</span>
          <h1 className="text-2xl font-bold mt-1">Your Recommendations</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/discover">New Discovery</Link>
        </Button>
      </div>

      <DiscoveryResults
        useCaseSummary={session.use_case_summary ?? "Your discovery session"}
        matchedCandidates={matchedCandidates}
        scenarios={scenarios}
        evaluationResults={evaluationResults}
        recommendation={recommendation}
      />
    </div>
  );
}
