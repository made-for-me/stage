import type { FileMap } from "browser-metro";
import type { Day1Manifest } from "./load-project";

export interface PreviewWorkerInput {
  entryPath: string;
  files: FileMap;
  shimMap: Record<string, string>;
  packageServerUrl: string;
}

export function makeVfs(
  manifest: Day1Manifest,
  packageServerUrl: string,
): PreviewWorkerInput {
  const files: FileMap = {};
  for (const [path, content] of Object.entries(manifest.files)) {
    files[path] = { content, isExternal: false };
  }
  return {
    entryPath: manifest.entryPath,
    files,
    shimMap: manifest.shimMap,
    packageServerUrl,
  };
}