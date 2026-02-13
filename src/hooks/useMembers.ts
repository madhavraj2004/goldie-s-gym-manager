import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MemberWithProfile {
  id: string;
  user_id: string;
  weight_kg: number | null;
  height_cm: number | null;
  date_of_birth: string | null;
  gender: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  fitness_goal: string | null;
  medical_notes: string | null;
  assigned_trainer_id: string | null;
  membership_status: string;
  membership_start: string | null;
  membership_end: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  trainer_profile?: {
    full_name: string | null;
  } | null;
}

export function useMembers(search?: string, statusFilter?: string) {
  return useQuery({
    queryKey: ["members", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("member_profiles")
        .select(`
          *,
          profiles!member_profiles_user_id_fkey(full_name, phone, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("membership_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data as unknown as MemberWithProfile[]) || [];

      if (search) {
        const s = search.toLowerCase();
        results = results.filter((m) =>
          m.profiles?.full_name?.toLowerCase().includes(s)
        );
      }

      return results;
    },
  });
}

export function useTrainersForAssignment() {
  return useQuery({
    queryKey: ["trainers-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "trainer");
      if (error) throw error;

      const trainerIds = data.map((r) => r.user_id);
      if (trainerIds.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", trainerIds);
      if (pErr) throw pErr;
      return profiles || [];
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
      weight_kg?: number;
      height_cm?: number;
      date_of_birth?: string;
      gender?: string;
      emergency_contact?: string;
      emergency_phone?: string;
      fitness_goal?: string;
      medical_notes?: string;
      assigned_trainer_id?: string;
    }) => {
      // Create auth user via edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke("create-member", {
        body: input,
      });
      if (fnError) throw fnError;
      if (fnData?.error) throw new Error(fnData.error);
      return fnData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member created successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, ...updates }: {
      userId: string;
      weight_kg?: number | null;
      height_cm?: number | null;
      date_of_birth?: string | null;
      gender?: string | null;
      emergency_contact?: string | null;
      emergency_phone?: string | null;
      fitness_goal?: string | null;
      medical_notes?: string | null;
      assigned_trainer_id?: string | null;
      membership_status?: string;
      membership_start?: string | null;
      membership_end?: string | null;
    }) => {
      const { error } = await supabase
        .from("member_profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteMember() {
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
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
