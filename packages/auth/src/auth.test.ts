import { describe, expect, it } from "vitest";
import { assertRole, ForbiddenError, hasRole, homeSurface, isOps, isOpsAdmin } from "./index";

describe("role guards", () => {
  it("distinguishes ops roles from merchant/rider", () => {
    expect(isOps({ role: "ops_agent" })).toBe(true);
    expect(isOps({ role: "ops_admin" })).toBe(true);
    expect(isOps({ role: "merchant" })).toBe(false);
    expect(isOpsAdmin({ role: "ops_agent" })).toBe(false);
    expect(isOpsAdmin({ role: "ops_admin" })).toBe(true);
    expect(isOps(null)).toBe(false);
  });

  it("assertRole throws ForbiddenError for missing roles", () => {
    expect(() => assertRole({ role: "rider" }, "ops_admin")).toThrow(ForbiddenError);
    expect(() => assertRole({ role: "ops_admin" }, "ops_admin")).not.toThrow();
    expect(hasRole({ role: "rider" }, "rider", "merchant")).toBe(true);
  });

  it("routes each role to its home surface", () => {
    expect(homeSurface("merchant")).toBe("merchant");
    expect(homeSurface("rider")).toBe("rider");
    expect(homeSurface("ops_agent")).toBe("ops");
    expect(homeSurface("ops_admin")).toBe("ops");
  });
});
