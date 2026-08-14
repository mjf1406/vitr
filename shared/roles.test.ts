import { describe, expect, test } from "vite-plus/test";

import { permissionsForRole, isClassRole, pickHighestClassRole } from "./roles";

describe("role catalog", () => {
  test("owner includes class:delete and permissions:manage", () => {
    expect(permissionsForRole("owner")).toContain("permissions:manage");
    expect(permissionsForRole("owner")).toContain("class:delete");
    expect(permissionsForRole("teacher")).not.toContain("permissions:manage");
    expect(permissionsForRole("teacher")).not.toContain("class:delete");
  });

  test("teacher inherits assistant_teacher and class_member", () => {
    expect(permissionsForRole("teacher")).toContain("class:read");
    expect(permissionsForRole("teacher")).toContain("students:read");
    expect(permissionsForRole("teacher")).toContain("files:create");
  });

  test("catalog has no product permissions", () => {
    expect(
      permissionsForRole("owner").every((permission: string) => !permission.startsWith("product:")),
    ).toBe(true);
  });

  test("isClassRole / pickHighestClassRole", () => {
    expect(isClassRole("owner")).toBe(true);
    expect(isClassRole("app_admin")).toBe(false);
    expect(pickHighestClassRole(["student", "teacher", "owner"])).toBe("owner");
    expect(pickHighestClassRole(["nope"])).toBeNull();
  });
});
