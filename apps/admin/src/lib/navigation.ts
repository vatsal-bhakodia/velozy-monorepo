import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams as useReactRouterParams } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  const push = useCallback((to: string) => navigate(to), [navigate]);
  const replace = useCallback(
    (to: string) => navigate(to, { replace: true }),
    [navigate],
  );
  const back = useCallback(() => navigate(-1), [navigate]);
  return useMemo(() => ({ push, replace, back }), [push, replace, back]);
}

export function usePathname() {
  return useLocation().pathname;
}

export const useParams = useReactRouterParams;
