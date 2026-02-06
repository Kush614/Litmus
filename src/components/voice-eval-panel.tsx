"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatScore } from "@/lib/utils/scoring";
import type { TranscriptEntry } from "@/types/evaluation";

type VoiceEvalPanelProps = {
  agentId: string;
  agentName: string;
};

type CallState = {
  status: "idle" | "initiating" | "ringing" | "connected" | "evaluating" | "complete" | "error";
  callUuid: string | undefined;
  transcript: TranscriptEntry[];
  scores: Record<string, number> | undefined;
  compositeScore: number | undefined;
  error: string | undefined;
  startTime: number | undefined;
};

const STATUS_LABELS: Record<string, string> = {
  idle: "Ready",
  initiating: "Initiating call...",
  ringing: "Ringing...",
  connected: "Connected - speak now",
  evaluating: "Evaluating transcript...",
  complete: "Evaluation complete",
  error: "Error",
};

export function VoiceEvalPanel({ agentId, agentName }: VoiceEvalPanelProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [state, setState] = useState<CallState>({
    status: "idle",
    callUuid: undefined,
    transcript: [],
    scores: undefined,
    compositeScore: undefined,
    error: undefined,
    startTime: undefined,
  });
  const [elapsed, setElapsed] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "connected" || !state.startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startTime!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.status, state.startTime]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [state.transcript]);

  async function startCall() {
    if (!phoneNumber.match(/^\+\d{10,15}$/)) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Enter a valid phone number in E.164 format (e.g., +14155551234)",
      }));
      return;
    }

    setState({
      status: "initiating",
      callUuid: undefined,
      transcript: [],
      scores: undefined,
      compositeScore: undefined,
      error: undefined,
      startTime: undefined,
    });

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.access_token) {
        throw new Error("You must be signed in to start a voice evaluation.");
      }

      const response = await fetch("/api/voice/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ agent_id: agentId, phone_number: phoneNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Failed to initiate call");
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        status: "connected",
        callUuid: data.call_uuid,
        startTime: Date.now(),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Evaluation — {agentName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <Input
            placeholder="+14155551234"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={state.status !== "idle" && state.status !== "error"}
            className="max-w-[200px]"
          />
          <Button
            onClick={startCall}
            disabled={
              state.status === "initiating" ||
              state.status === "connected" ||
              state.status === "evaluating"
            }
          >
            {state.status === "idle" || state.status === "error" ? "Start Call" : "Calling..."}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={
              state.status === "complete"
                ? "default"
                : state.status === "error"
                  ? "destructive"
                  : "secondary"
            }
          >
            {STATUS_LABELS[state.status]}
          </Badge>
          {state.status === "connected" && (
            <span className="text-sm font-mono tabular-nums">{formatTime(elapsed)}</span>
          )}
        </div>

        {state.transcript.length > 0 && (
          <div
            ref={transcriptRef}
            className="h-[200px] overflow-y-auto border rounded-lg p-3 space-y-2"
          >
            {state.transcript.map((entry, i) => (
              <div
                key={i}
                className={`text-sm ${entry.role === "user" ? "text-blue-600" : "text-green-600"}`}
              >
                <span className="font-medium">{entry.role === "user" ? "User" : "Agent"}:</span>{" "}
                {entry.text}
              </div>
            ))}
          </div>
        )}

        {state.status === "complete" && state.scores && (
          <div className="space-y-3">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Voice Evaluation Score</p>
              <p className="text-4xl font-bold">{formatScore(state.compositeScore)}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(state.scores).map(([key, value]) => (
                <div key={key} className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground capitalize">{key}</p>
                  <p className="text-lg font-semibold">{formatScore(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.status === "error" && state.error && (
          <p className="text-sm text-red-500">{state.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
