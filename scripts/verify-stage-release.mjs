const projectId =
  process.env.STAGE_EAS_PROJECT_ID ?? "350f40bc-c260-4c04-a3b3-f86571fbbefd";

if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(projectId)) {
  console.error("STAGE_EAS_PROJECT_ID must be an EAS project UUID.");
  process.exit(1);
}

console.log("Stage TestFlight configuration is present.");
