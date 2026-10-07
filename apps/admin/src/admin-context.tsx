import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/src/lib/auth";
import { adminQueryKeys, useAdminQuery } from "@/src/lib/query";
import { useProjectStore } from "@/src/lib/project-store";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  publicUrl?: string | null;
  storeType?: string | null;
  logo?: string | null;
  isPublished?: boolean;
  designPreference?: Record<string, unknown> | null;
  currency?: string;
  access?: {
    type: "project" | "organization";
    roleName: string;
    isOwner: boolean;
  };
};
type ProjectsResponse = { projects?: Project[] };
const emptyProjects: Project[] = [];

/** Compatibility hook for current route consumers; it no longer owns server state. */
export function useAdmin() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const projectsQuery = useAdminQuery<ProjectsResponse>(
    adminQueryKeys.projects,
    "/api/admin/projects",
    Boolean(user),
  );
  const projects = projectsQuery.data?.projects ?? emptyProjects;
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const selectProject = useProjectStore((state) => state.selectProject);
  const resolveProject = useProjectStore((state) => state.resolveProject);

  useEffect(() => {
    if (user && projectsQuery.isSuccess)
      resolveProject(
        user.id,
        projects.map((project) => project.id),
      );
  }, [projectsQuery.isSuccess, projects, resolveProject, user]);

  return {
    projects,
    projectsLoading: projectsQuery.isLoading,
    selectedProjectId,
    setSelectedProjectId: (id: string) => {
      if (user) selectProject(user.id, id);
      localStorage.removeItem("selectedThemeConfig");
    },
    deleteProject: (id: string) => {
      queryClient.setQueryData<ProjectsResponse>(
        adminQueryKeys.projects,
        (current) => ({
          ...current,
          projects:
            current?.projects?.filter((project) => project.id !== id) ?? [],
        }),
      );
    },
  };
}
