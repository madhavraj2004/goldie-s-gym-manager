import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

const Payments = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Payments</h1>
      <Card><CardContent className="pt-6 text-center text-muted-foreground">Payment tracking coming soon.</CardContent></Card>
    </div>
  </DashboardLayout>
);

export default Payments;
