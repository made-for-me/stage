import { opsRequest } from "@/ops/client";
import { Button, C, Card, Copy, Label } from "@/ops/ui";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
export default function Devices() {
  const [hub, setHub] = useState<{ status: string; url: string | null } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    opsRequest<{ status: string; url: string | null }>(
      "/api/ops/devices",
      undefined,
      controller.signal,
    )
      .then(setHub)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24, gap: 24 }}
    >
      <Label>Device workspace</Label>
      <Copy size={31}>See the app running.</Copy>
      <Card>
        <Copy size={22}>Expo Device Hub</Copy>
        <Copy muted>
          {error ||
            (hub?.status === "connected"
              ? "Your device host is connected. Open its dashboard to view and control simulators."
              : hub?.status === "offline"
                ? "The device host is offline."
                : hub
                  ? "Connect a device host to see the running app."
                  : "Checking connection…")}
        </Copy>
        {hub?.url ? (
          <Button
            title="Open Device Hub ↗"
            onPress={() => {
              void WebBrowser.openBrowserAsync(hub.url as string).catch(() =>
                setError("Could not open Device Hub."),
              );
            }}
          />
        ) : (
          <Copy muted size={13}>
            Configure STAGE_DEVICE_HUB_URL on the Stage host. iOS simulators run on your Mac with
            Xcode.
          </Copy>
        )}
      </Card>
    </ScrollView>
  );
}
