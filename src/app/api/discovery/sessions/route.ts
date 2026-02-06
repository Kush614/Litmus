import { z } from "zod/v4";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { handleApiError, validateWithZod, UnauthorizedError } from "@/lib/utils/errors";
import type { ConversationMessage } from "@/types/discovery";
import type { Json } from "@/lib/supabase/types";

const createSessionSchema = z.object({
  session_type: z.enum(["chat", "voice"]).default("chat"),
  initial_message: z.string().min(1).optional(),
});

// POST /api/discovery/sessions — Create a new discovery session
export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const data = validateWithZod(createSessionSchema, body);

    const conversationHistory: ConversationMessage[] = [];

    if (data.initial_message) {
      conversationHistory.push({
        role: "user",
        content: data.initial_message,
        timestamp: Date.now(),
      });
    }

    const serviceClient = createServiceRoleClient();
    const { data: session, error } = await serviceClient
      .from("discovery_sessions")
      .insert({
        user_id: user.id,
        session_type: data.session_type,
        conversation_history: conversationHistory as unknown as Json,
        status: "active",
      })
      .select("id, status, created_at")
      .single();

    if (error) throw error;

    return Response.json(session, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/discovery/sessions — List user's sessions
export async function GET(): Promise<Response> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const serviceClient = createServiceRoleClient();
    const { data: sessions, error } = await serviceClient
      .from("discovery_sessions")
      .select("id, session_type, use_case_summary, status, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return Response.json({ sessions: sessions ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}
