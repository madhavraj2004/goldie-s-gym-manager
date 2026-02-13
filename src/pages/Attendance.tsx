import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

const Attendance = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Attendance</h1>
      <Card><CardContent className="pt-6 text-center text-muted-foreground">Attendance tracking coming soon.</CardContent></Card>
    </div>
  </DashboardLayout>
);

export default Attendance;
