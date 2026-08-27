const required = ["STAGE_EAS_PROJECT_ID"];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing release configuration: ${missing.join(", ")}`);
  console.error("Run `eas init` for Stage and export the resulting project id before building.");
  process.exit(1);
}

if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(process.env.STAGE_EAS_PROJECT_ID)) {
  console.error("STAGE_EAS_PROJECT_ID must be an EAS project UUID.");
  process.exit(1);
}

console.log("Stage TestFlight configuration is present.");
