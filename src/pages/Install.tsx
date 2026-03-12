import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle, Share } from "lucide-react";
import { Link } from "react-router-dom";
import gymLogo from "@/assets/goldie-gym-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-4">
          <img src={gymLogo} alt="Goldie's Gym" className="h-16 mx-auto" />
          <CardTitle className="font-display text-2xl">Install Goldie's Gym</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {installed ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <p className="text-lg font-medium">App Installed!</p>
              <p className="text-sm text-muted-foreground">
                You can now open Goldie's Gym from your home screen.
              </p>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4 text-center">
              <Smartphone className="h-16 w-16 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Install Goldie's Gym on your device for quick access, offline support, and a native app experience.
              </p>
              <Button className="w-full" size="lg" onClick={handleInstall}>
                <Download className="h-5 w-5 mr-2" /> Install App
              </Button>
            </div>
          ) : isIOS ? (
            <div className="space-y-4 text-center">
              <Share className="h-16 w-16 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                To install on iOS: tap the <strong>Share</strong> button in Safari, then select <strong>"Add to Home Screen"</strong>.
              </p>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <Smartphone className="h-16 w-16 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Open this page in your mobile browser to install the app, or use the browser menu to "Add to Home Screen".
              </p>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link to="/" className="text-sm text-primary hover:underline">
              ← Back to app
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
