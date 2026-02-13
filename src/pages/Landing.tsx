import { Link } from "react-router-dom";
import { Dumbbell, Users, BarChart3, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Users, title: "Member Management", desc: "Track profiles, fitness data, and progress" },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Revenue, attendance, and performance insights" },
  { icon: Shield, title: "Role-Based Access", desc: "Admin, Trainer, and Member dashboards" },
  { icon: Dumbbell, title: "Training Tools", desc: "Milestones, goals, and workout tracking" },
];

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Hero */}
    <header className="border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="font-display text-xl font-bold text-primary tracking-wider">GOLDIE'S GYM</span>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
          <Button asChild><Link to="/register">Sign Up</Link></Button>
        </div>
      </div>
    </header>

    <section className="container mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-5xl md:text-7xl font-bold text-primary mb-6 tracking-tight">
        SMART GYM<br />MANAGEMENT
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
        The all-in-one platform for managing members, trainers, payments, and progress at Goldie's Gym.
      </p>
      <div className="flex gap-4 justify-center">
        <Button size="lg" asChild><Link to="/register">Get Started</Link></Button>
        <Button size="lg" variant="outline" asChild><Link to="/login">Sign In</Link></Button>
      </div>
    </section>

    {/* Features */}
    <section className="container mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => (
          <div key={f.title} className="p-6 rounded-lg bg-card border border-border">
            <f.icon className="h-10 w-10 text-primary mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
      © 2026 Goldie's Gym. All rights reserved.
    </footer>
  </div>
);

export default Landing;
