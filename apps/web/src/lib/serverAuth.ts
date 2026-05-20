import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function getBearerToken(req: NextRequest): string {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const token = header.slice(7).trim();
  if (!token) throw new UnauthorizedError("Empty bearer token");
  return token;
}

export async function getAuthenticatedClient(req: NextRequest) {
  const token = getBearerToken(req);
  const authClient = createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError("Invalid session");
  }

  const dbClient = createServerSupabaseClient(token);
  return { dbClient, user, token };
}
