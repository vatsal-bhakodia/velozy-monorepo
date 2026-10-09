import type { SetStateAction } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import themes from "@/src/onboard/constants/themes";
import { siteStyles } from "@/src/onboard/constants/site-style";
import type {
  ChatMessage,
  GeneratedSiteChrome,
  GeneratedSiteNavigation,
  SiteProfile,
  SiteSection,
  StructureStage,
} from "./types";

const initialSiteProfile: SiteProfile = {
  name: "",
  industry: "",
  archetype: "",
  storeType: "",
  subType: "",
  modules: [],
  capabilities: [],
  plannedPages: [],
  logo: "",
  businessDescription: "",
};

type LogoChoice = "upload" | "generate" | null;
type Theme = any;
type Setter<T> = (value: SetStateAction<T>) => void;
export const ONBOARDING_DRAFT_STORAGE_KEY = "velozy-onboarding-draft";

const resolve = <T>(value: SetStateAction<T>, current: T): T =>
  typeof value === "function" ? (value as (previous: T) => T)(current) : value;

export type OnboardingStore = {
  currentStep: number;
  chatMessages: ChatMessage[];
  currentInput: string;
  currentQuestion: number;
  isProcessing: boolean;
  siteProfile: SiteProfile;
  siteSections: SiteSection[];
  siteChrome: GeneratedSiteChrome | null;
  siteNavigation: GeneratedSiteNavigation | null;
  selectedStyle: string;
  isStyleConfirmed: boolean;
  selectedTheme: string;
  isThemeConfirmed: boolean;
  customThemes: Theme[];
  activeTheme: Theme;
  dragActive: boolean;
  logoFile: File | null;
  logoPreview: string;
  logoChoice: LogoChoice;
  isCreatingProject: boolean;
  isChatOpen: boolean;
  unreadCount: number;
  isPremiumModalOpen: boolean;
  isAuthModalOpen: boolean;
  sectionsGenerated: boolean;
  structureStage: StructureStage;
  generatedSectionsKey: string;
  setCurrentStep: Setter<number>;
  setChatMessages: Setter<ChatMessage[]>;
  setCurrentInput: Setter<string>;
  setCurrentQuestion: Setter<number>;
  setIsProcessing: Setter<boolean>;
  setSiteProfile: Setter<SiteProfile>;
  setSiteSections: Setter<SiteSection[]>;
  setSiteChrome: Setter<GeneratedSiteChrome | null>;
  setSiteNavigation: Setter<GeneratedSiteNavigation | null>;
  setSelectedStyle: Setter<string>;
  setIsStyleConfirmed: Setter<boolean>;
  setSelectedTheme: Setter<string>;
  setIsThemeConfirmed: Setter<boolean>;
  setCustomThemes: Setter<Theme[]>;
  setActiveTheme: Setter<Theme>;
  setDragActive: Setter<boolean>;
  setLogoFile: Setter<File | null>;
  setLogoPreview: Setter<string>;
  setLogoChoice: Setter<LogoChoice>;
  setIsCreatingProject: Setter<boolean>;
  setIsChatOpen: Setter<boolean>;
  setUnreadCount: Setter<number>;
  setIsPremiumModalOpen: Setter<boolean>;
  setIsAuthModalOpen: Setter<boolean>;
  setSectionsGenerated: Setter<boolean>;
  setStructureStage: Setter<StructureStage>;
  setGeneratedSectionsKey: Setter<string>;
  resetWorkflow: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      currentStep: 0,
      chatMessages: [],
      currentInput: "",
      currentQuestion: 0,
      isProcessing: false,
      siteProfile: initialSiteProfile,
      siteSections: [],
      siteChrome: null,
      siteNavigation: null,
      selectedStyle: siteStyles[0].id,
      isStyleConfirmed: false,
      selectedTheme: themes[0].id,
      isThemeConfirmed: false,
      customThemes: [],
      activeTheme: themes[0],
      dragActive: false,
      logoFile: null,
      logoPreview: "",
      logoChoice: null,
      isCreatingProject: false,
      isChatOpen: false,
      unreadCount: 0,
      isPremiumModalOpen: false,
      isAuthModalOpen: false,
      sectionsGenerated: false,
      structureStage: "pages",
      generatedSectionsKey: "",
      setCurrentStep: (value) =>
        set((state) => ({ currentStep: resolve(value, state.currentStep) })),
      setChatMessages: (value) =>
        set((state) => ({ chatMessages: resolve(value, state.chatMessages) })),
      setCurrentInput: (value) =>
        set((state) => ({ currentInput: resolve(value, state.currentInput) })),
      setCurrentQuestion: (value) =>
        set((state) => ({
          currentQuestion: resolve(value, state.currentQuestion),
        })),
      setIsProcessing: (value) =>
        set((state) => ({ isProcessing: resolve(value, state.isProcessing) })),
      setSiteProfile: (value) =>
        set((state) => ({ siteProfile: resolve(value, state.siteProfile) })),
      setSiteSections: (value) =>
        set((state) => ({ siteSections: resolve(value, state.siteSections) })),
      setSiteChrome: (value) =>
        set((state) => ({ siteChrome: resolve(value, state.siteChrome) })),
      setSiteNavigation: (value) =>
        set((state) => ({ siteNavigation: resolve(value, state.siteNavigation) })),
      setSelectedStyle: (value) =>
        set((state) => ({
          selectedStyle: resolve(value, state.selectedStyle),
        })),
      setIsStyleConfirmed: (value) =>
        set((state) => ({
          isStyleConfirmed: resolve(value, state.isStyleConfirmed),
        })),
      setSelectedTheme: (value) =>
        set((state) => ({
          selectedTheme: resolve(value, state.selectedTheme),
        })),
      setIsThemeConfirmed: (value) =>
        set((state) => ({
          isThemeConfirmed: resolve(value, state.isThemeConfirmed),
        })),
      setCustomThemes: (value) =>
        set((state) => ({ customThemes: resolve(value, state.customThemes) })),
      setActiveTheme: (value) =>
        set((state) => ({ activeTheme: resolve(value, state.activeTheme) })),
      setDragActive: (value) =>
        set((state) => ({ dragActive: resolve(value, state.dragActive) })),
      setLogoFile: (value) =>
        set((state) => ({ logoFile: resolve(value, state.logoFile) })),
      setLogoPreview: (value) =>
        set((state) => ({ logoPreview: resolve(value, state.logoPreview) })),
      setLogoChoice: (value) =>
        set((state) => ({ logoChoice: resolve(value, state.logoChoice) })),
      setIsCreatingProject: (value) =>
        set((state) => ({
          isCreatingProject: resolve(value, state.isCreatingProject),
        })),
      setIsChatOpen: (value) =>
        set((state) => ({ isChatOpen: resolve(value, state.isChatOpen) })),
      setUnreadCount: (value) =>
        set((state) => ({ unreadCount: resolve(value, state.unreadCount) })),
      setIsPremiumModalOpen: (value) =>
        set((state) => ({
          isPremiumModalOpen: resolve(value, state.isPremiumModalOpen),
        })),
      setIsAuthModalOpen: (value) =>
        set((state) => ({
          isAuthModalOpen: resolve(value, state.isAuthModalOpen),
        })),
      setSectionsGenerated: (value) =>
        set((state) => ({
          sectionsGenerated: resolve(value, state.sectionsGenerated),
        })),
      setStructureStage: (value) =>
        set((state) => ({
          structureStage: resolve(value, state.structureStage),
        })),
      setGeneratedSectionsKey: (value) =>
        set((state) => ({
          generatedSectionsKey: resolve(value, state.generatedSectionsKey),
        })),
      resetWorkflow: () =>
        set({
          currentStep: 0,
          chatMessages: [],
          currentInput: "",
          currentQuestion: 0,
          isProcessing: false,
          siteProfile: {
            ...initialSiteProfile,
            modules: [],
            capabilities: [],
            plannedPages: [],
          },
          siteSections: [],
          siteChrome: null,
          siteNavigation: null,
          selectedStyle: siteStyles[0].id,
          isStyleConfirmed: false,
          selectedTheme: themes[0].id,
          isThemeConfirmed: false,
          customThemes: [],
          activeTheme: themes[0],
          dragActive: false,
          logoFile: null,
          logoPreview: "",
          logoChoice: null,
          isCreatingProject: false,
          isChatOpen: false,
          unreadCount: 0,
          isPremiumModalOpen: false,
          isAuthModalOpen: false,
          sectionsGenerated: false,
          structureStage: "pages",
          generatedSectionsKey: "",
        }),
    }),
    {
      name: ONBOARDING_DRAFT_STORAGE_KEY,
      merge: (persisted, current) => {
        const saved = persisted as Partial<OnboardingStore>;
        return {
          ...current,
          ...saved,
          siteProfile: {
            ...current.siteProfile,
            ...saved.siteProfile,
            plannedPages: saved.siteProfile?.plannedPages ?? [],
          },
        };
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        siteProfile: {
          ...state.siteProfile,
          // Uploaded images have their own local storage entry.
          logo: state.siteProfile.logo.startsWith("data:")
            ? ""
            : state.siteProfile.logo,
        },
        siteSections: state.siteSections,
        siteChrome: state.siteChrome,
        siteNavigation: state.siteNavigation,
        selectedStyle: state.selectedStyle,
        isStyleConfirmed: state.isStyleConfirmed,
        selectedTheme: state.selectedTheme,
        isThemeConfirmed: state.isThemeConfirmed,
        structureStage: state.structureStage,
        customThemes: state.customThemes,
        activeTheme: state.activeTheme,
        generatedSectionsKey: state.generatedSectionsKey,
      }),
    },
  ),
);
