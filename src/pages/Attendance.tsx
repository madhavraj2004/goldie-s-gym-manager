import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, LogIn, LogOut, Flame, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, startOfDay, isToday } from "date-fns";

const Attendance = () => {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminAttendance />;
  return <MemberAttendance userId={user?.id} />;
};

function MemberAttendance({ userId }: { userId?: string }) {
  const qc = useQueryClient();

  const { data: records } = useQuery({
    queryKey: ["attendance", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", userId)
        .order("check_in", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const todayRecord = records?.find((r) => isToday(new Date(r.check_in)));
  const isCheckedIn = todayRecord && !todayRecord.check_out;

  // Calculate streak
  const streak = (() => {
    if (!records?.length) return 0;
    let count = 0;
    const uniqueDays = [...new Set(records.map((r) => format(new Date(r.check_in), "yyyy-MM-dd")))].sort().reverse();
    const today = format(new Date(), "yyyy-MM-dd");
    const startDay = uniqueDays[0] === today ? today : null;
    if (!startDay) return 0;
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      if (uniqueDays[i] === expected) count++;
      else break;
    }
    return count;
  })();

  const checkIn = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not logged in");
      const { error } = await supabase.from("attendance").insert({ user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Checked in! 💪"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!todayRecord) throw new Error("No check-in found");
      const { error } = await supabase.from("attendance").update({ check_out: new Date().toISOString() }).eq("id", todayRecord.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Checked out! See you tomorrow!"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Attendance</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Status</CardTitle>
              <CalendarCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {isCheckedIn ? (
                <Badge className="bg-accent text-accent-foreground">Checked In</Badge>
              ) : todayRecord ? (
                <Badge variant="secondary">Completed</Badge>
              ) : (
                <Badge variant="outline">Not Checked In</Badge>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display">{streak} days 🔥</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-display">
                {records?.filter((r) => new Date(r.check_in).getMonth() === new Date().getMonth()).length || 0} visits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Check In/Out Button */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            {!todayRecord ? (
              <Button size="lg" className="text-lg px-12 py-6" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                <LogIn className="h-5 w-5 mr-2" /> Check In
              </Button>
            ) : isCheckedIn ? (
              <Button size="lg" variant="outline" className="text-lg px-12 py-6" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                <LogOut className="h-5 w-5 mr-2" /> Check Out
              </Button>
            ) : (
              <p className="text-muted-foreground">✅ You've completed your session today!</p>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Recent History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records?.map((r) => {
                  const ci = new Date(r.check_in);
                  const co = r.check_out ? new Date(r.check_out) : null;
                  const duration = co ? Math.round((co.getTime() - ci.getTime()) / 60000) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{format(ci, "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(ci, "hh:mm a")}</TableCell>
                      <TableCell>{co ? format(co, "hh:mm a") : "—"}</TableCell>
                      <TableCell>{duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
                {!records?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No attendance records yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AdminAttendance() {
  const { data: todayRecords } = useQuery({
    queryKey: ["admin-attendance-today"],
    queryFn: async () => {
      const todayStart = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in", todayStart)
        .order("check_in", { ascending: false });
      if (error) throw error;

      if (!data?.length) return [];
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      return data.map((a) => ({
        ...a,
        full_name: profiles?.find((p) => p.user_id === a.user_id)?.full_name || "Unknown",
      }));
    },
  });

  const checkedInNow = todayRecords?.filter((r) => !r.check_out).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">Attendance</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Currently In Gym</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{checkedInNow}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Check-ins</CardTitle>
              <CalendarCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{todayRecords?.length || 0}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Today's Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayRecords?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{format(new Date(r.check_in), "hh:mm a")}</TableCell>
                    <TableCell>{r.check_out ? format(new Date(r.check_out), "hh:mm a") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.check_out ? "secondary" : "default"}>{r.check_out ? "Completed" : "In Gym"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!todayRecords?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No check-ins today.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default Attendance;
