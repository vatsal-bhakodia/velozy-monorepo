import {
  Globe,
  Layout,
  Palette,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";
import { Step } from "@/src/onboard/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BottomNavProps {
  currentStep: number;
  prevStep: () => void;
  nextStep: () => void;
  generatePrompt: () => Promise<void>;
  canProceedFromStep0: boolean;
  canProceedFromStep1: boolean;
  canProceedFromStep2: boolean;
  canProceedFromStep3: boolean;
  isCreatingProject: boolean;
  nextStepDescription?: string;
  onNext?: () => void;
}

export const BottomNav = ({
  currentStep,
  prevStep,
  nextStep,
  generatePrompt,
  canProceedFromStep0,
  canProceedFromStep1,
  canProceedFromStep2,
  canProceedFromStep3,
  isCreatingProject,
  nextStepDescription,
  onNext,
}: BottomNavProps) => {
  const canContinue =
    (currentStep === 0 && canProceedFromStep0) ||
    (currentStep === 1 && canProceedFromStep1) ||
    (currentStep === 2 && canProceedFromStep2) ||
    (currentStep === 3 && canProceedFromStep3);
  const disabledReason = currentStep === 0
    ? "Enter a valid site name and industry, then choose a site type and focus."
    : currentStep === 2
      ? "Generate a homepage structure before continuing."
      : currentStep === 3
        ? "Confirm both the visual style and color theme before finishing."
        : "Complete this step before continuing.";

  const steps: (Step & { isActive: boolean })[] = [
    {
      id: 0,
      name: "Site Profile",
      icon: Globe,
      completed: currentStep > 1,
      isActive: currentStep === 0 || currentStep === 1,
    },
    {
      id: 2,
      name: "Site Structure",
      icon: Layout,
      completed: currentStep > 2,
      isActive: currentStep === 2,
    },
    {
      id: 3,
      name: "Visual Design",
      icon: Palette,
      completed: false,
      isActive: currentStep === 3,
    },
  ];

  return (
    <div className="z-50 border-t border-gray-200/50 bg-white/90 px-3 py-3 backdrop-blur-md dark:border-neutral-700/70 dark:bg-neutral-900/95 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-gray-700 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 sm:gap-2 sm:px-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm">Previous</span>
          </button>

          {/* Step Tabs */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 md:gap-8 min-w-0">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-md transition-all duration-200 flex-shrink-0 ${
                    step.isActive
                      ? "bg-gradient text-white shadow-lg"
                      : step.completed
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {step.completed ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                  <span className="hidden md:inline text-sm font-medium">
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="relative flex-shrink-0">
            <TooltipProvider delayDuration={120}>
              <Tooltip
                open={canContinue && !isCreatingProject ? true : undefined}
              >
                <TooltipTrigger asChild>
                  <div
                    title={!canContinue ? disabledReason : undefined}
                    className={
                      canContinue && !isCreatingProject
                        ? "relative isolate flex overflow-hidden rounded-lg p-[2px] drop-shadow-[0_0_10px_rgba(14,165,233,0.32)] before:absolute before:inset-[-100%] before:-z-10 before:rounded-[0.65rem] before:bg-[conic-gradient(from_0deg,transparent_0_60%,#0ea5e9,#2563eb,#ffffff,transparent_82%_100%)] before:animate-spin"
                        : ""
                    }
                  >
                    <button
                      onClick={
                        currentStep === 3
                          ? async () => await generatePrompt()
                          : () => (onNext ? onNext() : nextStep())
                      }
                      disabled={!canContinue || isCreatingProject}
                      aria-label={
                        !canContinue
                          ? `${currentStep === 3 ? "Finish" : "Next"}. ${disabledReason}`
                          : undefined
                      }
                      className="relative z-10 flex flex-1 items-center gap-1.5 rounded-md bg-gradient px-3 py-2 text-white shadow-[0_5px_18px_rgba(14,165,233,0.28),inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4"
                    >
                      <span className="text-sm sm:text-base">
                        {currentStep === 3
                          ? isCreatingProject
                            ? "Creating..."
                            : "Finish"
                          : "Next"}
                      </span>
                      {currentStep === 3 ? (
                        isCreatingProject ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-5 sm:w-5" />
                        ) : (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                        )
                      ) : (
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      )}
                    </button>
                  </div>
                </TooltipTrigger>
                {canContinue && !isCreatingProject && (
                  <TooltipContent
                    side="top"
                    align="end"
                    className="max-w-[280px] border-sky-100 bg-white text-xs font-medium text-slate-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    {currentStep === 3
                      ? "Click Finish to save your project and open the dashboard."
                      : nextStepDescription || "Click Next to continue to the next step."}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};
