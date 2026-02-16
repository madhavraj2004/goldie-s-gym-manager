import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, CreditCard, CalendarCheck, Trophy, TrendingUp, Activity, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { role, user } = useAuth();

  if (role === "admin") return <AdminDashboard />;
  if (role === "trainer") return <TrainerDashboard userId={user?.id} />;
  return <MemberDashboard userId={user?.id} />;
};

/* ===== ADMIN DASHBOARD ===== */
function AdminDashboard() {
  const { data: memberCount } = useQuery({
    queryKey: ["admin-member-count"],
    queryFn: async () => {
      const { count } = await supabase.from("member_profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: trainerCount } = useQuery({
    queryKey: ["admin-trainer-count"],
    queryFn: async () => {
      const { count } = await supabase.from("trainer_profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: activeCount } = useQuery({
    queryKey: ["admin-active-count"],
    queryFn: async () => {
      const { count } = await supabase.from("member_profiles").select("*", { count: "exact", head: true }).eq("membership_status", "active");
      return count ?? 0;
    },
  });

  const { data: recentMembers } = useQuery({
    queryKey: ["admin-recent-members"],
    queryFn: async () => {
      const { data: members } = await supabase
        .from("member_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!members?.length) return [];
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return members.map((m) => ({
        ...m,
        full_name: profiles?.find((p) => p.user_id === m.user_id)?.full_name || "Unknown",
      }));
    },
  });

  const stats = [
    { title: "Total Members", value: memberCount ?? "—", icon: Users, color: "text-primary" },
    { title: "Active Members", value: activeCount ?? "—", icon: Activity, color: "text-accent" },
    { title: "Trainers", value: trainerCount ?? "—", icon: Dumbbell, color: "text-primary" },
    { title: "This Month", value: "—", icon: CreditCard, color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-display">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Members</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMembers?.length ? (
              <div className="space-y-3">
                {recentMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{m.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${m.membership_status === "active" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"}`}>
                      {m.membership_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No members yet. Add your first member from the Members page.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ===== TRAINER DASHBOARD ===== */
function TrainerDashboard({ userId }: { userId?: string }) {
  const { data: assignedMembers } = useQuery({
    queryKey: ["trainer-assigned", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data: members } = await supabase
        .from("member_profiles")
        .select("*")
        .eq("assigned_trainer_id", userId);
      if (!members?.length) return [];
      const userIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return members.map((m) => ({
        ...m,
        full_name: profiles?.find((p) => p.user_id === m.user_id)?.full_name || "Unknown",
      }));
    },
    enabled: !!userId,
  });

  const { data: trainerProfile } = useQuery({
    queryKey: ["trainer-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("trainer_profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Trainer Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Assigned Members</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{assignedMembers?.length ?? 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Specialization</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-lg font-display">{trainerProfile?.specialization || "Not set"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Experience</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{trainerProfile?.experience_years ?? 0} yrs</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">My Members</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedMembers?.length ? (
              <div className="space-y-3">
                {assignedMembers.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{m.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">Goal: {m.fitness_goal || "Not set"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{m.membership_status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No members assigned to you yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ===== MEMBER DASHBOARD ===== */
function MemberDashboard({ userId }: { userId?: string }) {
  const { data: profile } = useQuery({
    queryKey: ["member-own-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("member_profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["member-user-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  const bmi = profile?.weight_kg && profile?.height_cm
    ? (Number(profile.weight_kg) / ((Number(profile.height_cm) / 100) ** 2)).toFixed(1)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Welcome, {userProfile?.full_name || "Member"}!</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
              <Activity className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display capitalize">{profile?.membership_status || "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Weight</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BMI</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{bmi ?? "—"}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fitness Goal</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-lg font-display">{profile?.fitness_goal || "Not set"}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Height:</span> <span className="font-medium">{profile?.height_cm ? `${profile.height_cm} cm` : "—"}</span></div>
              <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium capitalize">{profile?.gender || "—"}</span></div>
              <div><span className="text-muted-foreground">Membership Start:</span> <span className="font-medium">{profile?.membership_start || "—"}</span></div>
              <div><span className="text-muted-foreground">Membership End:</span> <span className="font-medium">{profile?.membership_end || "—"}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Emergency Contact:</span> <span className="font-medium">{profile?.emergency_contact || "—"} {profile?.emergency_phone ? `(${profile.emergency_phone})` : ""}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
