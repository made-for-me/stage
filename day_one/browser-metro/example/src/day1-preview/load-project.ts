export interface Day1Manifest {
  projectRoot: string;
  entryPath: string;
  screenPath: string;
  assetRoots: string[];
  warnings: string[];
  shimMap: Record<string, string>;
  files: Record<string, string>;
}

const DEFAULT_PREVIEW_SERVER_ORIGIN = "http://localhost:5211";

export function getPreviewServerOrigin(): string {
  return import.meta.env.VITE_PREVIEW_SERVER_ORIGIN || DEFAULT_PREVIEW_SERVER_ORIGIN;
}

export async function loadProjectManifest(): Promise<Day1Manifest> {
  const response = await fetch(`${getPreviewServerOrigin()}/manifest`);
  if (!response.ok) {
    throw new Error(`Failed to load manifest (${response.status})`);
  }
  return response.json() as Promise<Day1Manifest>;
}