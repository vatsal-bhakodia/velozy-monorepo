import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { apiRequest } from "@/src/lib/api";

export const adminQueryKeys = {
  projects: ["admin", "projects"] as const,
  account: ["admin", "account"] as const,
  resource: (resource: string, projectId?: string, id?: string) =>
    ["admin", resource, projectId ?? null, id ?? null] as const,
};

export function useAdminQuery<T>(key: QueryKey, path: string, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => apiRequest<T>(path), enabled });
}

export function useAdminMutation<TData = unknown, TVariables = RequestInit>(
  path: string | ((variables: TVariables) => string),
  invalidate: QueryKey | QueryKey[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) =>
      apiRequest<TData>(typeof path === "function" ? path(variables) : path, variables as RequestInit),
    onSuccess: async () => {
      const keys = Array.isArray(invalidate[0]) ? (invalidate as QueryKey[]) : [invalidate as QueryKey];
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-http"],
          refetchType: "none",
        }),
        ...keys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      ]);
    },
  });
}
