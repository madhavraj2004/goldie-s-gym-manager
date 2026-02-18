import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, CreditCard, CalendarCheck, Trophy, TrendingUp, Activity, Target, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

const CHART_COLORS = [
  "hsl(43, 96%, 56%)", // primary/gold
  "hsl(0, 84%, 60%)",  // destructive/red
  "hsl(200, 70%, 50%)", // blue
  "hsl(150, 60%, 45%)", // green
  "hsl(280, 60%, 55%)", // purple
];

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

  // Attendance trend (last 7 days)
  const { data: attendanceTrend } = useQuery({
    queryKey: ["admin-attendance-trend"],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 6);
      const { data } = await supabase
        .from("attendance")
        .select("check_in")
        .gte("check_in", startOfDay(sevenDaysAgo).toISOString());

      const days = eachDayOfInterval({ start: sevenDaysAgo, end: new Date() });
      return days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = data?.filter((a) => format(new Date(a.check_in), "yyyy-MM-dd") === dayStr).length || 0;
        return { day: format(day, "EEE"), count };
      });
    },
  });

  // Revenue by month (last 6 months)
  const { data: revenueTrend } = useQuery({
    queryKey: ["admin-revenue-trend"],
    queryFn: async () => {
      const sixMonthsAgo = subDays(new Date(), 180);
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date, status")
        .gte("payment_date", format(sixMonthsAgo, "yyyy-MM-dd"));

      const monthMap: Record<string, number> = {};
      data?.forEach((p) => {
        if (p.status === "paid") {
          const month = format(new Date(p.payment_date), "MMM");
          monthMap[month] = (monthMap[month] || 0) + Number(p.amount);
        }
      });

      // Get last 6 months in order
      const months: { month: string; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subDays(new Date(), i * 30);
        const m = format(d, "MMM");
        if (!months.find((x) => x.month === m)) {
          months.push({ month: m, revenue: monthMap[m] || 0 });
        }
      }
      return months;
    },
  });

  // Membership status distribution
  const { data: membershipDist } = useQuery({
    queryKey: ["admin-membership-dist"],
    queryFn: async () => {
      const { data } = await supabase.from("member_profiles").select("membership_status");
      const counts: Record<string, number> = {};
      data?.forEach((m) => {
        counts[m.membership_status] = (counts[m.membership_status] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
  });

  // Total revenue
  const { data: totalRevenue } = useQuery({
    queryKey: ["admin-total-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount, status");
      return data?.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0) || 0;
    },
  });

  const stats = [
    { title: "Total Members", value: memberCount ?? "—", icon: Users, color: "text-primary" },
    { title: "Active Members", value: activeCount ?? "—", icon: Activity, color: "text-accent" },
    { title: "Trainers", value: trainerCount ?? "—", icon: Dumbbell, color: "text-primary" },
    { title: "Total Revenue", value: totalRevenue ? `₹${totalRevenue.toLocaleString()}` : "—", icon: IndianRupee, color: "text-primary" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>

        {/* Stats Cards */}
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

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Attendance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" /> Attendance (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                    <XAxis dataKey="day" stroke="hsl(0, 0%, 55%)" fontSize={12} />
                    <YAxis stroke="hsl(0, 0%, 55%)" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 12%)",
                        border: "1px solid hsl(0, 0%, 20%)",
                        borderRadius: "8px",
                        color: "hsl(43, 30%, 90%)",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} name="Check-ins" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Membership Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Membership Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={membershipDist || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(membershipDist || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(0, 0%, 12%)",
                        border: "1px solid hsl(0, 0%, 20%)",
                        borderRadius: "8px",
                        color: "hsl(43, 30%, 90%)",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Revenue Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="month" stroke="hsl(0, 0%, 55%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 55%)" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 12%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "8px",
                      color: "hsl(43, 30%, 90%)",
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(43, 96%, 56%)" strokeWidth={2} dot={{ fill: "hsl(43, 96%, 56%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Members */}
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
