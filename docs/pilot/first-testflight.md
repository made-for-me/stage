# First TestFlight: shell + one ClubHall OTA preview

## Current release — September 10, 2026

The earlier preparation notes below are historical. The current Stage store channel is `preview`,
with runtime `stage-clubhall-sdk57-v1` and App Store Connect app ID `6810529779`.

- Supervisor source pushed to `ar2/stage-testflight-branch-previews`, commit
  `3d8830e4b44c847b69a9c5e2a9907a223d091baa`; GitHub CI passed.
- iOS OTA update published to `preview`: group `6c0a20e1-7341-43a8-8b8b-27220fde8b70`,
  update `01a08c18-988c-7bde-a6b1-060b330d4e25`. The public update endpoint returned this exact
  update for the Stage iOS runtime and channel.
- Native build **0.1.0 (7)** completed successfully:
  https://expo.dev/accounts/madeforme/projects/stage-mobile/builds/e3ffdec6-0ad4-452f-8960-188ce54e1994
- Automatic submission scheduled for that exact build:
  https://expo.dev/accounts/madeforme/projects/stage-mobile/submissions/1b9c592b-6760-417b-9a57-00803daa74cc
  Last checked at 16:21 UTC: `IN_QUEUE`. This is not confirmation of Apple processing or tester availability.
- Existing compatible installs can receive the supervisor OTA after a cold launch and download;
  another launch may be needed to apply it. Actual iPhone receipt and the ClubHall round-trip still
  require on-device verification.

Run release commands from `apps/stage-mobile`. The untracked root `app.json` points to a different
EAS project and is not part of this release.

Target: install Stage, open one SHA-pinned ClubHall preview, then return to Stage without reinstalling.

## Verified locally in this preparation

- PR #3 base: c44a9cd9c4fc3edb7eaf9122f73f315a56c94ff7; not merged into main.
- Fixed the two formatting failures reported by CI.
- Separated build, submit and shell-update commands; EAS CLI no longer needs a global install.
- Added an overlay action to return to the `stage-shell` update channel.
- Project UUID validation now explicitly states that account access and signing remain unverified.

The candidate is `recovery/canonical-mainline-20260902`. Its package manifest uses Expo ~57.0.11,
React Native 0.86.2 and React 19.2.3, matching Stage. This is NOT complete native compatibility
validation. A fixed runtimeVersion string only declares compatibility; EAS cannot prove that all
native modules match from that string. The existing publisher checks only Expo major version.

## Before publishing

1. Authenticate directly with Expo using `pnpm dlx eas-cli@latest login`. Do not paste tokens,
   passwords or Apple key files into chat. Keep EXPO_TOKEN in a secret store when using CI.
2. From `apps/stage-mobile`, run `pnpm dlx eas-cli@latest project:info`. Verify the configured
   UUID belongs to `madeforme/stage-mobile`, not ClubHall. Do not create another project blindly.
3. In Apple Developer / App Store Connect, verify the Stage app record and bundle ID
   `com.madeforme.stage`. Add its numeric Apple app ID to `submit.testflight.ios.ascAppId` in
   `apps/stage-mobile/eas.json`. That app ID is configuration, not a password.
4. From `apps/stage-mobile`, use `pnpm dlx eas-cli@latest credentials --platform ios` to configure
   store signing and the EAS Submit key. Credentials belong in EAS credential storage.
5. Obtain an authenticated local ClubHall checkout; fetch and pin the candidate commit. Compare
   resolved native dependencies, config plugins and any checked-in iOS changes against Stage.
   ClubHall includes expo-dev-client while the store shell does not; inspect runtime imports before
   approving this difference. Compare the injected configuration too. Do not force an incompatible
   update into `stage-clubhall-sdk57-v1`; align the shell and change runtimeVersion if needed.
6. Configure the Stage EAS project's `preview` environment with the required ClubHall public
   backend endpoints. If enabling Stage anonymous preview mode, use a dedicated preview Convex
   deployment and verify the production-auth guard described in preview-auth.md. Build-profile
   env values in ClubHall's eas.json are not automatically applied by `eas update`.

## Minimal execution order

Run commands below from the Stage repository root after the preceding checks pass.
Set STAGE_EAS_PROJECT_ID to the verified Stage project UUID for both shell and publisher.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm mobile:typecheck
pnpm test
pnpm mobile:build
```

After the native build succeeds, publish a shell update so the overlay has a return destination:

```bash
pnpm mobile:publish-shell
```

Prepare and inspect the candidate without publishing or changing its source branch:

```bash
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall \
STAGE_BASELINE_BRANCH=recovery/canonical-mainline-20260902 \
STAGE_TRACKED_BRANCHES=recovery/canonical-mainline-20260902 \
pnpm preview:clubhall -- --branch recovery/canonical-mainline-20260902 --ref <verified-commit-sha> --prepare-only
```

Inspect the prepared app config and dependency resolution, export its iOS bundle, and verify preview
backend configuration. Only then repeat the same invocation without `--prepare-only` to publish.
Create/verify the deterministic branch channel and its branch mapping in EAS before the first
non-interactive publication if it does not exist yet. The publisher currently exports all platforms;
this first milestone only needs iOS.

Submit the successful native build by its exact ID (avoid selecting another project's latest build):

```bash
pnpm mobile:submit --id <verified-stage-build-id>
```

After Apple processing, assign the build to the intended internal TestFlight group.
PR automation and a hosted Stage catalog are not required for this first milestone.

## On-device acceptance (still required)

- Stage cold-launches from TestFlight.
- Selecting the candidate downloads its update and opens ClubHall.
- ClubHall reaches a usable sports flow with the intended preview backend and real auth identity.
- The Stage overlay shows the candidate SHA and remains accessible.
- “Voltar ao Stage” returns to the shell, then the candidate can be reopened.
- Closing and reopening the app preserves a working experience.
- A missing update restores the previous channel and leaves the current screen usable.

Do not label the build or OTA loop validated until these checks run on the installed iPhone build.

## Authenticated EAS check — 2026-09-09

- Robot authentication succeeded with Admin access to madeforme; no token is stored in this repository.
- EAS project: @madeforme/stage-mobile, UUID 350f40bc-c260-4c04-a3b3-f86571fbbefd.
- No iOS builds were present. A store build attempt stopped before upload at credential setup.
- EAS incremented the remote iOS build number from 1 to 2 during that attempt.
- An existing team distribution certificate is available (expires June 19, 2027), and an App Store Connect submission API key is already configured. Do not recreate either blindly.
- Reusing the certificate reached “Creating provisioning profile” and required Apple Developer login. Interactive setup was stopped at the Apple ID prompt; the Stage provisioning profile remains the immediate blocker.
- EAS reported no Plain text or Sensitive variables in Stage's preview environment; this does not establish whether Secret variables exist.
- Candidate ClubHall commit: 53b15b3d30b0254f9401e487f9cdf5560a037ad2. Its Stage anonymous-auth guard accepts only development or native channel preview. The Stage shell uses stage-shell; this guard must be reconciled safely before claiming automatic preview login works.
- ClubHall already has a Stage publication workflow pinned to c44a9cd, not the newer overlay-return commit. Update that pin when enabling the tested workflow.
- The PR CI passed on d2531d9 (run 34324310940). Native signing, OTA publication and the iPhone acceptance loop are not yet complete.
