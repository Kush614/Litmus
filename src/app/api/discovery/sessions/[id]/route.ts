import { createServerClient, createServiceRoleClient } from "@/lib/supabase/server";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/utils/errors";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/discovery/sessions/[id] — Get session details
export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const serviceClient = createServiceRoleClient();
    const { data: session, error } = await serviceClient
      .from("discovery_sessions")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !session) throw new NotFoundError("Discovery session");

    return Response.json({ session });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/discovery/sessions/[id] — Abandon a session
export async function DELETE(_request: Request, { params }: RouteParams): Promise<Response> {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError();

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient
      .from("discovery_sessions")
      .update({ status: "abandoned", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
