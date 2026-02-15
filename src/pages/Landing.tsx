import { Link } from "react-router-dom";
import { Users, BarChart3, Shield, Dumbbell, CalendarCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import gymLogo from "@/assets/goldie-gym-logo.png";

const features = [
  { icon: Users, title: "Member Management", desc: "Track profiles, fitness data, and progress for every member" },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Revenue, attendance, and performance insights at a glance" },
  { icon: Shield, title: "Role-Based Access", desc: "Separate dashboards for Admin, Trainers, and Members" },
  { icon: Dumbbell, title: "Training Tools", desc: "Assign trainers, set goals, and monitor workouts" },
  { icon: CalendarCheck, title: "Attendance Tracking", desc: "Daily check-ins, streaks, and attendance history" },
  { icon: Trophy, title: "Milestones & Goals", desc: "Celebrate achievements and track fitness milestones" },
];

const Landing = () => (
  <div className="min-h-screen bg-background">
    {/* Header */}
    <header className="border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <Link to="/" className="flex items-center gap-3">
          <img src={gymLogo} alt="Goldie's Gym" className="h-12 w-auto" />
          <span className="font-display text-xl font-bold text-primary tracking-wider">GOLDIE'S GYM</span>
        </Link>
        <div className="flex gap-3">
          <Button variant="ghost" asChild><Link to="/login">Login</Link></Button>
          <Button asChild><Link to="/register">Sign Up</Link></Button>
        </div>
      </div>
    </header>

    {/* Hero */}
    <section className="container mx-auto px-4 py-24 text-center">
      <div className="flex justify-center mb-8">
        <img src={gymLogo} alt="Goldie's Gym" className="h-28 w-auto" />
      </div>
      <h1 className="font-display text-5xl md:text-7xl font-bold text-primary mb-6 tracking-tight">
        GOLDIE'S GYM
      </h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
        Premium Fitness Management
      </p>
      <p className="text-base text-muted-foreground max-w-xl mx-auto mb-10">
        The complete management system for Goldie's Gym — manage members, track attendance, assign trainers, and monitor progress all in one place.
      </p>
      <div className="flex gap-4 justify-center">
        <Button size="lg" asChild><Link to="/register">Join Now</Link></Button>
        <Button size="lg" variant="outline" asChild><Link to="/login">Member Login</Link></Button>
      </div>
    </section>

    {/* Features */}
    <section className="container mx-auto px-4 py-16">
      <h2 className="font-display text-3xl font-bold text-center mb-10 text-primary">What We Offer</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div key={f.title} className="p-6 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
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
