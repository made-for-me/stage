export async function deviceHubStatus() {
  const configured = process.env.STAGE_DEVICE_HUB_URL;
  if (!configured) return { status: "unconfigured", url: null, devices: null };
  try {
    const url = new URL(configured);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Invalid Device Hub address.");
    const base = url.href.replace(/\/$/, "");
    const response = await fetch(`${base}/api/devices`, {
      signal: AbortSignal.timeout(2500),
      redirect: "error",
    });
    if (!response.ok) throw new Error("Device Hub is unavailable.");
    const devices: unknown = await response.json();
    if (!devices || typeof devices !== "object") throw new Error("Invalid Device Hub response.");
    return { status: "connected", url: base, devices };
  } catch {
    return { status: "offline", url: null, devices: null };
  }
}
