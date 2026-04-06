import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Plus, Pencil, Trash2, Target, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const GOAL_TYPES = [
  { value: "weight_loss", label: "Weight Loss", unit: "kg" },
  { value: "muscle_gain", label: "Muscle Gain", unit: "kg" },
  { value: "body_fat", label: "Body Fat %", unit: "%" },
  { value: "running", label: "Running Distance", unit: "km" },
  { value: "strength", label: "Strength (Lift)", unit: "kg" },
  { value: "attendance", label: "Gym Visits", unit: "days" },
  { value: "general", label: "General", unit: "" },
];

const Milestones = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [filter, setFilter] = useState("active");

  const { data: goals, isLoading } = useQuery({
    queryKey: ["member-goals", user?.id, filter],
    queryFn: async () => {
      let q = supabase
        .from("member_goals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("member_goals").insert({
        user_id: user!.id,
        title: form.title,
        goal_type: form.goal_type,
        target_value: form.target_value ? Number(form.target_value) : null,
        current_value: form.current_value ? Number(form.current_value) : 0,
        unit: form.unit,
        notes: form.notes,
        target_date: form.target_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member-goals"] });
      setShowCreate(false);
      toast({ title: "Goal created!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateGoal = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase
        .from("member_goals")
        .update({
          title: form.title,
          goal_type: form.goal_type,
          target_value: form.target_value ? Number(form.target_value) : null,
          current_value: form.current_value ? Number(form.current_value) : 0,
          unit: form.unit,
          notes: form.notes,
          status: form.status,
          target_date: form.target_date || null,
        })
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member-goals"] });
      setEditGoal(null);
      toast({ title: "Goal updated!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["member-goals"] });
      toast({ title: "Goal deleted" });
    },
  });

  const getProgress = (g: any) => {
    if (!g.target_value || g.target_value === 0) return 0;
    return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
  };

  const statusColor = (s: string) =>
    s === "completed" ? "default" : s === "abandoned" ? "destructive" : "secondary";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" /> Milestones & Progress
          </h1>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Goal
          </Button>
        </div>

        <div className="flex gap-2">
          {["active", "completed", "abandoned", "all"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading goals…</p>
        ) : !goals?.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No goals yet</p>
              <p className="text-sm">Set your first fitness goal to start tracking progress!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goals.map((g: any) => {
              const progress = getProgress(g);
              const goalType = GOAL_TYPES.find((t) => t.value === g.goal_type);
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{g.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{goalType?.label || g.goal_type}</Badge>
                          <Badge variant={statusColor(g.status)}>{g.status}</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditGoal(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteGoal.mutate(g.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {g.target_value && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">
                            {g.current_value} / {g.target_value} {g.unit}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <p className="text-xs text-right text-muted-foreground">{progress}%</p>
                      </>
                    )}
                    {g.target_date && (
                      <p className="text-xs text-muted-foreground">
                        Target: {format(new Date(g.target_date), "MMM dd, yyyy")}
                      </p>
                    )}
                    {g.notes && <p className="text-sm text-muted-foreground">{g.notes}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <GoalDialog
          open={showCreate || !!editGoal}
          onClose={() => { setShowCreate(false); setEditGoal(null); }}
          initial={editGoal}
          onSave={(form: any) => {
            if (editGoal) updateGoal.mutate({ ...form, id: editGoal.id });
            else createGoal.mutate(form);
          }}
          saving={createGoal.isPending || updateGoal.isPending}
        />
      </div>
    </DashboardLayout>
  );
};

function GoalDialog({ open, onClose, initial, onSave, saving }: any) {
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState("general");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState("active");

  const isEdit = !!initial;

  // Reset form when opening
  useState(() => {
    if (initial) {
      setTitle(initial.title || "");
      setGoalType(initial.goal_type || "general");
      setTargetValue(initial.target_value?.toString() || "");
      setCurrentValue(initial.current_value?.toString() || "0");
      setUnit(initial.unit || "");
      setNotes(initial.notes || "");
      setTargetDate(initial.target_date || "");
      setStatus(initial.status || "active");
    } else {
      setTitle(""); setGoalType("general"); setTargetValue(""); setCurrentValue("0");
      setUnit(""); setNotes(""); setTargetDate(""); setStatus("active");
    }
  });

  // Update form when initial changes
  const prevId = useState<string | null>(null);
  if ((initial?.id || null) !== prevId[0]) {
    prevId[1](initial?.id || null);
    if (initial) {
      setTitle(initial.title || "");
      setGoalType(initial.goal_type || "general");
      setTargetValue(initial.target_value?.toString() || "");
      setCurrentValue(initial.current_value?.toString() || "0");
      setUnit(initial.unit || "");
      setNotes(initial.notes || "");
      setTargetDate(initial.target_date || "");
      setStatus(initial.status || "active");
    } else {
      setTitle(""); setGoalType("general"); setTargetValue(""); setCurrentValue("0");
      setUnit(""); setNotes(""); setTargetDate(""); setStatus("active");
    }
  }

  const handleTypeChange = (val: string) => {
    setGoalType(val);
    const found = GOAL_TYPES.find((t) => t.value === val);
    if (found) setUnit(found.unit);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Goal" : "Create New Goal"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lose 5kg by summer" />
          </div>
          <div className="space-y-2">
            <Label>Goal Type</Label>
            <Select value={goalType} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Current</Label>
              <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Target</Label>
              <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Date</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave({ title, goal_type: goalType, target_value: targetValue, current_value: currentValue, unit, notes, target_date: targetDate, status })}
            disabled={!title.trim() || saving}
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Milestones;
