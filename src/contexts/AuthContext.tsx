import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initPushNotifications, removePushListeners } from "@/lib/pushNotifications";

type AppRole = "admin" | "trainer" | "member";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(() => {
    const cached = localStorage.getItem("cached_role");
    return cached ? (cached as AppRole) : null;
  });
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    // Safety timeout
    const timeout = setTimeout(() => setLoading(false), 3000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // Set session/user synchronously — never block with await
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use cached role to stop loading immediately, then verify in background
          const cachedRole = localStorage.getItem("cached_role") as AppRole | null;
          if (cachedRole && !initialized.current) {
            setRole(cachedRole);
            setLoading(false);
            initialized.current = true;
          }

          // Fetch fresh role in background (non-blocking)
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", newSession.user.id)
            .maybeSingle()
            .then(({ data }) => {
              const freshRole = (data?.role as AppRole) ?? "member";
              setRole(freshRole);
              localStorage.setItem("cached_role", freshRole);
              setLoading(false);
              initialized.current = true;
            });

          // Init push in background
          initPushNotifications(newSession.user.id);
        } else {
          removePushListeners();
          setRole(null);
          localStorage.removeItem("cached_role");
          setLoading(false);
          initialized.current = true;
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await removePushListeners();
      setSession(null);
      setUser(null);
      setRole(null);
      localStorage.removeItem("cached_role");
      initialized.current = false;
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      setSession(null);
      setUser(null);
      setRole(null);
      localStorage.removeItem("cached_role");
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
