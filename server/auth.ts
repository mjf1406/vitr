import { AppError } from "./errors.ts";
import { adminDb } from "./db.ts";

export type AuthedUser = {
  id: string;
  email: string | undefined;
};

export async function requireUser(request: Request): Promise<AuthedUser> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    throw new AppError("UNAUTHENTICATED", "Not authenticated", 401);
  }
  const user = await adminDb.auth.verifyToken(token);
  if (!user?.id) {
    throw new AppError("UNAUTHENTICATED", "Not authenticated", 401);
  }
  return { id: user.id, email: user.email ?? undefined };
}
