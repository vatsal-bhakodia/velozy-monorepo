import { afterEach, expect, it, vi } from "vitest";
import { authStorage } from "../lib/auth-storage";
afterEach(() => vi.restoreAllMocks());
it("keeps auth usable with an in-memory session when browser storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(() =>
    authStorage.setItem("blocked-auth-token", "session"),
  ).not.toThrow();
  expect(authStorage.getItem("blocked-auth-token")).toBe("session");
  expect(() => authStorage.removeItem("blocked-auth-token")).not.toThrow();
  expect(authStorage.getItem("blocked-auth-token")).toBeNull();
});

it("clears account-specific generation state while keeping unrelated session preferences", async () => {
  const { clearOnboardingSession, ONBOARDING_PROJECT_CREATION_KEY } =
    await import("./storage-keys");
  for (const key of [
    ONBOARDING_PROJECT_CREATION_KEY,
    "onboardingDraftHandoff",
    "generationPrompt",
    "siteSections",
    "selectedTheme",
    "projectId",
    "pageId",
    "designSystem",
    "pageData",
  ])
    sessionStorage.setItem(key, "private");
  sessionStorage.setItem("unrelated-preference", "keep");
  clearOnboardingSession();
  expect(sessionStorage.getItem(ONBOARDING_PROJECT_CREATION_KEY)).toBeNull();
  expect(sessionStorage.getItem("generationPrompt")).toBeNull();
  expect(sessionStorage.getItem("onboardingDraftHandoff")).toBeNull();
  expect(sessionStorage.getItem("unrelated-preference")).toBe("keep");
});
