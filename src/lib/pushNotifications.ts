import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications only available on native platforms");
    return;
  }

  // Request permission
  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") {
    console.warn("Push notification permission not granted");
    return;
  }

  // Register with the native push notification service
  await PushNotifications.register();

  // Listen for registration success
  PushNotifications.addListener("registration", async (token) => {
    console.log("Push registration token:", token.value);
    // Store the token in the database for this user
    try {
      const { error } = await supabase
        .from("push_tokens" as any)
        .upsert(
          { user_id: userId, token: token.value, platform: Capacitor.getPlatform() },
          { onConflict: "user_id" }
        );
      if (error) console.error("Failed to save push token:", error);
    } catch (err) {
      console.error("Error saving push token:", err);
    }
  });

  // Listen for registration errors
  PushNotifications.addListener("registrationError", (error) => {
    console.error("Push registration error:", error);
  });

  // Show notification in system tray when app is in foreground
  PushNotifications.addListener("pushNotificationReceived", async (notification) => {
    console.log("Push notification received:", notification);
    await LocalNotifications.schedule({
      notifications: [
        {
          title: notification.title || "Goldie's Gym",
          body: notification.body || "",
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: undefined,
          smallIcon: "ic_launcher",
        },
      ],
    });
  });

  // Handle notification tap (opens the app)
  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    console.log("Push notification action:", action);
  });
};

export const removePushListeners = async () => {
  if (!Capacitor.isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
};
