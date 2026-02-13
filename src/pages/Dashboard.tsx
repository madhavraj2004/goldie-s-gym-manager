import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, CreditCard, CalendarCheck } from "lucide-react";

const statCards = [
  { title: "Active Members", value: "—", icon: Users },
  { title: "Trainers", value: "—", icon: Dumbbell },
  { title: "Monthly Revenue", value: "—", icon: CreditCard },
  { title: "Today's Check-ins", value: "—", icon: CalendarCheck },
];

const Dashboard = () => {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-bold">
          {role === "admin" ? "Admin" : role === "trainer" ? "Trainer" : "Member"} Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => (
            <Card key={s.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                <s.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-display">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Dashboard analytics will be populated as data is added.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
