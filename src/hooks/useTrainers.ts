import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainerWithProfile {
  id: string;
  user_id: string;
  specialization: string | null;
  certifications: string[] | null;
  experience_years: number | null;
  bio: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  assigned_members_count?: number;
}

export function useTrainers(search?: string) {
  return useQuery({
    queryKey: ["trainers", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data?.length) return [];

      const userIds = data.map((t) => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .in("user_id", userIds);

      // Count assigned members per trainer
      const { data: memberCounts } = await supabase
        .from("member_profiles")
        .select("assigned_trainer_id")
        .in("assigned_trainer_id", userIds);

      let results: TrainerWithProfile[] = data.map((t) => ({
        ...t,
        profiles: profiles?.find((p) => p.user_id === t.user_id) || null,
        assigned_members_count: memberCounts?.filter((m) => m.assigned_trainer_id === t.user_id).length || 0,
      }));

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((t) =>
          t.profiles?.full_name?.toLowerCase().includes(s) ||
          t.specialization?.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });
}

export function useCreateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      specialization?: string;
      certifications?: string[];
      experience_years?: number;
      bio?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("create-trainer", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer created successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: {
      userId: string;
      specialization?: string | null;
      certifications?: string[] | null;
      experience_years?: number | null;
      bio?: string | null;
    }) => {
      const { error } = await supabase
        .from("trainer_profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-member", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainers"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Trainer deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
