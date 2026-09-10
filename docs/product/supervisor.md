# Stage supervisor — first functional slice

Stage is the operator's workspace for shaping and following ClubHall experiences, from intent to
pilot observation. The native shell now opens this workspace instead of a branch list. The existing
web Branch Studio and native preview loading remain available.

The product direction comes from the user's September 10 brief and the conversations
“Implementar blueprint MCP no ClubHall”, “Refine ClubHall Concept” and
“Experiência agentica para organização”: preserve a stable native interface, make the objective and
next responsibility explicit, and distinguish preparation, execution and verification.

## Working today

- Create a mission for an experience, event or improvement. The initial workspace is empty.
- Prepare an editable local plan; change the steps and acceptance criteria.
- Export a contextual briefing through the native share sheet; paste a structured AI response to
  create a new proposal. Imports never trust execution, evidence or approval claims.
- Open the existing private Living Arena site, test its flow, return and record a manual result.
- Validate only when every criterion is checked and the latest test for the current plan revision
  passed. Revising the plan requires new checks and evidence. A failing test reopens preparation.
- Start, pause and resume local pilot tracking, record observations and inspect the activity trail.
- Persist missions, plan revisions, results and the journal with AsyncStorage on this device.
  Writes finish before success is displayed. Failed writes preserve the previous state.

## Honest boundaries

The first plan uses a deterministic local template. There is no language model executing inside
Stage yet. AI refinement works through briefing export and proposal import. Local pilot tracking
does not publish code, send invitations, reserve resources or run an autonomous worker.

Data is device-local, with no cloud synchronization. This is prototype operator state, not a
multi-user production approval service. The native iOS interface is React Native, not a WebView.
The web mini app opens separately using the original private URL and requires the owner's ChatGPT
session. Its auth is not replaced or bypassed by Stage.

## ChatGPT mini app

Verified with the Sites connector on September 10:

- Title: **CLUBHall · Living Arena**
- URL: https://clubhall-living-arena.madeforme.chatgpt.site
- Current publication: version 1, owner-only.
- The published site does **not** declare an MCP server.

The implemented connection is link-based launch and manual test evidence associated with a Stage
mission. No URL parameters are presented as working scenario control; no automatic event sync is
claimed. The published site's source and deployment have not been changed.

The laboratory thumbnail reuses the original `assets/arena/resting.png` from that site, saved as
`assets/living-arena.png`. It depicts the experience that the launch button actually opens.

For a subsequent live connection, the site and native ClubHall should publish versioned experience
observations to an authenticated backend shared with Stage. Keep user identity, mission ID,
experience revision, event ID, timestamp, outcome and provenance explicit. Deduplicate observations
by event ID; don't let a client-supplied event approve a mission. Use a server-side planner/worker
for model execution and keep all model credentials out of Expo public config.

## Code and validation

- `apps/stage-mobile/src/supervisor/model.ts`: pure lifecycle and import boundary.
- `useSupervisor.ts`: local loading and durable writes.
- `Supervisor.tsx`: overview, mission workspace, laboratory, activity and editing sheets.
- `apps/stage-mobile/src/BranchPreviews.tsx`: retained native branch picker.
- `test/unit/supervisor.test.ts`: lifecycle gates, plan revisions, later failures, proposal validation,
  and storage round trip/corruption handling.

Run `pnpm mobile:start` for development, `pnpm mobile:typecheck`, `pnpm typecheck` and `pnpm test`.
This iteration adds no native dependencies. Native OTA loading still requires a compatible
TestFlight runtime; Expo Go cannot verify that release path.

## Verification — September 10

- 26 tests in 8 files passed; root and mobile TypeScript checks passed.
- Production web export and iOS Hermes bundle export succeeded. These are bundle checks, not a
  signed native build or a TestFlight deployment.
- Browser at 390 × 844: created a mission, prepared a plan, checked validation gates, recorded
  explicitly labeled QA evidence, validated, started local tracking, added an observation, paused,
  resumed and revised the plan. Revision 2 reset the checks and rejected version 1 evidence.
- Reload retained the missions. Malformed proposal JSON displayed a recoverable error; a valid
  proposal carrying fabricated execution fields entered preparation with no imported evidence.
- Living Arena opened from Stage using the original private session. Walked explore → tennis →
  prepare simulated match → review proposal → adjust time. The site labels the invitation simulated.
- Native preview loading in the browser now gives a clear TestFlight-only message instead of an
  `ExpoUpdates` method error. Native OTA round-trip remains unverified.
- The iOS simulator could launch Expo Go, but its system “Open in Expo Go?” dialog did not respond
  to discovered accessibility actions. Native visual/interaction verification remains blocked.
- Full repository lint passes, including release configuration formatting.
