import { runStageCli } from "../src/cli.js";

void runStageCli(["dev", ...process.argv.slice(2)]).then((code) => {
  if (code !== 0) {
    process.exitCode = code;
  }
});
