export function branchStudioDocument(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>STAGE · Visual history</title>
  <style>
    :root {
      color-scheme: dark;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
      color: #f6f7fb; background: #05060a;
      --surface: rgba(15,18,27,.88); --muted: #989eac; --tertiary: #666d7c;
      --blue: #66b8ff; --violet: #9c70ff; --green: #69dd8a; --danger: #ff7a72;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 860px; min-height: 100vh; background: #05060a; overflow-x: hidden; }
    button, input { font: inherit; } button { color: inherit; }
    button:focus-visible, input:focus-visible { outline: 2px solid #77d7ff; outline-offset: 3px; }
    .app { width: min(1480px, calc(100% - 72px)); margin: 0 auto; padding: 28px 0 132px; }
    .topbar {
      position: sticky; top: 0; z-index: 20; min-height: 72px;
      display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; gap: 26px;
      padding: 14px 0; background: rgba(5,6,10,.91); backdrop-filter: blur(24px);
    }
    .wordmark { font-size: 30px; line-height: 1; font-weight: 790; letter-spacing: -.055em; text-shadow: 0 0 32px rgba(90,174,255,.25); }
    .project-button {
      height: 42px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 0;
      border-radius: 14px; background: #0d111a; box-shadow: 0 14px 38px rgba(0,0,0,.32), inset 0 1px rgba(255,255,255,.06);
      cursor: default; font-size: 13px; font-weight: 650;
    }
    .project-mark { width: 25px; height: 25px; display: grid; place-items: center; border-radius: 8px; background: #17243b; color: #8bc7ff; font-weight: 760; box-shadow: 0 7px 20px rgba(48,134,255,.22); }
    .section-title { color: #d6d9e1; font-size: 13px; font-weight: 560; }
    .top-actions { display: flex; align-items: center; gap: 10px; }
    .quiet-button, .compare-button {
      min-height: 42px; border: 0; border-radius: 14px; padding: 0 16px; cursor: pointer;
      background: #0d111a; box-shadow: 0 12px 34px rgba(0,0,0,.3), inset 0 1px rgba(255,255,255,.06);
      color: #d8dce7; font-size: 12px; font-weight: 650;
    }
    .compare-button[disabled] { opacity: .38; cursor: not-allowed; }
    .compare-button.ready { color: #fff; background: #21203c; box-shadow: 0 12px 34px rgba(0,0,0,.32), 0 0 30px rgba(125,93,255,.14), inset 0 1px rgba(255,255,255,.1); }
    .intro { padding: 34px 0 30px; }
    .eyebrow { color: var(--blue); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
    .intro-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; margin-top: 8px; }
    h1 { margin: 0; font-size: clamp(30px,3.2vw,48px); line-height: 1.04; letter-spacing: -.045em; font-weight: 690; }
    .intro-copy { max-width: 480px; margin: 0 0 4px; color: var(--muted); font-size: 13px; line-height: 1.55; text-align: right; }
    .compare-tray { display: none; margin: 4px 0 34px; padding: 20px; border-radius: 26px; background: var(--surface); box-shadow: 0 28px 80px rgba(0,0,0,.48), 0 0 68px rgba(105,100,255,.07), inset 0 1px rgba(255,255,255,.07); }
    .compare-tray.open { display: block; }
    .compare-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .compare-pair { display: flex; align-items: center; gap: 9px; min-width: 0; font-size: 13px; font-weight: 640; }
    .compare-pair span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .versus { color: var(--tertiary); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
    .close-button { min-width: 64px; height: 40px; border: 0; border-radius: 13px; background: rgba(255,255,255,.05); color: var(--muted); cursor: pointer; }
    .route-tabs { display: flex; gap: 8px; margin: 18px 0 16px; overflow-x: auto; scrollbar-width: none; }
    .route-tab { min-height: 38px; padding: 0 14px; border: 0; border-radius: 12px; background: rgba(255,255,255,.035); color: var(--muted); cursor: pointer; font-size: 11px; }
    .route-tab.active { color: #fff; background: rgba(101,126,255,.18); box-shadow: inset 0 1px rgba(255,255,255,.08); }
    .compare-scenes { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 18px; }
    .compare-scene { min-width: 0; }
    .compare-scene-label { display: flex; justify-content: space-between; gap: 12px; margin: 0 2px 10px; color: var(--muted); font-size: 10px; }
    .compare-image { height: min(58vh,560px); overflow: hidden; border-radius: 20px; background: #090c12; box-shadow: 0 24px 60px rgba(0,0,0,.48), inset 0 1px rgba(255,255,255,.08); }
    .compare-image img { width: 100%; height: 100%; object-fit: contain; object-position: top center; display: block; background: #080a0f; }
    .compare-empty { height: 100%; display: grid; place-items: center; padding: 24px; text-align: center; color: var(--tertiary); font-size: 11px; line-height: 1.5; }
    .history { display: grid; gap: 2px; }
    .reel {
      min-height: 430px; display: grid; grid-template-columns: minmax(220px,280px) minmax(0,1fr); gap: 26px;
      padding: 24px 22px 26px; border-radius: 26px; background: rgba(10,13,20,.64);
      box-shadow: 0 22px 70px rgba(0,0,0,.22), inset 0 1px rgba(255,255,255,.035);
      transition: background .2s ease, transform .2s ease, box-shadow .2s ease;
    }
    .reel + .reel { margin-top: 22px; }
    .reel:hover { background: rgba(13,17,27,.78); box-shadow: 0 28px 78px rgba(0,0,0,.3), inset 0 1px rgba(255,255,255,.055); }
    .reel.selected { background: rgba(15,20,33,.86); box-shadow: 0 28px 82px rgba(0,0,0,.34), 0 0 52px rgba(83,127,255,.07), inset 0 1px rgba(255,255,255,.07); }
    .reel-meta { min-width: 0; display: flex; flex-direction: column; padding: 4px 2px; }
    .reel-time { color: var(--muted); font-size: 11px; }
    .reel-branch { display: flex; align-items: flex-start; gap: 11px; margin-top: 22px; }
    .branch-dot { width: 9px; height: 9px; flex: 0 0 auto; margin-top: 5px; border-radius: 50%; background: var(--blue); box-shadow: 0 0 18px rgba(102,184,255,.5); }
    .reel:nth-child(3n+2) .branch-dot { background: var(--violet); box-shadow: 0 0 18px rgba(156,112,255,.5); }
    .reel:nth-child(3n) .branch-dot { background: var(--green); box-shadow: 0 0 18px rgba(105,221,138,.45); }
    .branch-name { min-width: 0; overflow-wrap: anywhere; font-size: 16px; line-height: 1.28; font-weight: 630; letter-spacing: -.015em; }
    .reel-sha { margin: 10px 0 0 20px; color: var(--tertiary); font-size: 11px; font-variant-numeric: tabular-nums; }
    .capture-state { margin: 28px 0 0 20px; color: var(--muted); font-size: 11px; line-height: 1.5; }
    .capture-state strong { color: #dce0ea; font-weight: 620; }
    .capture-state[data-status="queued"], .capture-state[data-status="capturing"] { color: var(--blue); }
    .capture-state[data-status="failed"] { color: var(--danger); }
    .reel-actions { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 30px; }
    .select-button, .capture-button { min-height: 42px; border: 0; border-radius: 14px; padding: 0 14px; cursor: pointer; background: rgba(255,255,255,.05); color: #cbd0dc; font-size: 11px; font-weight: 620; }
    .select-button.selected { background: rgba(90,136,255,.18); color: #fff; }
    .capture-button { color: var(--blue); }
    .capture-button[disabled] { opacity: .45; cursor: wait; }
    .screen-reel { min-width: 0; display: flex; align-items: flex-start; gap: 16px; overflow-x: auto; overflow-y: hidden; padding: 2px 10px 28px 2px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.12) transparent; scroll-snap-type: x proximity; }
    .scene-card { position: relative; flex: 0 0 208px; height: 370px; padding: 0; border: 0; border-radius: 20px; overflow: hidden; background: #080b11; box-shadow: 0 24px 58px rgba(0,0,0,.48), inset 0 1px rgba(255,255,255,.08); cursor: pointer; scroll-snap-align: start; transition: transform .2s ease, box-shadow .2s ease; }
    .scene-card:hover { transform: translateY(-6px); box-shadow: 0 32px 70px rgba(0,0,0,.58), 0 0 34px rgba(83,141,255,.09), inset 0 1px rgba(255,255,255,.1); }
    .scene-card img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; }
    .scene-caption { position: absolute; left: 10px; right: 10px; bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 34px; padding: 0 10px; border-radius: 11px; background: rgba(4,6,10,.84); backdrop-filter: blur(14px); box-shadow: 0 9px 24px rgba(0,0,0,.36), inset 0 1px rgba(255,255,255,.08); font-size: 10px; }
    .scene-change { color: var(--blue); font-size: 8px; font-weight: 720; letter-spacing: .08em; text-transform: uppercase; }
    .scene-card.empty { cursor: default; background: #090c13; }
    .scene-card.empty:hover { transform: none; }
    .empty-copy { height: 100%; display: grid; place-items: center; padding: 24px; text-align: center; color: var(--tertiary); font-size: 11px; line-height: 1.55; }
    .command { position: fixed; z-index: 30; left: 50%; bottom: 24px; width: min(660px,calc(100% - 48px)); min-height: 62px; transform: translateX(-50%); display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px; padding: 8px 10px 8px 11px; border-radius: 22px; background: rgba(14,19,30,.92); box-shadow: 0 30px 90px rgba(0,0,0,.62), 0 0 45px rgba(70,137,255,.1), inset 0 1px rgba(255,255,255,.1); backdrop-filter: blur(28px); }
    .command img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 24px rgba(80,197,255,.3); }
    .command input { width: 100%; min-height: 44px; border: 0; outline: 0; background: transparent; color: #fff; font-size: 12px; }
    .command input::placeholder { color: #858c9b; }
    .command button { min-height: 42px; border: 0; border-radius: 14px; padding: 0 15px; background: rgba(255,255,255,.07); cursor: pointer; font-size: 11px; font-weight: 660; }
    .toast { position: fixed; top: 22px; right: 24px; z-index: 50; display: none; max-width: 420px; padding: 13px 16px; border-radius: 14px; background: #151b28; box-shadow: 0 22px 70px rgba(0,0,0,.54); color: #d8dce8; font-size: 11px; }
    .toast.error { color: #ffd2cf; background: #35171c; }
    .lightbox { position: fixed; inset: 0; z-index: 60; display: none; place-items: center; padding: 44px; background: rgba(2,3,6,.88); backdrop-filter: blur(18px); }
    .lightbox.open { display: grid; }
    .lightbox-card { position: relative; max-width: min(94vw,1180px); max-height: 90vh; }
    .lightbox-card img { display: block; max-width: 100%; max-height: 86vh; border-radius: 22px; box-shadow: 0 34px 110px rgba(0,0,0,.72); }
    .lightbox-label { position: absolute; left: 16px; bottom: 16px; padding: 9px 12px; border-radius: 12px; background: rgba(3,5,9,.82); backdrop-filter: blur(14px); font-size: 11px; }
    .lightbox-close { position: absolute; top: 14px; right: 14px; min-width: 64px; height: 42px; border: 0; border-radius: 14px; background: rgba(4,6,10,.82); cursor: pointer; }
    @media (max-width: 1100px) { .app { width: calc(100% - 40px); } .reel { grid-template-columns: 220px minmax(0,1fr); gap: 18px; } .scene-card { flex-basis: 180px; height: 330px; } }
    @media (max-width: 860px) { .app { width: calc(100% - 32px); } .topbar { grid-template-columns: auto auto 1fr; } .section-title { display: none; } .intro-copy { display: none; } .reel { grid-template-columns: 190px minmax(0,1fr); padding-inline: 16px; } }
    @media (prefers-reduced-motion: reduce) { * { transition: none !important; scroll-behavior: auto !important; } }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div class="wordmark">STAGE</div>
      <div id="project" class="project-button"><span class="project-mark">C</span><span>ClubHall</span></div>
      <div class="section-title">Visual history</div>
      <div class="top-actions"><button id="sync" class="quiet-button">Sync branches</button><button id="compare" class="compare-button" disabled>Compare</button></div>
    </header>
    <section class="intro"><div class="eyebrow">Latest visual changes</div><div class="intro-row"><h1>See what each branch changed.</h1><p id="summary" class="intro-copy">Loading branch captures…</p></div></section>
    <section id="compare-tray" class="compare-tray" aria-label="Branch comparison">
      <div class="compare-head"><div id="compare-pair" class="compare-pair"></div><button id="close-compare" class="close-button" aria-label="Close comparison">Close</button></div>
      <div id="route-tabs" class="route-tabs"></div><div id="compare-scenes" class="compare-scenes"></div>
    </section>
    <section id="history" class="history" aria-live="polite"></section>
  </main>
  <form id="command" class="command"><img src="/assets/ar2-orb.png" alt="AR2"/><input id="command-input" aria-label="Ask AR2" placeholder="Ask AR2 to capture a branch or compare two versions…"/><button>Run</button></form>
  <div id="toast" class="toast" role="status"></div>
  <div id="lightbox" class="lightbox" role="dialog" aria-modal="true"><div class="lightbox-card"><img id="lightbox-image" alt="Selected mobile screen"/><div id="lightbox-label" class="lightbox-label"></div><button id="lightbox-close" class="lightbox-close" aria-label="Close image">Close</button></div></div>
  <script>
    const state = { snapshot: null, snapshotKey: "", selected: [], compareOpen: false, route: null, changedOnly: false };
    const $ = (id) => document.getElementById(id);
    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
    const shortSha = (sha) => sha ? sha.slice(0, 7) : "unavailable";
    async function api(url, options) { const response = await fetch(url, { headers: { "content-type": "application/json" }, ...options }); const value = await response.json(); if (!response.ok) throw new Error(value.error || "Stage request failed"); return value; }
    async function refresh() {
      try {
        const snapshot = await api("/api/stage");
        const snapshotKey = JSON.stringify(snapshot);
        if (snapshotKey === state.snapshotKey) return;
        state.snapshot = snapshot;
        state.snapshotKey = snapshotKey;
        const branchNames = new Set(snapshot.branches.map((branch) => branch.name));
        state.selected = state.selected.filter((name) => branchNames.has(name));
        render();
      } catch (error) { showToast(error.message, true); }
    }
    function project() { return state.snapshot.projects[0]; }
    function branchByName(name) { return state.snapshot.branches.find((branch) => branch.name === name); }
    function scenesFor(branch) { return state.snapshot.scenes.filter((scene) => scene.projectId === branch.projectId && scene.branch === branch.name && scene.sha === branch.sha); }
    function captureFor(branch) { return state.snapshot.captures.find((capture) => capture.projectId === branch.projectId && capture.branch === branch.name && capture.sha === branch.sha); }
    function routeOrder() { return project().preview?.scenes || []; }
    function baselineBranch() { return branchByName(project().baselineBranch); }
    function baselineScene(route) { const branch = baselineBranch(); return branch ? scenesFor(branch).find((scene) => scene.route === route) : null; }
    function changeFor(scene) { const baseline = baselineScene(scene.route); if (!baseline) return "new"; if (!baseline.contentHash || !scene.contentHash) return "unknown"; return baseline.contentHash === scene.contentHash ? "same" : "changed"; }
    function render() {
      if (!state.snapshot) return;
      const currentProject = project();
      const available = state.snapshot.branches.filter((branch) => branch.availability === "available");
      const visible = state.snapshot.branches.filter((branch) => !state.changedOnly || scenesFor(branch).some((scene) => changeFor(scene) !== "same"));
      $("project").innerHTML = '<span class="project-mark">' + escapeHtml(currentProject.name.slice(0,1)) + '</span><span>' + escapeHtml(currentProject.name) + '</span>';
      $("summary").textContent = available.length + " active branches · " + state.snapshot.scenes.length + " current scenes · screenshots pinned to commit SHA";
      $("history").innerHTML = visible.map((branch) => reel(branch)).join("");
      const compare = $("compare"); compare.disabled = state.selected.length !== 2; compare.classList.toggle("ready", state.selected.length === 2); compare.textContent = state.selected.length ? "Compare " + state.selected.length + "/2" : "Compare"; renderCompare();
    }
    function reel(branch) {
      const scenes = scenesFor(branch); const capture = captureFor(branch); const selected = state.selected.includes(branch.name);
      const latest = scenes.map((scene) => scene.capturedAt).sort().at(-1); const expected = routeOrder(); const sceneByRoute = new Map(scenes.map((scene) => [scene.route, scene]));
      const screens = expected.map((expectedScene) => sceneCard(sceneByRoute.get(expectedScene.route), expectedScene, branch)).join("");
      const captureStatus = capture?.status || (scenes.length ? "completed" : "missing");
      const captureCopy = captureStatus === "completed" ? scenes.length + " of " + expected.length + " screens captured" : captureStatus === "missing" ? "No capture for this commit" : captureStatus === "failed" ? capture.error || "Capture failed" : captureStatus === "capturing" ? "AR2 is capturing this branch" : "Capture queued for AR2";
      return '<article class="reel' + (selected ? ' selected' : '') + '"><div class="reel-meta"><div class="reel-time">' + escapeHtml(latest ? relativeTime(latest) : "Latest commit") + '</div><div class="reel-branch"><span class="branch-dot"></span><div class="branch-name">' + escapeHtml(branch.name) + '</div></div><div class="reel-sha">' + escapeHtml(shortSha(branch.sha)) + ' · ' + escapeHtml(branch.compatibility) + '</div><div class="capture-state" data-status="' + escapeHtml(captureStatus) + '"><strong>' + escapeHtml(captureStatus) + '</strong><br/>' + escapeHtml(captureCopy) + '</div><div class="reel-actions"><button class="select-button' + (selected ? ' selected' : '') + '" data-select="' + escapeHtml(branch.name) + '">' + (selected ? 'Selected' : 'Select') + '</button><button class="capture-button" data-capture="' + escapeHtml(branch.name) + '" ' + ((captureStatus === "queued" || captureStatus === "capturing" || branch.availability !== "available") ? 'disabled' : '') + '>Capture latest</button></div></div><div class="screen-reel">' + screens + '</div></article>';
    }
    function sceneCard(scene, expected, branch) {
      if (!scene) return '<div class="scene-card empty"><div class="empty-copy"><div><strong>' + escapeHtml(expected.title) + '</strong><br/>Capture pending for<br/>' + escapeHtml(shortSha(branch.sha)) + '</div></div><div class="scene-caption"><span>' + escapeHtml(expected.title) + '</span><span class="scene-change">missing</span></div></div>';
      const change = changeFor(scene); return '<button class="scene-card" data-open-scene="' + escapeHtml(scene.id) + '" aria-label="Open ' + escapeHtml(scene.title) + '"><img src="' + escapeHtml(scene.imageUrl) + '" alt="' + escapeHtml(scene.title) + ' on ' + escapeHtml(branch.name) + '"/><span class="scene-caption"><span>' + escapeHtml(scene.title) + '</span><span class="scene-change">' + escapeHtml(change) + '</span></span></button>';
    }
    function toggleBranch(name) { if (state.selected.includes(name)) state.selected = state.selected.filter((branch) => branch !== name); else state.selected = [...state.selected.slice(-1), name]; if (state.selected.length !== 2) state.compareOpen = false; render(); }
    function openCompare() { if (state.selected.length !== 2) return showToast("Select two branches to compare."); state.compareOpen = true; const firstRoute = routeOrder()[0]?.route; if (!state.route || !routeOrder().some((scene) => scene.route === state.route)) state.route = firstRoute; renderCompare(); $("compare-tray").scrollIntoView({ behavior: "smooth", block: "start" }); }
    function renderCompare() {
      const tray = $("compare-tray"); tray.classList.toggle("open", state.compareOpen && state.selected.length === 2); if (!state.compareOpen || state.selected.length !== 2) return;
      const branches = state.selected.map(branchByName); $("compare-pair").innerHTML = '<span>' + escapeHtml(branches[0].name) + '</span><span class="versus">versus</span><span>' + escapeHtml(branches[1].name) + '</span>';
      $("route-tabs").innerHTML = routeOrder().map((scene) => '<button class="route-tab' + (scene.route === state.route ? ' active' : '') + '" data-route="' + escapeHtml(scene.route) + '">' + escapeHtml(scene.title) + '</button>').join("");
      $("compare-scenes").innerHTML = branches.map((branch) => compareScene(branch)).join("");
    }
    function compareScene(branch) { const scene = scenesFor(branch).find((candidate) => candidate.route === state.route); const expected = routeOrder().find((candidate) => candidate.route === state.route); const image = scene ? '<img src="' + escapeHtml(scene.imageUrl) + '" alt="' + escapeHtml(expected?.title || scene.title) + ' on ' + escapeHtml(branch.name) + '"/>' : '<div class="compare-empty">AR2 has not captured this screen for the current commit.</div>'; return '<article class="compare-scene"><div class="compare-scene-label"><span>' + escapeHtml(branch.name) + '</span><span>' + escapeHtml(shortSha(branch.sha)) + '</span></div><div class="compare-image">' + image + '</div></article>'; }
    async function requestCapture(name) { const branch = branchByName(name); if (!branch?.sha) throw new Error("This branch is not available locally."); await api("/api/captures", { method: "POST", body: JSON.stringify({ projectId: branch.projectId, branch: branch.name, requestedBy: "ar2" }) }); showToast("AR2 capture queued for " + branch.name + " at " + shortSha(branch.sha) + "."); await refresh(); }
    function commandMatches(command) { return state.snapshot.branches.filter((branch) => { const full = branch.name.toLowerCase(); const tail = full.split("/").pop(); return command.includes(full) || (tail && command.includes(tail)) || (full.includes("arena") && command.includes("arena")) || (full.includes("flighty") && command.includes("flighty")); }); }
    async function runCommand(value) {
      const command = value.trim().toLowerCase(); if (!command) return; const matches = commandMatches(command);
      if (command.includes("show changed")) { state.changedOnly = true; render(); return showToast("Showing branches with visual changes."); }
      if (command.includes("show all")) { state.changedOnly = false; render(); return; }
      if (command.includes("compare")) { if (matches.length >= 2) state.selected = matches.slice(0,2).map((branch) => branch.name); else if (matches.length === 1) state.selected = [...state.selected.filter((name) => name !== matches[0].name).slice(-1), matches[0].name]; if (state.selected.length === 2) { render(); return openCompare(); } return showToast("Name two branches, or select them from the visual history."); }
      if (command.includes("capture") && (matches[0] || state.selected[0])) return requestCapture(matches[0]?.name || state.selected[0]);
      if (command.includes("refresh") || command.includes("sync")) { await refresh(); return showToast("Branch refs and captures are current."); }
      showToast("Try “capture arena”, “compare arena and flighty”, or “show changed screens”.");
    }
    document.addEventListener("click", (event) => { const select = event.target.closest("[data-select]"); if (select) return toggleBranch(select.dataset.select); const capture = event.target.closest("[data-capture]"); if (capture) return requestCapture(capture.dataset.capture).catch((error) => showToast(error.message,true)); const route = event.target.closest("[data-route]"); if (route) { state.route = route.dataset.route; return renderCompare(); } const sceneButton = event.target.closest("[data-open-scene]"); if (sceneButton) return openLightbox(sceneButton.dataset.openScene); });
    $("compare").addEventListener("click", openCompare); $("close-compare").addEventListener("click", () => { state.compareOpen = false; renderCompare(); });
    $("sync").addEventListener("click", () => refresh().then(() => showToast("Branch refs and captures are current.")));
    $("command").addEventListener("submit", (event) => { event.preventDefault(); runCommand($("command-input").value).then(() => { $("command-input").value = ""; }).catch((error) => showToast(error.message,true)); });
    $("lightbox-close").addEventListener("click", closeLightbox); $("lightbox").addEventListener("click", (event) => { if (event.target === $("lightbox")) closeLightbox(); }); document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeLightbox(); state.compareOpen = false; renderCompare(); } });
    function openLightbox(id) { const scene = state.snapshot.scenes.find((candidate) => candidate.id === id); if (!scene) return; $("lightbox-image").src = scene.imageUrl; $("lightbox-label").textContent = scene.title + " · " + scene.branch + " · " + shortSha(scene.sha); $("lightbox").classList.add("open"); }
    function closeLightbox() { $("lightbox").classList.remove("open"); }
    function relativeTime(value) { const seconds = Math.max(0,Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "Captured just now"; if (seconds < 3600) return "Captured " + Math.floor(seconds/60) + "m ago"; if (seconds < 86400) return "Captured " + Math.floor(seconds/3600) + "h ago"; return "Captured " + Math.floor(seconds/86400) + "d ago"; }
    function showToast(message,isError) { const node = $("toast"); node.textContent = message; node.className = "toast" + (isError ? " error" : ""); node.style.display = "block"; window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => { node.style.display = "none"; },4200); }
    refresh(); window.setInterval(refresh,5000);
  </script>
</body>
</html>`;
}
