import { useEffect, useState } from "react";
import { AlertCircle, CircleCheckBig, Globe, Image as ImageIcon, Loader2, Trash2, TriangleAlert, Upload, X } from "lucide-react";
import { apiFetch } from "@/src/lib/api";
import { useAdmin } from "@/src/admin-context";
import { themes, type Theme, ThemeManager, useThemeManager } from "@/src/settings-theme";
import { toast } from "sonner";
import { MediaPicker } from "@/components/admin/media-picker";
import { PageFrame } from "@/components/admin/frontend/page-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Project = {
  id: string;
  name: string;
  industry: string | null;
  logo: string | null;
  designPreference: { style?: string; theme?: Theme };
};

export function ProjectSettingsPage({ section }: { section: "project" | "appearance" }) {
  const { selectedProjectId, deleteProject } = useAdmin();
  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [logo, setLogo] = useState("");
  const [favicon, setFavicon] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"logo" | "favicon">("logo");
  const [dbTheme, setDbTheme] = useState<Theme | null>(null);
  const { allThemes, selectedThemeId, setSelectedThemeId, setCustomThemes } = useThemeManager({ themes, initialTheme: dbTheme });
  const selectedTheme = allThemes.find((theme) => theme.id === selectedThemeId);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      if (!selectedProjectId) { setProject(null); setLoading(false); return; }
      try {
        const response = await apiFetch(`/api/admin/projects?projectId=${selectedProjectId}`);
        const data = await response.json();
        const loaded = data.project ?? data.projects?.find((item: Project) => item.id === selectedProjectId);
        if (cancelled) return;
        if (loaded) {
          setProject(loaded);
          setName(loaded.name ?? "");
          setIndustry(loaded.industry ?? "");
          setLogo(loaded.logo ?? "");
          const theme = loaded.designPreference?.theme ?? null;
          setDbTheme(theme);
          setCustomThemes(theme?.isCustom ? [theme] : []);
          if (theme) setSelectedThemeId(theme.id);
        } else setProject(null);
      } catch (error) {
        console.error("Error loading project settings:", error);
        toast.error("Failed to load project settings");
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [selectedProjectId, setSelectedThemeId, setCustomThemes]);

  const save = async () => {
    if (!project) return;
    setSaving(true);
    try {
      if (section === "project") {
        const response = await apiFetch("/api/admin/projects", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: project.id, name: name.trim(), industry: industry.trim() || null }),
        });
        const data = await response.json();
        if (!response.ok || !data.project) throw new Error(data.error || "Failed to save settings");
        setProject(data.project);
      } else {
        const logoResponse = await apiFetch("/api/admin/projects", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: project.id, logo: logo || null }),
        });
        const logoData = await logoResponse.json();
        if (!logoResponse.ok || !logoData.project) throw new Error(logoData.error || "Failed to save logo");
        if (selectedTheme) {
          const themeResponse = await apiFetch("/api/admin/projects/theme", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: project.id, theme: selectedTheme }),
          });
          const themeData = await themeResponse.json();
          if (!themeResponse.ok) throw new Error(themeData.error || "Logo saved, but the theme could not be saved");
          logoData.project.designPreference = themeData.designPreference;
        }
        setProject(logoData.project);
      }
      toast("Settings saved", { icon: <CircleCheckBig className="text-green-500" /> });
    } catch (error) {
      console.error("Error saving project settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally { setSaving(false); }
  };

  const removeProject = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      const response = await apiFetch("/api/admin/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: project.id }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to delete project");
      setDeleteOpen(false);
      toast.success("Project deleted");
      deleteProject(selectedProjectId);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to delete project"); }
    finally { setDeleting(false); }
  };

  const title = section === "project" ? "Project Settings" : "Branding & Appearance";
  if (loading) return <PageFrame title={title}><div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-900" /></PageFrame>;
  if (!project) return <PageFrame title={title}><div className="rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" /><p className="text-sm text-neutral-600 dark:text-neutral-300">Select a project to view its settings.</p></div></PageFrame>;

  return <>
    <PageFrame title={title} headerAction={<Button onClick={() => void save()} disabled={saving || (section === "project" && !name.trim())} className="h-9 min-w-32">{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save changes"}</Button>}>
      <div className="space-y-5">
        {section === "project" ? <>
          <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
            <h2 className="mb-5 text-base text-neutral-900 dark:text-neutral-100">Project details</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">Project name <span className="text-red-500">*</span><Input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2" /></label>
              <label className="text-sm text-neutral-700 dark:text-neutral-300">Industry<Input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="e.g. Retail, Healthcare" className="mt-2" /></label>
            </div>
          </section>
          <section className="rounded-xl border border-red-200 bg-red-50/70 p-5 dark:border-red-900/60 dark:bg-red-950/20 sm:p-6">
            <div className="flex gap-4"><TriangleAlert className="mt-1 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" /><div><h2 className="text-base text-neutral-900 dark:text-neutral-100">Delete project</h2><p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">Permanently remove this project and all associated data. This action cannot be undone.</p>
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogTrigger asChild><Button variant="destructive" className="mt-4">Delete project</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this project?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the project and its associated data. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(event) => { event.preventDefault(); void removeProject(); }} disabled={deleting}>{deleting ? "Deleting..." : "Delete project"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </div></div>
          </section>
        </> : <>
          <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6">
            <h2 className="mb-5 text-base text-neutral-900 dark:text-neutral-100">Visual identity</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-[#151517]"><div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200"><ImageIcon className="h-4 w-4" />Logo</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => { setPickerTarget("logo"); setPickerOpen(true); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Choose image</Button>{logo && <Button variant="outline" size="icon" aria-label="Remove logo" onClick={() => setLogo("")}><Trash2 className="h-4 w-4" /></Button>}</div></div><div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">{logo ? <img src={logo} alt="Project logo preview" className="max-h-28 max-w-full object-contain" /> : <p className="text-sm text-neutral-500">No logo uploaded</p>}</div></div>
              <div className="rounded-lg bg-neutral-50 p-4 dark:bg-[#151517]"><div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200"><Globe className="h-4 w-4" />Favicon preview</span><Button variant="outline" size="sm" onClick={() => { setPickerTarget("favicon"); setPickerOpen(true); }}><Upload className="mr-1.5 h-3.5 w-3.5" />Choose image</Button></div><div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"><div className="flex items-center gap-3 rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"><img src={favicon || "/favicon.svg"} alt="" className="h-5 w-5" />{project.name}<span className="text-neutral-400">×</span></div></div><p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Favicon changes are preview-only and are not saved.</p></div>
            </div>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 sm:p-6"><h2 className="mb-5 text-base text-neutral-900 dark:text-neutral-100">Theme</h2><ThemeManager allThemes={allThemes} selectedThemeId={selectedThemeId} onThemeSelect={setSelectedThemeId} setCustomThemes={setCustomThemes} /></section>
        </>}
      </div>
    </PageFrame>
    {section === "appearance" && <MediaPicker projectId={selectedProjectId} open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(item) => { if (pickerTarget === "favicon") setFavicon(item.url); else setLogo(item.url); }} title={pickerTarget === "favicon" ? "Choose a favicon" : "Choose a logo"} />}
  </>;
}
