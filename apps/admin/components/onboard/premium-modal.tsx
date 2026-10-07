import React from "react";
import { Crown, X, Sparkles, Zap } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal = ({ isOpen, onClose }: PremiumModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-modalSlideIn dark:bg-neutral-800">
        {/* Gradient header */}
        <div className="bg-gradient p-6 pb-10 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors duration-200"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Crown className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Go Premium</h2>
          <p className="text-white/80 text-sm">
            Unlock AI-powered logo generation
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 -mt-4">
          <div className="space-y-4 rounded-2xl bg-cyan-50 p-5 dark:bg-neutral-700">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-neutral-50">
                  AI Logo Generation
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                  Create unique, professional logos instantly
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-neutral-50">
                  Unlimited Generations
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-neutral-400">
                  Generate as many variations as you need
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-gradient text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 text-sm"
          >
            Upgrade to Premium
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Maybe later
          </button>
        </div>

        <style>{`
          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-modalSlideIn {
            animation: modalSlideIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};
