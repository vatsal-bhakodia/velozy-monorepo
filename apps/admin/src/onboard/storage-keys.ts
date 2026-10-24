export const PENDING_LOGO_STORAGE_KEY = "onboardingPendingLogo";
export const ONBOARDING_AUTH_PENDING_KEY = "onboardingAuthPending";
export const ONBOARDING_PROJECT_CREATION_KEY = "onboardingProjectCreationKey";

// These values are scoped to the signed-in account, even outside onboarding.
export function clearOnboardingSession() {
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
  ]) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  }
}
