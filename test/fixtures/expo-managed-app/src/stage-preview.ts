type StagePreviewContext = {
  route: string;
  routeTitle: string;
  variant: string;
  previewMode: string;
  params: Record<string, string>;
  mockData: Record<string, unknown>;
  notes?: string | null;
};

export function readStagePreviewContext(): StagePreviewContext {
  const globalContext = globalThis as typeof globalThis & {
    __STAGE_PREVIEW_CONTEXT__?: StagePreviewContext;
  };

  return (
    globalContext.__STAGE_PREVIEW_CONTEXT__ ?? {
      route: "app/index.tsx",
      routeTitle: "index",
      variant: "default",
      previewMode: "ios-preview",
      params: {},
      mockData: {},
      notes: null,
    }
  );
}
