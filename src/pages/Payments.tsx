import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Plus, IndianRupee, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Payments = () => {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminPayments />;
  return <MemberPayments userId={user?.id} />;
};

function MemberPayments({ userId }: { userId?: string }) {
  const { data: payments } = useQuery({
    queryKey: ["member-payments", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const totalPaid = payments?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingAmount = payments?.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">My Payments</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">₹{totalPaid.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Dues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display text-destructive">₹{pendingAmount.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{payments?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Payment History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments?.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.payment_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{p.description || "Membership Fee"}</TableCell>
                    <TableCell className="font-medium">₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!payments?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No payment records.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AdminPayments() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showDue, setShowDue] = useState(false);

  const { data: allPayments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
        .limit(50);
      if (error) throw error;

      if (!data?.length) return [];
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map((p) => ({
        ...p,
        full_name: profiles?.find((pr) => pr.user_id === p.user_id)?.full_name || "Unknown",
      }));
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-members-for-payment"],
    queryFn: async () => {
      const { data: mp } = await supabase.from("member_profiles").select("user_id");
      if (!mp?.length) return [];
      const userIds = mp.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return profiles || [];
    },
  });

  const totalRevenue = allPayments?.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const pendingDues = allPayments?.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const addPayment = useMutation({
    mutationFn: async (input: { user_id: string; amount: number; status: string; method: string; description: string; due_date?: string }) => {
      const { error } = await supabase.from("payments").insert(input);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-payments"] }); toast.success("Payment recorded"); setShowAdd(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendDueNotifications = useMutation({
    mutationFn: async () => {
      const pending = allPayments?.filter((p) => p.status === "pending") || [];
      if (!pending.length) throw new Error("No pending dues");
      const uniqueUsers = [...new Set(pending.map((p) => p.user_id))];
      const notifications = uniqueUsers.map((uid) => {
        const userDue = pending.filter((p) => p.user_id === uid).reduce((s, p) => s + Number(p.amount), 0);
        return {
          user_id: uid,
          title: "Payment Due Reminder",
          message: `You have a pending payment of ₹${userDue.toLocaleString()}. Please clear your dues at the earliest.`,
          type: "payment_due",
        };
      });
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`Due reminders sent to members!`); setShowDue(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">Payments</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDue(true)}>
              <Send className="h-4 w-4 mr-2" /> Send Due Reminders
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">₹{totalRevenue.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Dues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display text-destructive">₹{pendingDues.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
              <CreditCard className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{allPayments?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Recent Transactions</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPayments?.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{format(new Date(p.payment_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>₹{Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{p.method}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "paid" ? "default" : p.status === "pending" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!allPayments?.length && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No payments recorded yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Payment Dialog */}
      <AddPaymentDialog open={showAdd} onClose={() => setShowAdd(false)} members={members || []} onAdd={addPayment.mutateAsync} isLoading={addPayment.isPending} />

      {/* Send Due Confirmation */}
      <Dialog open={showDue} onOpenChange={() => setShowDue(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Due Reminders</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will send a payment due notification to all members with pending dues. Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDue(false)}>Cancel</Button>
            <Button onClick={() => sendDueNotifications.mutate()} disabled={sendDueNotifications.isPending}>
              {sendDueNotifications.isPending ? "Sending..." : "Send Reminders"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function AddPaymentDialog({
  open, onClose, members, onAdd, isLoading,
}: {
  open: boolean;
  onClose: () => void;
  members: { user_id: string; full_name: string | null }[];
  onAdd: (input: any) => Promise<any>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({ user_id: "", amount: "", status: "paid", method: "cash", description: "", due_date: "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAdd({
      user_id: form.user_id,
      amount: Number(form.amount),
      status: form.status,
      method: form.method,
      description: form.description || null,
      due_date: form.due_date || null,
    });
    setForm({ user_id: "", amount: "", status: "paid", method: "cash", description: "", due_date: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Member *</Label>
            <Select value={form.user_id} onValueChange={(v) => set("user_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.full_name || "Unnamed"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} required min="1" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v) => set("method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="e.g. Monthly membership fee" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !form.user_id}>{isLoading ? "Saving..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Payments;
