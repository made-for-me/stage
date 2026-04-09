import type { PreviewTarget } from "../types/index.js";

/**
 * Pure preview pipeline orchestration (no I/O). Framework-specific wiring lives in adapters.
 */
export function describePreviewPipeline(target: PreviewTarget): string {
  return `preview:${target.label}`;
}
