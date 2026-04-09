/// <reference lib="webworker" />

import {
  Bundler,
  VirtualFS,
  typescriptTransformer,
  createDataBxPathPlugin,
} from "browser-metro";
import type { BundlerConfig, BundlerPlugin, FileMap } from "browser-metro";
import { expoWebPlugin } from "../plugins/expo-web";

type PreviewBundleRequest = {
  entryPath: string;
  files: FileMap;
  shimMap: Record<string, string>;
  packageServerUrl: string;
};

type PreviewBundleResponse =
  | { ok: true; code: string }
  | { ok: false; error: string };

const dataBxPathPlugin = createDataBxPathPlugin();

function createPreviewResolvePlugin(shimMap: Record<string, string>): BundlerPlugin {
  return {
    name: "day1-preview-resolve",
    resolveRequest(_context, moduleName) {
      const shimTarget = shimMap[moduleName];
      if (shimTarget) return shimTarget;
      if (moduleName.startsWith("/project/")) return moduleName;
      if (moduleName.startsWith("/__preview__/")) return moduleName;
      return null;
    },
  };
}

async function bundlePreview(req: PreviewBundleRequest): Promise<string> {
  const vfs = new VirtualFS(req.files);
  const config: BundlerConfig = {
    resolver: {
      sourceExts: [
        "web.ts",
        "web.tsx",
        "web.js",
        "web.jsx",
        "ts",
        "tsx",
        "js",
        "jsx",
      ],
    },
    transformer: typescriptTransformer,
    server: {
      packageServerUrl: req.packageServerUrl,
    },
    plugins: [
      dataBxPathPlugin,
      expoWebPlugin,
      createPreviewResolvePlugin(req.shimMap),
    ],
    env: {},
  };
  const bundler = new Bundler(vfs, config);
  return bundler.bundle(req.entryPath);
}

self.onmessage = async (event: MessageEvent<PreviewBundleRequest>) => {
  try {
    const code = await bundlePreview(event.data);
    const response: PreviewBundleResponse = { ok: true, code };
    self.postMessage(response);
  } catch (error) {
    const response: PreviewBundleResponse = {
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    };
    self.postMessage(response);
  }
};

export {};