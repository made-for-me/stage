import { getConnection, opsRequest, saveConnection } from "@/ops/client";
import { Button, C, Copy, Field } from "@/ops/ui";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
export default function Connect() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getConnection()
      .then((c) => {
        setUrl(c.url);
        setToken(c.token);
      })
      .catch(() => setError("Could not read the saved connection."));
  }, []);
  async function connect() {
    setBusy(true);
    setError("");
    try {
      await saveConnection({ url, token });
      await opsRequest("/api/ops");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24, gap: 22 }}
    >
      <Copy size={27}>One shared workspace.</Copy>
      <Copy muted>
        Connect to the Stage host your agents use. On your phone, use the host’s reachable address.
      </Copy>
      <Field
        label="Stage host address"
        value={url}
        onChangeText={setUrl}
        placeholder="https://your-stage-host"
      />
      <Field label="Operator token" value={token} onChangeText={setToken} secure />
      <Copy muted size={12}>
        Your token is stored securely on this device. Use the operator token configured on the Stage
        host.
      </Copy>
      {!!error && <Copy>{error}</Copy>}
      <Button
        title={busy ? "Connecting…" : "Connect"}
        disabled={busy || !url.trim()}
        onPress={() => void connect()}
      />
    </ScrollView>
  );
}
