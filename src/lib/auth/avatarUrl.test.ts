import { describe, expect, test } from "vite-plus/test";

import { sanitizeAvatarUrl } from "../../../shared/avatarUrl";

describe("sanitizeAvatarUrl", () => {
  test("allows https googleusercontent hosts", () => {
    expect(sanitizeAvatarUrl("https://lh3.googleusercontent.com/a/ABCDEF=s96-c")).toBe(
      "https://lh3.googleusercontent.com/a/ABCDEF=s96-c",
    );
    expect(sanitizeAvatarUrl("https://googleusercontent.com/foo")).toBe(
      "https://googleusercontent.com/foo",
    );
  });

  test("allows Instant storage and LAN self-host URLs", () => {
    expect(sanitizeAvatarUrl("https://api.instantdb.com/storage/kg2abc")).toBe(
      "https://api.instantdb.com/storage/kg2abc",
    );
    expect(sanitizeAvatarUrl("http://127.0.0.1:8888/files/kg2abc")).toBe(
      "http://127.0.0.1:8888/files/kg2abc",
    );
    expect(sanitizeAvatarUrl("http://192.168.1.10:8888/files/kg2abc")).toBe(
      "http://192.168.1.10:8888/files/kg2abc",
    );
  });

  test("rejects non-https Google, other hosts, and garbage", () => {
    expect(sanitizeAvatarUrl("http://lh3.googleusercontent.com/a")).toBeNull();
    expect(sanitizeAvatarUrl("https://evil.example/track.png")).toBeNull();
    expect(sanitizeAvatarUrl("https://evil.example/api/files/kg2abc")).toBeNull();
    expect(sanitizeAvatarUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeAvatarUrl("")).toBeNull();
    expect(sanitizeAvatarUrl(null)).toBeNull();
    expect(sanitizeAvatarUrl(undefined)).toBeNull();
    expect(sanitizeAvatarUrl("not a url")).toBeNull();
  });
});
