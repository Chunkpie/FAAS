import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { getToken, removeToken } from "@/lib/auth";
import { useLocation } from "wouter";

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const token = getToken();

  const { data: user, isLoading, error } = useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: ({ signal }) => getMe({ signal }),
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    removeToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    setLocation("/login");
  };

  return {
    user,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user,
    logout,
    error,
  };
}
