import { ChatMessage, SiteProfile } from "./types";
import { PENDING_LOGO_STORAGE_KEY } from "./storage-keys";
import { themeFromLogo } from "@/src/onboard/lib/logo-palette";

export const useLogoHandlers = (onboardingState: any) => {
  const {
    dragActive,
    setDragActive,
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    logoChoice,
    setLogoChoice,
    setChatMessages,
    setSiteProfile,
    setIsTyping,
    setIsProcessing,
    setCustomThemes,
    setActiveTheme,
    setSelectedTheme,
  } = onboardingState;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleLogoFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLogoPreview(dataUrl);
        // Keep the profile summary in sync as soon as the file is selected.
        // The actual media upload still waits until a project ID exists.
        setSiteProfile((prev: SiteProfile) => ({
          ...prev,
          logo: dataUrl,
        }));
        themeFromLogo(dataUrl).then((theme) => {
          if (!theme) return;
          setCustomThemes((prev: any[]) => [
            ...prev.filter((item) => item.id !== theme.id),
            theme,
          ]);
          setActiveTheme(theme);
          setSelectedTheme(theme.id);
        });
        try {
          localStorage.setItem(
            PENDING_LOGO_STORAGE_KEY,
            JSON.stringify({ dataUrl, name: file.name, type: file.type }),
          );
        } catch (error) {
          console.error("Could not persist pending logo locally:", error);
        }
      };
      reader.readAsDataURL(file);
      setLogoChoice("upload");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoFile(e.target.files[0]);
    }
  };

  const handleLogoUpload = () => {
    if (logoFile) {
      // Simply set the logo in the profile — no chat flow needed anymore
      setSiteProfile((prev: SiteProfile) => ({
        ...prev,
        logo: logoPreview,
      }));
    }
  };

  const handleLogoGenerate = () => {
    setLogoChoice("generate");
    localStorage.removeItem(PENDING_LOGO_STORAGE_KEY);

    setSiteProfile((prev: SiteProfile) => ({
      ...prev,
      logo: "generate",
    }));
  };

  const clearLogo = () => {
    setLogoPreview("");
    setLogoFile(null);
    setLogoChoice(null);
    setSiteProfile((prev: SiteProfile) => ({
      ...prev,
      logo: "",
    }));
    localStorage.removeItem(PENDING_LOGO_STORAGE_KEY);
  };

  return {
    handleDrag,
    handleDrop,
    handleLogoFile,
    handleFileInputChange,
    handleLogoUpload,
    handleLogoGenerate,
    clearLogo,
  };
};
