import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  classId: string | null;
  className: string | null;
  levelId: string | null;
  levelName: string | null;
}

/**
 * Récupère le profil de l'élève connecté (si son compte est lié à une fiche).
 * Retourne null si pas de profil (admin, prof, etc.).
 */
export function useStudentProfile() {
  return useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      try {
        const { data } = await api.get<StudentProfile>("/students/me");
        return data;
      } catch (err: any) {
        // Si 404, c'est qu'on n'est pas un élève
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 10 * 60_000,
    retry: false,
  });
}