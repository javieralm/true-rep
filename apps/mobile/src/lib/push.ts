import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "@/lib/api";

/** Pide permiso, obtiene el token Expo y lo registra en el backend. Silencioso si falla. */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simuladores no reciben push

    const { status: existing } = await Notifications.getPermissionsAsync();
    const status =
      existing === "granted" ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Recordatorios",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await api("/me/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS === "ios" ? "ios" : "android" }),
    });

    // Sincroniza la timezone del dispositivo para que los recordatorios lleguen a la hora local
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      await api("/me/preferences", { method: "PATCH", body: JSON.stringify({ timezone }) });
    }
  } catch (e) {
    // El push es best-effort: nunca bloquea el arranque de la app
    console.warn("Push registration failed:", e);
  }
}
