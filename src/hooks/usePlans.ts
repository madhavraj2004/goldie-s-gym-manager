import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanInsert = Omit<Plan, "id" | "created_at" | "updated_at">;
export type PlanUpdate = Partial<PlanInsert> & { id: string };

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return data as Plan[];
    },
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (plan: PlanInsert) => {
      const { data, error } = await supabase
        .from("membership_plans")
        .insert(plan)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan created successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create plan", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PlanUpdate) => {
      const { data, error } = await supabase
        .from("membership_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan updated successfully" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to update plan", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("membership_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast({ title: "Plan deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Failed to delete plan", description: e.message, variant: "destructive" });
    },
  });
}
