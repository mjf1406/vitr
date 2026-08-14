import { describe, expect, test } from "vite-plus/test";

import { AdminApiError } from "@/lib/api/admin";

import { codeFromError, messageFromError } from "./convexError";

describe("messageFromError", () => {
  test("reads AdminApiError message", () => {
    expect(messageFromError(new AdminApiError(400, { message: "Nope" }), "fallback")).toBe("Nope");
  });

  test("reads Error message", () => {
    expect(messageFromError(new Error("Already in"), "fallback")).toBe("Already in");
  });

  test("falls back when message empty", () => {
    expect(messageFromError(new Error("   "), "fallback")).toBe("fallback");
  });

  test("uses rate-limited copy", () => {
    expect(
      messageFromError(
        new AdminApiError(429, { code: "RATE_LIMITED", message: "slow down" }),
        "fallback",
        "Too many",
      ),
    ).toBe("Too many");
  });
});

describe("codeFromError", () => {
  test("reads code from AdminApiError", () => {
    expect(codeFromError(new AdminApiError(409, { code: "ALREADY_MEMBER", message: "x" }))).toBe(
      "ALREADY_MEMBER",
    );
  });

  test("returns undefined without code", () => {
    expect(codeFromError(new Error("nope"))).toBeUndefined();
  });
});
