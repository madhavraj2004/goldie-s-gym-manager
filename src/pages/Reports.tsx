import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, CalendarCheck, TrendingUp, UserCheck, UserX, BarChart3 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--accent))", "#f59e0b", "#10b981"];

const Reports = () => {
  const { role } = useAuth();

  // Member stats
  const { data: memberStats } = useQuery({
    queryKey: ["report-members"],
    queryFn: async () => {
      const { data: members } = await supabase.from("member_profiles").select("membership_status, plan_id, created_at");
      const total = members?.length || 0;
      const active = members?.filter((m) => m.membership_status === "active").length || 0;
      const expired = members?.filter((m) => m.membership_status === "expired").length || 0;
      const frozen = members?.filter((m) => m.membership_status === "frozen").length || 0;

      const statusData = [
        { name: "Active", value: active },
        { name: "Expired", value: expired },
        { name: "Frozen", value: frozen },
      ].filter((d) => d.value > 0);

      // Signups last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const recentSignups = members?.filter((m) => m.created_at >= thirtyDaysAgo).length || 0;

      return { total, active, expired, frozen, statusData, recentSignups };
    },
    enabled: role === "admin",
  });

  // Payment stats
  const { data: paymentStats } = useQuery({
    queryKey: ["report-payments"],
    queryFn: async () => {
      const { data: payments } = await supabase.from("payments").select("amount, status, payment_date, created_at");
      const totalRevenue = payments?.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0) || 0;
      const pending = payments?.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0) || 0;
      const paidCount = payments?.filter((p) => p.status === "paid").length || 0;
      const pendingCount = payments?.filter((p) => p.status === "pending").length || 0;

      // Monthly revenue (last 6 months)
      const monthlyRevenue: { month: string; amount: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = subDays(new Date(), i * 30);
        const start = startOfMonth(d);
        const end = endOfMonth(d);
        const monthPayments = payments?.filter(
          (p) => p.status === "paid" && p.payment_date >= start.toISOString() && p.payment_date <= end.toISOString()
        );
        monthlyRevenue.push({
          month: format(d, "MMM"),
          amount: monthPayments?.reduce((s, p) => s + p.amount, 0) || 0,
        });
      }

      return { totalRevenue, pending, paidCount, pendingCount, monthlyRevenue };
    },
    enabled: role === "admin",
  });

  // Attendance stats
  const { data: attendanceStats } = useQuery({
    queryKey: ["report-attendance"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data: records } = await supabase
        .from("attendance")
        .select("check_in, user_id")
        .gte("check_in", thirtyDaysAgo);

      const totalCheckins = records?.length || 0;
      const uniqueMembers = new Set(records?.map((r) => r.user_id)).size;

      // Daily check-ins for last 14 days
      const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() });
      const dailyData = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const count = records?.filter((r) => r.check_in.startsWith(dayStr)).length || 0;
        return { day: format(day, "dd MMM"), count };
      });

      return { totalCheckins, uniqueMembers, dailyData };
    },
    enabled: role === "admin",
  });

  // Plan distribution
  const { data: planStats } = useQuery({
    queryKey: ["report-plans"],
    queryFn: async () => {
      const { data: members } = await supabase.from("member_profiles").select("plan_id");
      const { data: plans } = await supabase.from("membership_plans").select("id, name, price");

      const planCounts = plans?.map((p) => ({
        name: p.name,
        count: members?.filter((m) => m.plan_id === p.id).length || 0,
      })) || [];

      return planCounts.filter((p) => p.count > 0);
    },
    enabled: role === "admin",
  });

  if (role !== "admin") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="font-display text-3xl font-bold">Reports</h1>
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p>Reports are available for admins only.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Reports & Analytics</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{memberStats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{memberStats?.active || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">₹{paymentStats?.totalRevenue?.toLocaleString() || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{attendanceStats?.totalCheckins || 0}</p>
                  <p className="text-xs text-muted-foreground">Check-ins (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Membership Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {memberStats?.statusData?.length ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={memberStats.statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {memberStats.statusData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {planStats?.length ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={planStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-green-500">{memberStats?.active || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-destructive">{memberStats?.expired || 0}</p>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-muted-foreground">{memberStats?.frozen || 0}</p>
                    <p className="text-xs text-muted-foreground">Frozen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monthly Revenue</CardTitle>
                <CardDescription>Revenue trend over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentStats?.monthlyRevenue?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={paymentStats.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-xl font-bold">₹{paymentStats?.totalRevenue?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">{paymentStats?.paidCount || 0} payments collected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <UserX className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-xl font-bold">₹{paymentStats?.pending?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">{paymentStats?.pendingCount || 0} payments pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Check-ins (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceStats?.dailyData?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceStats.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold">{attendanceStats?.totalCheckins || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Check-ins (30d)</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{attendanceStats?.uniqueMembers || 0}</p>
                    <p className="text-xs text-muted-foreground">Unique Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
