interface ErrorOverlayProps {
  generationError: string | null;
  onGoBack: () => void;
  onRetry?: () => void;
}

export function ErrorOverlay({ generationError, onGoBack, onRetry }: ErrorOverlayProps) {
  if (!generationError) return null;

  return (
    <div className="absolute inset-0 bg-white backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl border max-w-md">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Generation Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {generationError}
          </p>
          {generationError.includes("AI credits") && (
            <a
              href="/settings/plan-usage"
              className="mb-4 inline-flex text-sm font-medium text-blue-700 underline underline-offset-4 dark:text-blue-300"
            >
              Open Billing &amp; usage
            </a>
          )}
          <div className="flex justify-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Retry generation
              </button>
            )}
            <button
              onClick={onGoBack}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
