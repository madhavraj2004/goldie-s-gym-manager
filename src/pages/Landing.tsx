import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Users, BarChart3, Shield, Dumbbell, CalendarCheck, Trophy, Clock, MapPin, Phone, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import gymLogo from "@/assets/goldie-gym-logo.png";
import gymHero from "@/assets/gym-hero.jpeg";
import carousel1 from "@/assets/carousel-1.jpg";
import carousel2 from "@/assets/carousel-2.jpg";
import carousel3 from "@/assets/carousel-3.jpg";

const slides = [
  { img: gymHero, title: "EARN YOUR GOLD", subtitle: "Premium strength & conditioning training" },
  { img: carousel1, title: "WORLD-CLASS EQUIPMENT", subtitle: "State-of-the-art machines & free weights" },
  { img: carousel2, title: "EXPERT TRAINERS", subtitle: "Certified personal training for every goal" },
  { img: carousel3, title: "GROUP FITNESS", subtitle: "High-energy classes for all fitness levels" },
];

const features = [
  { icon: Users, title: "Member Management", desc: "Track profiles, fitness data, and progress for every member" },
  { icon: BarChart3, title: "Analytics & Reports", desc: "Revenue, attendance, and performance insights at a glance" },
  { icon: Shield, title: "Role-Based Access", desc: "Separate dashboards for Admin, Trainers, and Members" },
  { icon: Dumbbell, title: "Personal Training", desc: "1-on-1 coaching with certified trainers tailored to your goals" },
  { icon: CalendarCheck, title: "Attendance Tracking", desc: "Daily check-ins, streaks, and attendance history" },
  { icon: Trophy, title: "Milestones & Goals", desc: "Celebrate achievements and track fitness milestones" },
];

const gymTimings = [
  { day: "Monday – Friday", time: "5:00 AM – 11:00 PM" },
  { day: "Saturday", time: "6:00 AM – 10:00 PM" },
  { day: "Sunday", time: "7:00 AM – 8:00 PM" },
];

const testimonials = [
  { name: "Raj M.", text: "Goldie's Gym transformed my fitness journey. The trainers are incredibly supportive!", rating: 5 },
  { name: "Priya S.", text: "Best gym in town! Premium equipment and the black & gold vibe keeps me motivated.", rating: 5 },
  { name: "Arjun K.", text: "The personal training sessions helped me lose 15kg in 4 months. Highly recommend!", rating: 5 },
];

const Landing = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-3 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={gymLogo} alt="Goldie's Gym" className="h-12 w-auto" />
            <span className="font-display text-xl font-bold text-primary tracking-wider hidden sm:inline">GOLDIE'S GYM</span>
          </Link>
          <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" size="sm" asChild><Link to="/login">Member Login</Link></Button>
            <Button variant="ghost" size="sm" asChild><Link to="/login">Trainer Login</Link></Button>
            <Button size="sm" asChild><Link to="/register">Join Now</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero Carousel */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: current === i ? 1 : 0 }}
          >
            <img src={slide.img} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <img src={gymLogo} alt="Goldie's Gym" className="h-24 w-auto mb-6 drop-shadow-2xl" />
          <h1 className="font-display text-5xl md:text-7xl font-bold text-primary mb-3 tracking-tight drop-shadow-lg">
            GOLDIE'S GYM
          </h1>
          <p className="font-display text-2xl md:text-3xl text-foreground mb-2 tracking-wide">
            {slides[current].title}
          </p>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            {slides[current].subtitle}
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="text-lg px-8" asChild><Link to="/register">Start Your Journey</Link></Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild><Link to="/login">Sign In</Link></Button>
          </div>
        </div>
        {/* Carousel dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${current === i ? "bg-primary w-8" : "bg-foreground/30"}`}
            />
          ))}
        </div>
        {/* Nav arrows */}
        <button onClick={() => setCurrent((current - 1 + slides.length) % slides.length)} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 rounded-full p-2 transition-colors">
          <ChevronLeft className="h-6 w-6 text-primary" />
        </button>
        <button onClick={() => setCurrent((current + 1) % slides.length)} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/50 hover:bg-background/80 rounded-full p-2 transition-colors">
          <ChevronRight className="h-6 w-6 text-primary" />
        </button>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="font-display text-4xl font-bold text-center mb-4 text-primary">What We Offer</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Everything you need for your fitness transformation, all under one roof at Goldie's Gym.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 group">
              <f.icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-card/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-4xl font-bold text-center mb-12 text-primary">What Our Members Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="p-6 rounded-xl bg-card border border-border">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
                <p className="font-display font-semibold text-foreground">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gym Info */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-4xl font-bold mb-6 text-primary">Visit Us</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Goldie's Gym</p>
                  <p className="text-sm text-muted-foreground">123 Fitness Avenue, Gold District</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Contact</p>
                  <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold mb-6 text-primary flex items-center gap-2">
              <Clock className="h-8 w-8" /> Timings
            </h2>
            <div className="space-y-3">
              {gymTimings.map((t) => (
                <div key={t.day} className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-medium">{t.day}</span>
                  <span className="text-primary font-display">{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl font-bold mb-4 text-primary">Ready to Earn Your Gold?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join Goldie's Gym today and start your transformation. First week free for new members!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="text-lg px-8" asChild><Link to="/register">Sign Up Now</Link></Button>
            <Button size="lg" variant="outline" className="text-lg px-8" asChild><Link to="/login">Already a Member?</Link></Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Goldie's Gym. All rights reserved. | Earn Your Gold 💪
      </footer>
    </div>
  );
};

export default Landing;
