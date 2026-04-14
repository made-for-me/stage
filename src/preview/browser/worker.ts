/// <reference lib="webworker" />

import {
  Bundler,
  type BundlerConfig,
  type BundlerPlugin,
  type FileMap,
  VirtualFS,
  createDataBxPathPlugin,
  typescriptTransformer,
} from "browser-metro";
import type { PreviewPathAlias } from "../../types/index.js";

type PreviewBundleRequest = {
  entryPath: string;
  files: Record<string, string>;
  shimMap: Record<string, string>;
  pathAliases: PreviewPathAlias[];
  packageServerUrl: string;
  assetPublicPath: string;
};

type PreviewBundleResponse = { ok: true; code: string } | { ok: false; error: string };

const dataBxPathPlugin = createDataBxPathPlugin();

self.onmessage = async (event: MessageEvent<PreviewBundleRequest>) => {
  try {
    const code = await bundlePreview(event.data);
    const response: PreviewBundleResponse = { ok: true, code };
    self.postMessage(response);
  } catch (error) {
    const response: PreviewBundleResponse = {
      ok: false,
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    };
    self.postMessage(response);
  }
};

async function bundlePreview(request: PreviewBundleRequest): Promise<string> {
  const files: FileMap = Object.fromEntries(
    Object.entries(request.files).map(([filePath, content]) => {
      return [filePath, { content, isExternal: false }];
    }),
  );

  const bundler = new Bundler(new VirtualFS(files), createBundlerConfig(request));
  return bundler.bundle(request.entryPath);
}

function createBundlerConfig(request: PreviewBundleRequest): BundlerConfig {
  return {
    resolver: {
      sourceExts: ["web.ts", "web.tsx", "web.js", "web.jsx", "ts", "tsx", "js", "jsx"],
    },
    transformer: typescriptTransformer,
    server: {
      packageServerUrl: request.packageServerUrl,
    },
    plugins: [dataBxPathPlugin, createPreviewResolvePlugin(request.shimMap, request.pathAliases)],
    assetPublicPath: request.assetPublicPath,
    env: {},
  };
}

function createPreviewResolvePlugin(
  shimMap: Record<string, string>,
  pathAliases: PreviewPathAlias[],
): BundlerPlugin {
  return {
    name: "stage-preview-resolve",
    resolveRequest(_context, moduleName) {
      const shimTarget = shimMap[moduleName];

      if (shimTarget) {
        return shimTarget;
      }

      if (moduleName.startsWith("/project/") || moduleName.startsWith("/__stage__/")) {
        return moduleName;
      }

      for (const alias of pathAliases) {
        if (alias.exact) {
          if (moduleName === alias.find) {
            return alias.replacement;
          }
          continue;
        }

        if (moduleName.startsWith(alias.find)) {
          return `${alias.replacement}${moduleName.slice(alias.find.length)}`;
        }
      }

      return null;
    },
  };
}
