#!/usr/bin/env node
import { startServer } from "./server";

function getArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const projectRoot = getArg("--project");
  const screen = getArg("--screen") ?? "app/(auth)/welcome.tsx";
  const port = Number(getArg("--port") ?? "5211");

  if (!projectRoot) {
    throw new Error("Missing --project /absolute/path/to/clubhall/apps/mobile");
  }

  await startServer({
    projectRoot,
    screen,
    port,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});