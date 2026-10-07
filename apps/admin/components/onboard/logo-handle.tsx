import { RefObject } from "react";
import { Upload, Wand2, X } from "lucide-react";

export type LogoHandleProps = {
  dragActive: boolean;
  logoPreview: string | null;
  logoFile: File | null;
  fileInputRef: RefObject<HTMLInputElement>;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogoGenerate: () => void;
  clearLogo: () => void;
  handleLogoUpload: () => void;
};

export const LogoHandle = ({
  dragActive,
  logoPreview,
  logoFile,
  fileInputRef,
  handleDrag,
  handleDrop,
  handleFileInputChange,
  handleLogoGenerate,
  clearLogo,
  handleLogoUpload,
}: LogoHandleProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Logo Box */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer ${
            dragActive
              ? "border-cyan-400 bg-cyan-50"
              : "border-gray-300 hover:border-gray-400 dark:border-neutral-600 dark:hover:border-neutral-500"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/40">
              <Upload className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-neutral-50">
              Upload Logo
            </h3>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              PNG, JPG, SVG up to 10MB
            </p>
          </div>
        </div>

        {/* Generate Logo Box */}
        <div
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-6 transition-all duration-200 hover:border-gray-400 dark:border-neutral-600 dark:hover:border-neutral-500"
          onClick={handleLogoGenerate}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/40">
              <Wand2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h3 className="mb-1 font-semibold text-gray-800 dark:text-neutral-50">
              Generate Logo
            </h3>
            <p className="mb-2 text-sm text-gray-600 dark:text-neutral-400">
              Let AI create one for you
            </p>
          </div>
        </div>
      </div>

      {/* Logo Preview */}
      {logoPreview && (
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-neutral-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800 dark:text-neutral-50">
              Logo Preview
            </h4>
            <button
              onClick={clearLogo}
              className="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-12 w-12 rounded-lg border border-gray-200 object-contain dark:border-neutral-600"
              />
              <div>
                <p className="font-medium text-gray-800 dark:text-neutral-50">
                  {logoFile?.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  {logoFile && (logoFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleLogoUpload}
              className="px-4 py-2 bg-gradient text-white rounded-lg hover:shadow-lg transition-all duration-200"
            >
              Use This Logo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
