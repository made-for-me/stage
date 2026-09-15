import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

export type OpsPrincipal = "operator" | "agent";
function matches(value: string, expected?: string) {
  return Boolean(
    expected &&
      Buffer.byteLength(value) === Buffer.byteLength(expected) &&
      timingSafeEqual(Buffer.from(value), Buffer.from(expected)),
  );
}
export function opsPrincipal(req: IncomingMessage): OpsPrincipal | null {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.replace(/^Bearer /, "");
    if (matches(token, process.env.STAGE_OPERATOR_TOKEN)) return "operator";
    if (matches(token, process.env.STAGE_AGENT_TOKEN)) return "agent";
    return null;
  }
  // Only the local operator gets implicit trust. Remote phones/workers must pair.
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "");
  const host = req.headers.host ?? "";
  if (!local || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) return null;
  if (req.headers["sec-fetch-site"] === "cross-site") return null;
  if (req.headers.origin && req.headers.origin !== `http://${host}`) return null;
  return "operator";
}
