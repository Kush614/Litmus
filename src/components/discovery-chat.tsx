"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { ConversationMessage, MatchedCandidate } from "@/types/discovery";

type DiscoveryChatProps = {
  sessionId: string;
  initialHistory: ConversationMessage[];
  initialStatus: string;
  initialMatches: MatchedCandidate[] | null;
};

type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "status"; content: string }
  | {
      type: "matches";
      content: string;
      candidates: {
        name: string;
        description: string | null;
        relevance_score: number;
        feature_match: string[];
      }[];
    }
  | { type: "done" }
  | { type: "error"; content: string };

export function DiscoveryChat({
  sessionId,
  initialHistory,
  initialStatus,
  initialMatches,
}: DiscoveryChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ConversationMessage[]>(initialHistory);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [matches, setMatches] = useState<MatchedCandidate[] | null>(initialMatches);
  const [statusMessage, setStatusMessage] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Add welcome message if history is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hi! I'm Litmus, your AI agent consultant. I'll help you find the perfect AI tools for your business needs.\n\nTell me about the problem you're trying to solve. What does your business do, and what processes are you looking to automate or improve with AI?",
          timestamp: Date.now(),
        },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/discovery/sessions/${sessionId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);

            if (event.type === "chunk") {
              fullText += event.content;
              // Strip the [READY_TO_SEARCH] marker from displayed text
              setStreamingText(fullText.replace("[READY_TO_SEARCH]", "").trim());
            } else if (event.type === "status") {
              setStatusMessage(event.content);
            } else if (event.type === "matches") {
              setStatusMessage("");
              const matchedCandidates: MatchedCandidate[] = event.candidates.map((c) => ({
                candidate_id: "",
                name: c.name,
                vendor: "",
                website_url: "",
                description: c.description,
                relevance_score: c.relevance_score,
                feature_match: c.feature_match,
                missing_features: [],
                capabilities: null,
              }));
              setMatches(matchedCandidates);
              setStatus("researching");
            } else if (event.type === "error") {
              setStreamingText(event.content);
            }
          } catch {
            // Skip unparseable SSE lines
          }
        }
      }

      // Finalize assistant message
      const cleanText = fullText.replace("[READY_TO_SEARCH]", "").trim();
      if (cleanText) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: cleanText, timestamp: Date.now() },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        },
      ]);
      console.error("[DiscoveryChat] Error:", err);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
    }
  }

  async function triggerEvaluation() {
    setIsEvaluating(true);
    try {
      const response = await fetch(`/api/discovery/sessions/${sessionId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to start evaluation");

      // Poll for completion
      pollIntervalRef.current = setInterval(async () => {
        const res = await fetch(`/api/discovery/sessions/${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.session.status === "complete") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
          router.push(`/discover/${sessionId}`);
        } else if (data.session.status === "abandoned") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
          setIsEvaluating(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Evaluation encountered an error. Please try again.",
              timestamp: Date.now(),
            },
          ]);
        }
      }, 3000);

      // Timeout after 2 minutes
      pollTimeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setIsEvaluating(false);
        router.push(`/discover/${sessionId}`);
      }, 120000);
    } catch {
      setIsEvaluating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">
      {/* Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-muted whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/50 animate-pulse" />
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-3 text-sm">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          {/* Status message */}
          {statusMessage && (
            <div className="flex justify-center">
              <Badge variant="secondary" className="animate-pulse">
                {statusMessage}
              </Badge>
            </div>
          )}

          {/* Evaluation in progress */}
          {isEvaluating && (
            <div className="flex justify-center">
              <Card className="w-full max-w-md">
                <CardContent className="py-6 text-center space-y-3">
                  <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                  <p className="text-sm font-medium">Running personalized evaluation...</p>
                  <p className="text-xs text-muted-foreground">
                    Generating custom test scenarios and evaluating each candidate. This may take a
                    minute.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t pt-4 flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              status === "researching"
                ? "Ask follow-up questions or click 'Evaluate' to get recommendations..."
                : "Describe your business problem..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || isEvaluating}
            rows={2}
            className="resize-none"
          />
          <div className="flex flex-col gap-2">
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming || isEvaluating}
              size="sm"
            >
              Send
            </Button>
            {matches && matches.length > 0 && !isEvaluating && (
              <Button onClick={triggerEvaluation} variant="secondary" size="sm">
                Evaluate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel — Matched Candidates */}
      {matches && matches.length > 0 && (
        <div className="lg:w-80 shrink-0 space-y-3 overflow-y-auto">
          <h3 className="font-semibold text-sm">Matched AI Tools ({matches.length})</h3>
          {matches.map((candidate, i) => (
            <Card key={i} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">{candidate.name}</p>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {Math.round(candidate.relevance_score * 100)}%
                </Badge>
              </div>
              {candidate.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {candidate.description}
                </p>
              )}
              {candidate.feature_match.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {candidate.feature_match.slice(0, 3).map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                  {candidate.feature_match.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{candidate.feature_match.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </Card>
          ))}
          {!isEvaluating && (
            <Button onClick={triggerEvaluation} className="w-full" size="sm">
              Evaluate Top Matches
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
