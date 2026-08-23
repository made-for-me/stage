# Stage branch scenes design QA

- Source visual truth: `/workspace/scratch/066a3cb69ef8/generated_images/exec-451a02ca-cb14-443b-b6d9-b58021b2bcf2.png`
- Original annotated source: `/workspace/scratch/066a3cb69ef8/upload/01-6A9F5796-733C-4692-BD4B-C5AEC1B7A599.jpeg`
- Browser-rendered implementation: `/workspace/scratch/stage-implementation-qa-final.png`
- Combined comparison: `/workspace/scratch/stage-design-comparison-final.png`
- Browser: cloud Chrome through the supported `terminal.local` Sites preview
- Viewport: 1363 × 936 CSS px at device pixel ratio 1
- Source pixels: 1585 × 992
- Implementation pixels: 1363 × 936
- Normalization: both images were fit into 1363 × 936 comparison cells without cropping. Exact
  1585 × 992 capture was unavailable because the cloud browser viewport is fixed.
- State: dark desktop Branch Studio with three populated screenshot shelves and two selected branches

## Full-view comparison evidence

The implementation preserves the accepted three-zone composition: narrow immersive STAGE identity
rail, visual branch shelves, and a two-up comparison stage. It uses open spacing, surface depth, glow,
and shadow rather than the previous grid of enclosing borders. Each branch shows four real ClubHall
screenshots and current commit metadata. The two current scene selections are visible in the comparison
stage, and the compact AR2 command and compare dock remain anchored without obscuring primary content.

## Required fidelity surfaces

- Fonts and typography: native Apple/system sans-serif, uppercase tracked STAGE wordmark, compact
  metadata, and clear branch hierarchy match the concept's typographic character. No browser-default
  control typography remains.
- Spacing and layout rhythm: the three primary regions, shelf rhythm, screenshot spacing, floating
  controls, radii, and elevation match the concept. Both device previews now fit fully inside the
  narrower browser viewport.
- Colors and visual tokens: black/graphite background, cool blue selection, restrained violet branch
  accent, green live state, and subtle ambient bloom match the approved palette.
- Image quality and asset fidelity: the QA state uses the user's full-resolution ClubHall screenshots,
  cropped from the top inside stable scene frames. No generic image placeholders remain in the tested
  state.
- Copy and content: STAGE is uppercase. The classic Branches/Sessions/Settings navigation is absent.
  AR2 owns the open/compare/refresh command surface. Branch, SHA, scene count, compatibility, and
  refresh time remain available without dominating the visuals.

## Focused comparison evidence

Focused rail inspection confirmed the STAGE wordmark, ClubHall identity, and AR2 presence are visible
and separated from the bottom command surface. Device bounding boxes after the responsive fix were
`265.5 × 574.56` CSS px with right edges at 1041.5 and 1333, inside the 1363 px viewport.

## Comparison history

1. Initial rendered pass showed valid empty capture queues because the private ClubHall checkout was
   unavailable. A local Git fixture and commit-scoped Stage scene manifest were populated with 12
   screenshots so QA exercised the intended screenshot-rich state.
2. The first populated pass exposed a synthetic `origin` branch from the remote HEAD ref. Branch
   normalization now removes that pseudo-branch; the final render contains exactly three branches.
3. The first comparison render allowed the second fixed-height device to overflow at 1363 px. Devices
   now derive height from a bounded responsive width; both fit with 30 px of remaining viewport space.
4. AR2 originally sat under the command surface at the bottom of the rail. Its presence indicator now
   occupies the middle of the rail and remains visible.

## Primary interactions tested

- Clicking a branch scene changed the first comparison image to `Learn for main`.
- Clicking another branch updated the selected pair.
- Swap reversed the selected branches.
- The AR2 command input accepted a command and returned concise supported-command guidance.
- The final page produced no app-origin console warnings or errors. Cloud-browser extension metadata
  errors were excluded because they do not originate from Stage.

## Above-the-fold copy diff

No unapproved marketing or dashboard copy was introduced. Fixture branch names differ from the
concept because QA used available local Git refs; production uses the configured ClubHall branch names.
`Scenes refresh per commit` restates the user's required behavior and is intentional.

## Remaining intentional deviations

- The concept's generated ClubHall artwork differs from the actual ClubHall captures used by Stage;
  branch scenes are dynamic product data and must not be baked into the interface.
- The cloud viewport is 222 px narrower than the source concept, so the responsive implementation uses
  smaller device previews while preserving the same composition.
- The project mark is a code-native ClubHall monogram until a repository-owned Stage/ClubHall brand
  asset is provided; the uppercase STAGE wordmark remains the primary identity.

## Findings

No actionable P0, P1, or P2 findings remain. The implementation is agency-signoff faithful to the
accepted concept within the dynamic-data and fixed-browser constraints above.

## Follow-up polish

- P3: replace the ClubHall monogram with a repository-owned final brand asset when one exists.

final result: passed
