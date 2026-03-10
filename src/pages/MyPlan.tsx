import React, { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/hooks/usePlans";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, CreditCard, Clock, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

interface MemberPlanData {
  membership_status: string;
  membership_start: string | null;
  membership_end: string | null;
  plan_id: string | null;
  plan_name?: string;
  plan_price?: number;
  plan_duration_days?: number;
  plan_features?: string[];
  plan_description?: string | null;
}

const MyPlan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: allPlans, isLoading: plansLoading } = usePlans();
  const [memberData, setMemberData] = useState<MemberPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: mp } = await supabase
        .from("member_profiles")
        .select("membership_status, membership_start, membership_end, plan_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (mp && mp.plan_id) {
        const { data: plan } = await supabase
          .from("membership_plans")
          .select("name, price, duration_days, features, description")
          .eq("id", mp.plan_id)
          .maybeSingle();

        setMemberData({
          ...mp,
          plan_name: plan?.name,
          plan_price: plan?.price,
          plan_duration_days: plan?.duration_days,
          plan_features: plan?.features ?? [],
          plan_description: plan?.description,
        });
      } else {
        setMemberData(mp ? { ...mp } : null);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const daysRemaining = memberData?.membership_end
    ? differenceInDays(new Date(memberData.membership_end), new Date())
    : null;

  const isExpired = memberData?.membership_end ? isPast(new Date(memberData.membership_end)) : false;

  const statusColor = memberData?.membership_status === "active" && !isExpired
    ? "default"
    : memberData?.membership_status === "expired" || isExpired
      ? "destructive"
      : "secondary";

  const handleRequestChange = async () => {
    if (!user || !selectedPlanId) return;
    setRequesting(true);

    const selectedPlan = allPlans?.find((p) => p.id === selectedPlanId);
    const { error } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Plan Change Request",
      message: `Member requested to switch to the "${selectedPlan?.name}" plan. Please review in the admin panel.`,
      type: "plan_change",
    });

    // Also notify admins by inserting a notification for each admin
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminRoles) {
      const adminNotifs = adminRoles.map((ar) => ({
        user_id: ar.user_id,
        title: "Plan Change Request",
        message: `A member has requested to switch to the "${selectedPlan?.name}" plan.`,
        type: "plan_change",
      }));
      await supabase.from("notifications").insert(adminNotifs);
    }

    setRequesting(false);
    setChangeDialogOpen(false);
    setSelectedPlanId(null);

    if (!error) {
      toast({ title: "Request submitted", description: "Your plan change request has been sent to the admin." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const availablePlans = allPlans?.filter((p) => p.is_active && p.id !== memberData?.plan_id) ?? [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading your plan…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-3xl font-bold">My Plan</h1>

        {/* Current Plan Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {memberData?.plan_name ?? "No Plan Assigned"}
              </CardTitle>
              <Badge variant={statusColor} className="capitalize">
                {isExpired ? "expired" : memberData?.membership_status ?? "none"}
              </Badge>
            </div>
            {memberData?.plan_description && (
              <CardDescription>{memberData.plan_description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {memberData?.plan_id ? (
              <>
                {/* Key dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Start Date
                    </p>
                    <p className="font-semibold">
                      {memberData.membership_start
                        ? format(new Date(memberData.membership_start), "dd MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> End Date
                    </p>
                    <p className="font-semibold">
                      {memberData.membership_end
                        ? format(new Date(memberData.membership_end), "dd MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Days Remaining
                    </p>
                    <p className={`font-semibold ${isExpired ? "text-destructive" : daysRemaining !== null && daysRemaining <= 7 ? "text-warning" : ""}`}>
                      {isExpired ? "Expired" : daysRemaining !== null ? `${daysRemaining} days` : "—"}
                    </p>
                  </div>
                </div>

                {/* Price & Duration */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>₹{memberData.plan_price?.toLocaleString() ?? "0"} / {memberData.plan_duration_days} days</span>
                </div>

                {/* Features */}
                {memberData.plan_features && memberData.plan_features.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Plan Features</p>
                    <ul className="space-y-1.5">
                      {memberData.plan_features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expiry warning */}
                {isExpired && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Your membership has expired. Please contact the front desk to renew.
                  </div>
                )}
                {!isExpired && daysRemaining !== null && daysRemaining <= 7 && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Your membership expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}. Consider renewing soon.
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                You don't have an active plan yet. Please contact the front desk to subscribe.
              </p>
            )}

            {/* Request Change Button */}
            {availablePlans.length > 0 && (
              <Button variant="outline" onClick={() => setChangeDialogOpen(true)} className="gap-2">
                Request Plan Change <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Change Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Plan Change</DialogTitle>
            <DialogDescription>
              Select a new plan below. Your request will be sent to the admin for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {availablePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-left rounded-lg border p-4 transition-colors ${
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-sm text-muted-foreground">₹{plan.price.toLocaleString()} / {plan.duration_days}d</span>
                </div>
                {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestChange} disabled={!selectedPlanId || requesting}>
              {requesting ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MyPlan;
