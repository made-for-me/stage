# STAGE Commit Reel design QA

- Source visual truth: `/workspace/scratch/066a3cb69ef8/generated_images/exec-27b4c7d1-9661-4fd0-a4ff-e0708df0e0dc.png`
- Browser-rendered implementation: `/workspace/scratch/stage-commit-reel-empty.png`
- Combined evidence: `/workspace/scratch/stage-commit-reel-comparison.png`
- Source pixels: 1586 × 992 PNG
- Implementation pixels: 1348 × 926 JPEG capture
- Browser viewport: 1348 × 926 CSS px at device pixel ratio 1
- State: source is populated; browser preview is the repository-missing empty state

## Full-view comparison

The implementation preserves the selected Commit Reel structure: uppercase STAGE identity, compact
project context, branch metadata to the left, horizontal screen reels as the dominant content, a
floating AR2 command surface, deep near-black canvas, restrained cyan/violet state color, and no
account, simulator, iframe, settings, or admin navigation. The implementation is intentionally less
decorative than the generated target and uses elevation rather than outlined panes.

The browser preview could not populate real scenes because its isolated QA runtime cannot access the
ClubHall checkout outside the Stage directory. The empty screenshot slots therefore do not provide a
valid same-state image-quality comparison against the populated source. The HTTP integration test
does verify the populated data path with a real temporary Git repository and commit-pinned uploads.

## Focused evidence

- Typography: system display typography is crisp and readable; STAGE has the correct uppercase
  dominance. The generated target uses a more condensed wordmark, which remains a P3 refinement.
- Spacing and layout: the 280px metadata track and 208 × 370 scene slots preserve screenshot-first
  hierarchy. Page gutters, 22px reel gaps, and the fixed command capsule remain clear at 1348px.
- Colors and tokens: `#05060a`, cool white, muted gray, cyan, violet, and green match the selected
  direction without the previous blue CTA and border overload.
- Image quality: the transparent AR2 orb is sharp at 40px and blends cleanly into the command surface.
  Real mobile screenshots were not available in the browser state, so crop/sharpness remains blocked.
- Copy: labels describe visual history, exact-SHA capture, missing scenes, selection, and comparison
  directly. No tester account or simulator terminology remains.

## Comparison history

### Pass 1

- [P1] Five-second polling replaced the branch buttons while they were being clicked.
  - Fix: snapshot responses now use a stable serialized key and the UI rerenders only when repository
    or capture data changes.
  - Post-fix evidence: typecheck, lint, and unit/integration tests pass. A new browser process could not
    be started within the bounded preview recovery run, so interaction-level browser evidence is still
    missing.
- [P2] The same-state populated screenshot layout could not be inspected.
  - Fix attempted: a temporary ClubHall Git fixture and scene data were created for QA.
  - Remaining blocker: the cloud preview intentionally cannot read a repository outside its isolated
    checkout, and the running process had already loaded the missing-repository state.

## Primary interactions tested

- Stage opened successfully in the cloud browser.
- Empty-state branch reels rendered with no page or application console errors.
- Two branch selection controls enabled the Compare action before the polling fix was identified.
- Capture queue, claim, two scene uploads, automatic completion, scene ordering, stale-SHA model, and
  persistence passed through automated API tests.

## Remaining blocking checks

1. Restart the verified preview with a readable ClubHall checkout.
2. Upload or capture Home, Arena, Worlds, and Profile for two branches.
3. Confirm route-tab switching, side-by-side images, lightbox, and command-triggered capture in-browser.
4. Capture the populated final viewport and compare it with the source at the same state.

final result: blocked
