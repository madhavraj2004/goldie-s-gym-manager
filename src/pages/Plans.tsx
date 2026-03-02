import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Check, IndianRupee, Clock, Star } from "lucide-react";
import { usePlans, useCreatePlan, useUpdatePlan, useDeletePlan, type Plan, type PlanInsert } from "@/hooks/usePlans";

const emptyForm: PlanInsert = { name: "", description: "", price: 0, duration_days: 30, features: [], is_active: true };

function PlanFormDialog({ plan, open, onOpenChange }: { plan?: Plan; open: boolean; onOpenChange: (v: boolean) => void }) {
  const isEdit = !!plan;
  const [form, setForm] = useState<PlanInsert>(plan ? { name: plan.name, description: plan.description ?? "", price: plan.price, duration_days: plan.duration_days, features: plan.features, is_active: plan.is_active } : { ...emptyForm });
  const [featureInput, setFeatureInput] = useState("");
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (isEdit && plan) {
      await updatePlan.mutateAsync({ id: plan.id, ...form });
    } else {
      await createPlan.mutateAsync(form);
    }
    onOpenChange(false);
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (f && !form.features.includes(f)) {
      setForm({ ...form, features: [...form.features, f] });
      setFeatureInput("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Plan" : "Create Plan"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Plan Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gold Monthly" required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this plan" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" min={0} step={1} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" min={1} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Features</Label>
            <div className="flex gap-2">
              <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} placeholder="Add a feature" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} />
              <Button type="button" variant="outline" size="icon" onClick={addFeature}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.features.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 cursor-pointer" onClick={() => removeFeature(i)}>
                  {f} <span className="text-xs opacity-60">×</span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label>Active</Label>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Saving…" : isEdit ? "Update Plan" : "Create Plan"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const Plans = () => {
  const { data: plans, isLoading } = usePlans();
  const deletePlan = useDeletePlan();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | undefined>();

  const openCreate = () => { setEditPlan(undefined); setDialogOpen(true); };
  const openEdit = (p: Plan) => { setEditPlan(p); setDialogOpen(true); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold">Membership Plans</h1>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Plan</Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading plans…</p>
        ) : !plans?.length ? (
          <Card><CardContent className="pt-6 text-center text-muted-foreground">No plans yet. Create your first membership plan.</CardContent></Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative transition-shadow hover:shadow-lg ${!plan.is_active ? "opacity-60" : ""}`}>
                {!plan.is_active && <Badge variant="outline" className="absolute top-3 right-3">Inactive</Badge>}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-primary">{plan.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> {plan.duration_days} days
                  </div>
                  {plan.features.length > 0 && (
                    <ul className="space-y-1.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="flex-1">
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{plan.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePlan.mutate(plan.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PlanFormDialog plan={editPlan} open={dialogOpen} onOpenChange={setDialogOpen} />
    </DashboardLayout>
  );
};

export default Plans;
