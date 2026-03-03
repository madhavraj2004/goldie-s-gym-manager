import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, LogIn, LogOut, Flame, Clock, Users, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isToday } from "date-fns";
import { isInsideGym, getDistanceFromGym, getCurrentPosition } from "@/lib/geofence";

const Attendance = () => {
  const { role, user } = useAuth();
  if (role === "admin") return <AdminAttendance />;
  return <MemberAttendance userId={user?.id} />;
};

function MemberAttendance({ userId }: { userId?: string }) {
  const qc = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  const streak = (() => {
    if (!records?.length) return 0;
    let count = 0;
    const uniqueDays = [...new Set(records.map((r) => format(new Date(r.check_in), "yyyy-MM-dd")))].sort().reverse();
    const today = format(new Date(), "yyyy-MM-dd");
    if (uniqueDays[0] !== today) return 0;
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = format(new Date(Date.now() - i * 86400000), "yyyy-MM-dd");
      if (uniqueDays[i] === expected) count++;
      else break;
    }
    return count;
  })();

  const verifyLocationAndExecute = async (action: () => Promise<void>) => {
    setLocating(true);
    setLocationError(null);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      if (!isInsideGym(latitude, longitude)) {
        const distance = getDistanceFromGym(latitude, longitude);
        throw new Error(`You are ${distance}m away from the gym. Please be within 20m to check in.`);
      }
      await action();
    } catch (err: any) {
      if (err.code === 1) {
        setLocationError("Location permission denied. Please enable GPS access.");
      } else if (err.code === 2) {
        setLocationError("Unable to determine your location. Please try again.");
      } else if (err.code === 3) {
        setLocationError("Location request timed out. Please try again.");
      } else {
        setLocationError(err.message);
      }
      toast.error(err.message || "Location verification failed");
    } finally {
      setLocating(false);
    }
  };

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

  const handleCheckIn = () => verifyLocationAndExecute(() => checkIn.mutateAsync());
  const handleCheckOut = () => verifyLocationAndExecute(() => checkOut.mutateAsync());

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

        {/* Geo-fenced Check In/Out */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> GPS verification required — must be inside the gym
            </div>
            {locationError && (
              <p className="text-sm text-destructive text-center max-w-md">{locationError}</p>
            )}
            {!todayRecord ? (
              <Button size="lg" className="text-lg px-12 py-6" onClick={handleCheckIn} disabled={locating || checkIn.isPending}>
                {locating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <LogIn className="h-5 w-5 mr-2" />}
                {locating ? "Verifying Location..." : "Check In"}
              </Button>
            ) : isCheckedIn ? (
              <Button size="lg" variant="outline" className="text-lg px-12 py-6" onClick={handleCheckOut} disabled={locating || checkOut.isPending}>
                {locating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <LogOut className="h-5 w-5 mr-2" />}
                {locating ? "Verifying Location..." : "Check Out"}
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
  const [dateFrom, setDateFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: records, isLoading } = useQuery({
    queryKey: ["admin-attendance", dateFrom, dateTo],
    queryFn: async () => {
      const from = startOfDay(new Date(dateFrom)).toISOString();
      const to = endOfDay(new Date(dateTo)).toISOString();
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .gte("check_in", from)
        .lte("check_in", to)
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

  const checkedInNow = records?.filter((r) => isToday(new Date(r.check_in)) && !r.check_out).length || 0;
  const todayCount = records?.filter((r) => isToday(new Date(r.check_in))).length || 0;

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
            <CardContent><p className="text-2xl font-bold font-display">{todayCount}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Results</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold font-display">{records?.length || 0}</p></CardContent>
          </Card>
        </div>

        {/* Date Filters */}
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Filter by Date</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <Button variant="outline" onClick={() => { const t = format(new Date(), "yyyy-MM-dd"); setDateFrom(t); setDateTo(t); }}>
                Today
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Attendance Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : records?.length ? (
                  records.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell>{format(new Date(r.check_in), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(r.check_in), "hh:mm a")}</TableCell>
                      <TableCell>{r.check_out ? format(new Date(r.check_out), "hh:mm a") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={r.check_out ? "secondary" : "default"}>{r.check_out ? "Completed" : "In Gym"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records found for this period.</TableCell></TableRow>
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
