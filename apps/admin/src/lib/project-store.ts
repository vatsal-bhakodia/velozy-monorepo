import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProjectSelectionState = {
  selectedProjectIdByUser: Record<string, string>;
  selectedProjectId: string;
  selectProject: (userId: string, projectId: string) => void;
  resolveProject: (userId: string, projectIds: string[]) => string;
  resetRuntimeSelection: () => void;
};

export const useProjectStore = create<ProjectSelectionState>()(
  persist(
    (set, get) => ({
      selectedProjectIdByUser: {},
      selectedProjectId: "",
      selectProject: (userId, projectId) => set((state) => ({
        selectedProjectId: projectId,
        selectedProjectIdByUser: { ...state.selectedProjectIdByUser, [userId]: projectId },
      })),
      resolveProject: (userId, projectIds) => {
        const saved = get().selectedProjectIdByUser[userId];
        const projectId = saved && projectIds.includes(saved) ? saved : (projectIds[0] ?? "");
        set((state) => ({
          selectedProjectId: projectId,
          selectedProjectIdByUser: projectId
            ? { ...state.selectedProjectIdByUser, [userId]: projectId }
            : state.selectedProjectIdByUser,
        }));
        return projectId;
      },
      resetRuntimeSelection: () => set({ selectedProjectId: "" }),
    }),
    { name: "velozy-admin-project-selection", partialize: (state) => ({ selectedProjectIdByUser: state.selectedProjectIdByUser }) },
  ),
);
