"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiscoveryChat } from "@/components/discovery-chat";
import { DiscoveryVoicePanel } from "@/components/discovery-voice-panel";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ConversationMessage, MatchedCandidate } from "@/types/discovery";

type SessionSummary = {
  id: string;
  session_type: string;
  use_case_summary: string | null;
  status: string;
  created_at: string;
};

export default function DiscoverPage() {
  const router = useRouter();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialHistory, setInitialHistory] = useState<ConversationMessage[]>([]);
  const [initialStatus, setInitialStatus] = useState("active");
  const [initialMatches, setInitialMatches] = useState<MatchedCandidate[] | null>(null);
  const [pastSessions, setPastSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadSession = useCallback(async (id: string) => {
    const response = await fetch(`/api/discovery/sessions/${id}`);
    if (!response.ok) return;
    const data = await response.json();
    const session = data.session;

    setActiveSessionId(session.id);
    setInitialHistory(session.conversation_history ?? []);
    setInitialStatus(session.status);
    setInitialMatches(session.matched_candidates ?? null);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/discovery/sessions");
      if (!response.ok) {
        // User might not be logged in
        router.push("/login?redirect=/discover");
        return;
      }

      const data = await response.json();
      const sessions: SessionSummary[] = data.sessions ?? [];
      setPastSessions(sessions);

      // Check if there's an active session
      const active = sessions.find(
        (s: SessionSummary) => s.status === "active" || s.status === "researching"
      );
      if (active) {
        await loadSession(active.id);
      }
    } catch {
      // If fetching fails, user likely needs to log in
    } finally {
      setLoading(false);
    }
  }, [router, loadSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function createSession() {
    setCreating(true);
    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/discover");
        return;
      }

      const response = await fetch("/api/discovery/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_type: "chat" }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      const session = await response.json();
      setActiveSessionId(session.id);
      setInitialHistory([]);
      setInitialStatus("active");
      setInitialMatches(null);
    } catch {
      // Handle error
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-[400px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Active chat session
  if (activeSessionId) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Discover AI Tools</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveSessionId(null);
              loadSessions();
            }}
          >
            Back to sessions
          </Button>
        </div>
        <DiscoveryChat
          sessionId={activeSessionId}
          initialHistory={initialHistory}
          initialStatus={initialStatus}
          initialMatches={initialMatches}
        />
      </div>
    );
  }

  // No active session — show landing + past sessions
  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold">Find Your Perfect AI Agent</h1>
          <p className="text-muted-foreground text-lg">
            Describe your business problem and we&apos;ll research, evaluate, and recommend the best
            AI tools for your specific use case.
          </p>
          <div className="flex gap-3">
            <Button size="lg" onClick={createSession} disabled={creating}>
              {creating ? "Starting..." : "Start Chat Discovery"}
            </Button>
          </div>
        </div>

        {/* Voice Option */}
        <DiscoveryVoicePanel
          onSessionCreated={(sid) => {
            setActiveSessionId(sid);
            setInitialHistory([]);
            setInitialStatus("active");
            setInitialMatches(null);
          }}
        />

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: "1",
              title: "Describe Your Needs",
              description:
                "Chat with our AI consultant about your business challenges and requirements.",
            },
            {
              step: "2",
              title: "We Research & Match",
              description:
                "We search the web and our database of 25+ YC-backed AI tools to find the best fits.",
            },
            {
              step: "3",
              title: "Custom Evaluation",
              description:
                "We generate test scenarios for your use case and rank each candidate agent.",
            },
          ].map((item) => (
            <Card key={item.step}>
              <CardContent className="pt-6 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Past sessions */}
        {pastSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Past Discovery Sessions</h2>
            {pastSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  if (session.status === "complete") {
                    router.push(`/discover/${session.id}`);
                  } else {
                    loadSession(session.id);
                  }
                }}
              >
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {session.use_case_summary?.slice(0, 80) || "Discovery session"}
                      {(session.use_case_summary?.length ?? 0) > 80 ? "..." : ""}
                    </CardTitle>
                    <Badge
                      variant={
                        session.status === "complete"
                          ? "default"
                          : session.status === "abandoned"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
