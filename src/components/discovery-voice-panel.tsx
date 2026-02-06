"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createBrowserClient } from "@/lib/supabase/client";

type VoiceDiscoveryProps = {
  onSessionCreated: (sessionId: string) => void;
};

export function DiscoveryVoicePanel({ onSessionCreated }: VoiceDiscoveryProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "initiating" | "active" | "error">("idle");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function startVoiceDiscovery() {
    if (!phoneNumber.match(/^\+\d{10,15}$/)) {
      setError("Enter a valid phone number in E.164 format (e.g., +14155551234)");
      setStatus("error");
      return;
    }

    setStatus("initiating");
    setError("");

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be signed in.");
      }

      // Create a discovery session first
      const sessionRes = await fetch("/api/discovery/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_type: "voice" }),
      });

      if (!sessionRes.ok) throw new Error("Failed to create session");
      const sessionData = await sessionRes.json();
      setSessionId(sessionData.id);

      // Initiate Plivo call
      const callRes = await fetch("/api/voice/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          agent_id: "discovery",
          phone_number: phoneNumber,
          discovery_session_id: sessionData.id,
        }),
      });

      if (!callRes.ok) {
        const errData = await callRes.json();
        throw new Error(errData.error ?? "Failed to initiate call");
      }

      setStatus("active");
      onSessionCreated(sessionData.id);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Discovery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Prefer to talk? We&apos;ll call you and have a conversation to understand your needs, then
          automatically search and evaluate AI tools for you.
        </p>

        <div className="flex gap-3">
          <Input
            placeholder="+14155551234"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={status === "initiating" || status === "active"}
            className="max-w-[200px]"
          />
          <Button
            onClick={startVoiceDiscovery}
            disabled={status === "initiating" || status === "active"}
          >
            {status === "idle" || status === "error" ? "Call Me" : "Calling..."}
          </Button>
        </div>

        <Badge
          variant={
            status === "active" ? "default" : status === "error" ? "destructive" : "secondary"
          }
        >
          {status === "idle" && "Ready"}
          {status === "initiating" && "Initiating call..."}
          {status === "active" && "Call in progress — describe your needs"}
          {status === "error" && "Error"}
        </Badge>

        {status === "active" && sessionId && (
          <div className="p-4 bg-muted rounded-lg text-center space-y-2">
            <p className="text-sm">
              Your phone should ring shortly. Describe your business problem and the AI tools
              you&apos;re looking for.
            </p>
            <p className="text-xs text-muted-foreground">
              When the call ends, we&apos;ll automatically evaluate and recommend tools.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/discover/${sessionId}`)}
            >
              View Results (after call ends)
            </Button>
          </div>
        )}

        {status === "error" && error && <p className="text-sm text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
}
