import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

export function initSWUpdate() {
  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker?.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
    return;
  }

  const updateSW = registerSW({
    onNeedRefresh() {
      toast("App update available!", {
        description: "A new version is ready. Tap to update now.",
        duration: Infinity,
        action: {
          label: "Update",
          onClick: () => updateSW(true),
        },
      });
    },
    onOfflineReady() {
      toast.success("App ready for offline use");
    },
  });
}
