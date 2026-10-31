import { describe, expect, it } from "vitest";
import { firstLoginDestination, isFreshAccount, withAuthJoinedFlag } from "@/lib/auth-next";

describe("first login destination", () => {
  it("opens the profile welcome for a brand-new account", () => {
    expect(firstLoginDestination("/profile")).toBe("/profile?welcome=1&joined=1");
  });

  it("keeps a way back when signup started on a recipe", () => {
    expect(firstLoginDestination("/recipes/banana-bread")).toBe(
      "/profile?welcome=1&return=%2Frecipes%2Fbanana-bread&joined=1",
    );
  });

  it("keeps a return path already stored on the profile next url", () => {
    expect(firstLoginDestination("/profile?welcome=1&return=%2Frecipes")).toBe(
      "/profile?welcome=1&return=%2Frecipes&joined=1",
    );
  });

  it("rejects an off-site next path", () => {
    expect(firstLoginDestination("https://evil.example/phish")).toBe("/profile?welcome=1&joined=1");
  });

  it("still flags a returning login without the welcome", () => {
    expect(withAuthJoinedFlag("/recipes/banana-bread")).toBe("/recipes/banana-bread?joined=1");
  });
});

describe("isFreshAccount", () => {
  const now = Date.parse("2026-10-31T12:00:00.000Z");

  it("treats an account created moments ago as new", () => {
    expect(isFreshAccount("2026-10-31T11:50:00.000Z", now)).toBe(true);
  });

  it("leaves an older account on the normal redirect", () => {
    expect(isFreshAccount("2026-10-30T11:50:00.000Z", now)).toBe(false);
  });
});
