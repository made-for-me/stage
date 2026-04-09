import type { PreviewTarget } from "../types/index.js";

/**
 * Local filesystem / workspace input. Future: resolve app entry, metro config hints, etc.
 */
export function createLocalPreviewTarget(cwd: string): PreviewTarget {
  return { label: `local:${cwd}` };
}
