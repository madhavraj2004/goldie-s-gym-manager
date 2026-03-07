import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Check, CheckCheck, Send, Megaphone, Users, Filter } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Notifications = () => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetTab, setTargetTab] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPlan, setFilterPlan] = useState("all");

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch members for targeted sending (admin only)
  const { data: members } = useQuery({
    queryKey: ["members-for-notify"],
    queryFn: async () => {
      const { data: mp } = await supabase.from("member_profiles").select("user_id, membership_status, plan_id");
      if (!mp?.length) return [];
      const userIds = mp.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return mp.map((m) => ({
        ...m,
        full_name: profiles?.find((p) => p.user_id === m.user_id)?.full_name || "Unnamed",
      }));
    },
    enabled: role === "admin",
  });

  const { data: plans } = useQuery({
    queryKey: ["plans-for-notify"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_plans").select("id, name");
      if (error) throw error;
      return data || [];
    },
    enabled: role === "admin",
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); toast.success("All marked as read"); },
  });

  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { title, message, type: "announcement" };

      if (targetTab === "specific") {
        body.target_type = "specific";
        body.target_user_ids = selectedMembers;
      } else if (targetTab === "filter") {
        body.target_type = "filter";
        body.target_status = filterStatus;
        body.target_plan_id = filterPlan;
      }
      // else "all" — no target_type, sends to everyone

      const { data, error } = await supabase.functions.invoke("send-announcement", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Announcement sent to ${data.sent} member${data.sent !== 1 ? "s" : ""}`);
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTargetTab("all");
    setSelectedMembers([]);
    setFilterStatus("all");
    setFilterPlan("all");
    setOpen(false);
  };

  const toggleMember = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const typeIcon = (type: string) => {
    if (type === "payment_due") return "💰";
    if (type === "achievement") return "🏆";
    if (type === "announcement") return "📢";
    return "🔔";
  };

  const canSend =
    title.trim() &&
    message.trim() &&
    (targetTab === "all" ||
      (targetTab === "specific" && selectedMembers.length > 0) ||
      targetTab === "filter");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold">Notifications</h1>
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
                <CheckCheck className="h-4 w-4 mr-2" /> Mark All Read
              </Button>
            )}
            {role === "admin" && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Megaphone className="h-4 w-4 mr-2" /> Send Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Send Announcement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="ann-title">Title</Label>
                      <Input
                        id="ann-title"
                        placeholder="e.g. Gym Closed for Maintenance"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-message">Message</Label>
                      <Textarea
                        id="ann-message"
                        placeholder="Write your announcement..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Send To</Label>
                      <Tabs value={targetTab} onValueChange={setTargetTab}>
                        <TabsList className="w-full">
                          <TabsTrigger value="all" className="flex-1 gap-1">
                            <Users className="h-3.5 w-3.5" /> All Members
                          </TabsTrigger>
                          <TabsTrigger value="specific" className="flex-1 gap-1">
                            <Check className="h-3.5 w-3.5" /> Select
                          </TabsTrigger>
                          <TabsTrigger value="filter" className="flex-1 gap-1">
                            <Filter className="h-3.5 w-3.5" /> Filter
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="pt-2">
                          <p className="text-sm text-muted-foreground">
                            Notification will be sent to all {members?.length || 0} members.
                          </p>
                        </TabsContent>

                        <TabsContent value="specific" className="pt-2">
                          <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                            {members?.map((m) => (
                              <label
                                key={m.user_id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedMembers.includes(m.user_id)}
                                  onCheckedChange={() => toggleMember(m.user_id)}
                                />
                                <span className="text-sm flex-1">{m.full_name}</span>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {m.membership_status}
                                </Badge>
                              </label>
                            ))}
                            {!members?.length && (
                              <p className="text-sm text-muted-foreground text-center py-4">No members found</p>
                            )}
                          </div>
                          {selectedMembers.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
                            </p>
                          )}
                        </TabsContent>

                        <TabsContent value="filter" className="pt-2 space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Membership Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="frozen">Frozen</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Membership Plan</Label>
                            <Select value={filterPlan} onValueChange={setFilterPlan}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Plans</SelectItem>
                                {plans?.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    <Button
                      className="w-full"
                      disabled={!canSend || sendAnnouncement.isPending}
                      onClick={() => sendAnnouncement.mutate()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendAnnouncement.isPending ? "Sending..." : "Send Notification"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {notifications?.length ? (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card key={n.id} className={`transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
                <CardContent className="py-4 flex items-start gap-4">
                  <span className="text-2xl">{typeIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{n.title}</p>
                      {!n.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(n.created_at), "MMM dd, yyyy 'at' hh:mm a")}</p>
                  </div>
                  {!n.is_read && (
                    <Button variant="ghost" size="icon" onClick={() => markRead.mutate(n.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-12">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>No notifications yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
