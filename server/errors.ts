import { AppError } from "../shared/polarErrors.ts";

export { AppError };

export function jsonError(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { code: error.code, message: error.message, correlationId: error.correlationId },
      { status: error.status },
    );
  }
  if (error instanceof Error) {
    const coded = error as Error & { code?: string; status?: number };
    if (coded.code === "RATE_LIMITED") {
      return Response.json({ code: "RATE_LIMITED", message: error.message }, { status: 429 });
    }
    return Response.json(
      { code: "ERROR", message: error.message },
      { status: coded.status ?? 400 },
    );
  }
  return Response.json({ code: "ERROR", message: "Unexpected error" }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
