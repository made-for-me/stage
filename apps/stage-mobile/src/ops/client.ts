import * as SecureStore from "expo-secure-store";
import { runtimeConfig } from "../runtime-config";
export type Connection = { url: string; token: string };
let webConnection: Connection | null = null;
export async function getConnection(): Promise<Connection> {
  if (process.env.EXPO_OS === "web")
    return webConnection ?? { url: runtimeConfig().apiUrl ?? "", token: "" };
  const saved = await SecureStore.getItemAsync("stage.ops.connection");
  return saved ? JSON.parse(saved) : { url: runtimeConfig().apiUrl ?? "", token: "" };
}
export async function saveConnection(connection: Connection) {
  const url = new URL(connection.url);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Use your Stage host’s HTTP or HTTPS address.");
  const clean = { url: url.origin, token: connection.token.trim() };
  if (process.env.EXPO_OS === "web") webConnection = clean;
  else await SecureStore.setItemAsync("stage.ops.connection", JSON.stringify(clean));
}
export async function opsRequest<T>(
  pathname: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const connection = await getConnection();
  if (!connection.url)
    throw new Error("Connect your Stage host to load quests and agent activity.");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(new URL(pathname, connection.url), {
      method: body ? "POST" : "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? `Stage returned ${response.status}.`);
    return result;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
export type OpsQuest = {
  id: string;
  title: string;
  objective: string;
  criteria: string[];
  projectId: string;
  branch: string;
  assignedTo: string;
  status: string;
  stalled: boolean;
  evidence: { summary: string; sha: string; sceneIds: string[] } | null;
  events: { id: string; at: string; actor: string; message: string }[];
};
export type OpsSnapshot = {
  quests: OpsQuest[];
  agents: { id: string; online: boolean; seenAt: number }[];
  branches: { projectId: string; name: string; sha: string | null }[];
  scenes: { id: string; title: string; imageUrl: string }[];
  agentConfigured: boolean;
};
export const statusLabel: Record<string, string> = {
  queued: "Waiting for agent",
  running: "In progress",
  blocked: "Needs your help",
  review: "Ready for review",
  done: "Accepted",
  cancelled: "Cancelled",
};
