import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@truerep/shared";

export function useUser() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<User>("/users/me") });
}
