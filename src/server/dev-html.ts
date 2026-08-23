import { previewFrameDocument } from "../preview/frame.js";
import { STAGE_VERSION } from "../version.js";
import { branchStudioDocument } from "./branch-studio-html.js";

export function branchStudioHtmlLegacy(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage · Branch previews</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        background: #050505;
        color: #f7f7f7;
        --line: rgba(255, 255, 255, 0.1);
        --surface: rgba(255, 255, 255, 0.055);
        --surface-strong: rgba(255, 255, 255, 0.085);
        --muted: #8e8e93;
        --blue: #0a84ff;
        --green: #30d158;
        --red: #ff453a;
      }
      * { box-sizing: border-box; }
      button, input { font: inherit; }
      button { color: inherit; }
      body { margin: 0; min-width: 1080px; min-height: 100vh; background: #050505; }
      .shell { min-height: 100vh; display: grid; grid-template-columns: 248px 380px minmax(540px, 1fr); grid-template-rows: 68px minmax(0, 1fr) 54px; }
      .topbar { grid-column: 2 / 4; display: grid; grid-template-columns: 1fr minmax(260px, 360px) auto; align-items: center; gap: 20px; padding: 0 20px; border-bottom: 1px solid var(--line); }
      .title { font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
      .search { height: 38px; width: 100%; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: #fff; padding: 0 14px; outline: none; }
      .search:focus { border-color: rgba(10,132,255,.72); box-shadow: 0 0 0 3px rgba(10,132,255,.14); }
      .tester { display: flex; align-items: center; gap: 9px; padding: 9px 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); font-size: 13px; font-weight: 600; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 12px rgba(48,209,88,.35); }
      .sidebar { grid-row: 1 / 4; padding: 22px 14px 16px; border-right: 1px solid var(--line); display: flex; flex-direction: column; }
      .brand { display: flex; align-items: center; gap: 12px; padding: 0 10px 30px; }
      .mark { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: linear-gradient(145deg,#29292d,#0e0e10); border: 1px solid rgba(255,255,255,.18); font-weight: 800; font-size: 18px; }
      .brand strong { display: block; font-size: 16px; }
      .brand span { color: var(--muted); font-size: 11px; }
      .section-label { padding: 0 12px 10px; color: var(--muted); font-size: 11px; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
      .project { padding: 11px 12px; display: flex; align-items: center; gap: 10px; border-radius: 12px; background: var(--surface); }
      .project-icon { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: #f4f4f6; color: #0a84ff; font-weight: 800; }
      .project-meta strong { display: block; font-size: 13px; }
      .project-meta span { color: var(--muted); font-size: 11px; }
      .nav { display: grid; gap: 4px; padding-top: 18px; }
      .nav button { height: 42px; border: 0; border-radius: 11px; background: transparent; text-align: left; padding: 0 12px; color: #a6a6ab; }
      .nav button.active { color: var(--blue); background: rgba(10,132,255,.12); box-shadow: inset 3px 0 var(--blue); }
      .account { margin-top: auto; padding: 16px 10px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; line-height: 1.5; }
      .branches { grid-column: 2; grid-row: 2; overflow: auto; padding: 18px; border-right: 1px solid var(--line); }
      .branch-header { display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 14px; color: var(--muted); font-size: 12px; }
      .branch-list { display: grid; gap: 12px; }
      .branch { padding: 15px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); transition: background .18s ease, border-color .18s ease; }
      .branch:hover { background: var(--surface-strong); border-color: rgba(255,255,255,.16); }
      .branch-top { display: flex; align-items: center; gap: 9px; }
      .branch-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 600; }
      .branch-default { color: var(--muted); border: 1px solid var(--line); border-radius: 6px; padding: 2px 5px; font-size: 10px; }
      .branch-meta { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 0; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
      .branch-state { display: flex; gap: 7px; align-items: center; padding-bottom: 13px; color: #b4b4b8; font-size: 11px; }
      .branch-state .state-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
      .branch-state[data-state="incompatible"] .state-dot { background: #ff9f0a; }
      .branch-state[data-state="unknown"] .state-dot { background: var(--muted); }
      .branch-actions { display: grid; grid-template-columns: 1fr 1fr auto; gap: 8px; }
      .action { height: 34px; border: 1px solid var(--line); border-radius: 9px; background: rgba(255,255,255,.04); font-size: 11px; font-weight: 620; cursor: pointer; }
      .action.primary { background: var(--blue); border-color: var(--blue); }
      .action:disabled { opacity: .38; cursor: not-allowed; }
      .workspace { grid-column: 3; grid-row: 2; min-width: 0; display: grid; grid-template-rows: 60px minmax(0,1fr); }
      .compare-head { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid var(--line); }
      .compare-selection { display: flex; align-items: center; gap: 8px; font-size: 12px; }
      .selection { padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
      .clear { border: 0; background: none; color: var(--blue); cursor: pointer; }
      .preview-grid { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(260px,1fr)); gap: 1px; background: var(--line); overflow: hidden; }
      .preview { min-width: 0; display: grid; grid-template-rows: 48px minmax(0,1fr); background: #080808; }
      .preview-label { display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--line); font-size: 12px; }
      .device-stage { min-height: 0; display: grid; place-items: center; padding: 22px; overflow: hidden; background: radial-gradient(circle at center, rgba(255,255,255,.045), transparent 56%); }
      .phone { height: min(72vh, 690px); aspect-ratio: 390 / 844; max-width: 100%; padding: 9px; border-radius: 46px; border: 1px solid rgba(255,255,255,.3); background: #171719; box-shadow: 0 25px 70px rgba(0,0,0,.58); }
      .phone-screen { width: 100%; height: 100%; border: 0; border-radius: 37px; background: #000; }
      .empty-phone { width: 100%; height: 100%; border-radius: 37px; display: grid; place-items: center; text-align: center; background: #000; color: var(--muted); padding: 30px; line-height: 1.5; font-size: 12px; }
      .empty-phone strong { display: block; color: #fff; font-size: 18px; margin-bottom: 5px; }
      .statusbar { grid-column: 2 / 4; grid-row: 3; border-top: 1px solid var(--line); display: flex; align-items: center; gap: 18px; padding: 0 20px; color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
      .statusbar strong { color: #ddd; font-weight: 550; }
      .error { position: fixed; right: 18px; bottom: 70px; max-width: 420px; padding: 12px 14px; border: 1px solid rgba(255,69,58,.35); border-radius: 12px; background: rgba(60,10,8,.96); font-size: 12px; display: none; }
      @media (max-width: 1240px) { .shell { grid-template-columns: 210px 340px minmax(480px,1fr); } }
    </style>
  </head>
  <body>
    <main class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="mark">S</div><div><strong>Stage</strong><span>Branch previews for Expo</span></div></div>
        <div class="section-label">Projects</div>
        <div id="project" class="project"><div class="project-icon">C</div><div class="project-meta"><strong>Loading…</strong><span>project</span></div></div>
        <nav class="nav"><button class="active">⌘ &nbsp; Branches</button><button>▣ &nbsp; Sessions</button><button>⚙ &nbsp; Settings</button></nav>
        <div class="account">Stage Tester<br/>No manual ClubHall signup</div>
      </aside>
      <header class="topbar"><div class="title">Branch previews</div><input id="search" class="search" type="search" placeholder="Search branches…" aria-label="Search branches"/><div class="tester">Stage tester <span class="dot"></span></div></header>
      <section class="branches"><div class="branch-header"><span id="branch-count">Loading branches</span><span>SDK compatibility</span></div><div id="branches" class="branch-list"></div></section>
      <section class="workspace"><div class="compare-head"><div class="compare-selection"><span>Comparing</span><div id="selections"></div></div><button id="clear" class="clear">Clear</button></div><div id="preview-grid" class="preview-grid"></div></section>
      <footer id="statusbar" class="statusbar"><strong>Stage</strong><span>Loading control plane…</span></footer>
    </main>
    <div id="error" class="error" role="alert"></div>
    <script>
      const state = { snapshot: null, selected: [], query: "" };
      const $ = (id) => document.getElementById(id);
      const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char]);
      const shortSha = (sha) => sha ? sha.slice(0, 7) : "unavailable";

      async function api(url, options) {
        const response = await fetch(url, { headers: { "content-type": "application/json" }, ...options });
        const value = await response.json();
        if (!response.ok) throw new Error(value.error || "Stage request failed");
        return value;
      }

      async function refresh() {
        try {
          state.snapshot = await api("/api/stage");
          render();
        } catch (error) { showError(error.message); }
      }

      function render() {
        const snapshot = state.snapshot;
        if (!snapshot) return;
        const project = snapshot.projects[0];
        $("project").innerHTML = '<div class="project-icon">C</div><div class="project-meta"><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(project.repository) + '</span></div>';
        const branches = snapshot.branches.filter((branch) => !state.query || branch.name.toLowerCase().includes(state.query));
        $("branch-count").textContent = branches.length + " branch" + (branches.length === 1 ? "" : "es");
        $("branches").innerHTML = branches.map((branch) => branchCard(branch, project)).join("");
        renderCompare(snapshot);
        const live = snapshot.sessions.filter((session) => session.status === "live" || session.status === "starting");
        $("statusbar").innerHTML = '<strong>Metro</strong><span class="dot"></span><span>' + live.length + ' active</span><span>Ports ' + escapeHtml(live.map((session) => session.port).join(", ") || "—") + '</span><span>Mode ' + escapeHtml(project.preview?.mode || "stage") + '</span><span>Scenario ' + escapeHtml(project.preview?.scenario || "default") + '</span>';
      }

      function branchCard(branch, project) {
        const sessions = state.snapshot.sessions.filter((session) => session.branch === branch.name && session.projectId === branch.projectId);
        const live = sessions.find((session) => session.status !== "stopped" && session.status !== "failed");
        const available = branch.availability === "available";
        const isDefault = branch.name === project.baselineBranch;
        return '<article class="branch" data-name="' + escapeHtml(branch.name) + '">' +
          '<div class="branch-top"><span class="dot"></span><span class="branch-name">' + escapeHtml(branch.name) + '</span>' + (isDefault ? '<span class="branch-default">Default</span>' : '') + '</div>' +
          '<div class="branch-meta"><span>SDK ' + escapeHtml(branch.sdkVersion || "—") + '</span><span>' + escapeHtml(shortSha(branch.sha)) + '</span><span>fp ' + escapeHtml(branch.runtimeFingerprint || "—") + '</span></div>' +
          '<div class="branch-state" data-state="' + escapeHtml(branch.compatibility) + '"><span class="state-dot"></span><span>' + escapeHtml(live ? live.status : branch.availability) + '</span><span>·</span><span>' + escapeHtml(branch.compatibility) + '</span></div>' +
          '<div class="branch-actions"><button class="action primary" data-open="' + escapeHtml(branch.name) + '" ' + (available ? '' : 'disabled') + '>Open</button><button class="action" data-compare="' + escapeHtml(branch.name) + '" ' + (available ? '' : 'disabled') + '>Compare</button><button class="action" data-stop="' + escapeHtml(live?.id || '') + '" ' + (live ? '' : 'disabled') + '>Stop</button></div></article>';
      }

      function renderCompare(snapshot) {
        const selectedBranches = state.selected.map((name) => snapshot.branches.find((branch) => branch.name === name)).filter(Boolean).slice(0, 2);
        $("selections").innerHTML = selectedBranches.map((branch) => '<span class="selection">' + escapeHtml(branch.name) + '</span>').join(' <span style="color:#666">vs</span> ');
        const slots = [0, 1].map((index) => previewSlot(selectedBranches[index], snapshot.sessions));
        $("preview-grid").innerHTML = slots.join("");
      }

      function previewSlot(branch, sessions) {
        if (!branch) return '<article class="preview"><div class="preview-label">Select a branch</div><div class="device-stage"><div class="phone"><div class="empty-phone"><div><strong>Stage</strong>Choose Compare on a branch to open a live preview here.</div></div></div></div></article>';
        const session = sessions.find((candidate) => candidate.branch === branch.name && candidate.target === "web" && candidate.status !== "stopped" && candidate.status !== "failed");
        const body = session && session.status === "live"
          ? '<iframe class="phone-screen" title="' + escapeHtml(branch.name) + ' preview" src="' + escapeHtml(session.previewUrl) + '"></iframe>'
          : '<div class="empty-phone"><div><strong>' + escapeHtml(branch.name) + '</strong>' + escapeHtml(session ? session.status : "Starting web preview…") + '</div></div>';
        return '<article class="preview"><div class="preview-label"><span>' + escapeHtml(branch.name) + '</span><span>SDK ' + escapeHtml(branch.sdkVersion || "—") + '</span></div><div class="device-stage"><div class="phone">' + body + '</div></div></article>';
      }

      async function start(branch, target) {
        const projectId = state.snapshot.projects[0].id;
        await api("/api/sessions", { method: "POST", body: JSON.stringify({ projectId, branch, target }) });
        await refresh();
      }

      document.addEventListener("click", async (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        try {
          if (button.dataset.open) {
            const session = await api("/api/sessions", { method: "POST", body: JSON.stringify({ projectId: state.snapshot.projects[0].id, branch: button.dataset.open, target: "dev-client" }) });
            window.location.href = session.devClientUrl;
            await refresh();
          }
          if (button.dataset.compare) {
            const branch = button.dataset.compare;
            state.selected = state.selected.includes(branch) ? state.selected.filter((value) => value !== branch) : [...state.selected.slice(-1), branch];
            render();
            await start(branch, "web");
          }
          if (button.dataset.stop) { await api("/api/sessions/" + encodeURIComponent(button.dataset.stop), { method: "DELETE" }); await refresh(); }
        } catch (error) { showError(error.message); }
      });
      $("clear").addEventListener("click", () => { state.selected = []; render(); });
      $("search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); render(); });
      function showError(message) { const node = $("error"); node.textContent = message; node.style.display = "block"; window.setTimeout(() => { node.style.display = "none"; }, 6000); }
      refresh();
      window.setInterval(refresh, 3000);
    </script>
  </body>
</html>`;
}

export function branchStudioHtml(): string {
  return branchStudioDocument();
}

export function devShellHtml(options: {
  frameSrc: string;
  projectRoot: string;
  targetLabel: string;
}): string {
  const { frameSrc, projectRoot, targetLabel } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(86, 150, 255, 0.16), transparent 24%),
          linear-gradient(180deg, #0b1017 0%, #091119 50%, #060d14 100%);
        color: #ecf2fa;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto auto 1fr;
      }
      header {
        padding: 18px 22px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .brand {
        display: grid;
        gap: 6px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #8db3ff;
      }
      .headline {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .subhead {
        margin: 0;
        color: #c7d2e4;
        line-height: 1.5;
        max-width: 68ch;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .badge, code {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
      }
      .badge {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
      }
      .badge[data-state="loading"] { color: #ffd779; }
      .badge[data-state="mounted"] { color: #8bedb6; }
      .badge[data-state="failed"] { color: #ff9a85; }
      .surface {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 18px;
        padding: 18px 22px 24px;
      }
      .panel {
        display: grid;
        gap: 8px;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(8, 14, 22, 0.72);
      }
      .panel strong { font-size: 13px; }
      .panel span, .panel code {
        color: #c4cfde;
      }
      .panel-note {
        color: #b6c4d7;
        line-height: 1.55;
      }
      code {
        display: inline-flex;
        align-items: center;
        padding-inline: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      iframe {
        width: 100%;
        min-height: 720px;
        border: 0;
        border-radius: 24px;
        background: #050b11;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      }
      @media (max-width: 860px) {
        header {
          grid-template-columns: 1fr;
          align-items: start;
        }
        iframe {
          min-height: 560px;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">
        <span class="eyebrow">Stage OSS</span>
        <span class="headline">iPhone-like browser preview</span>
        <p class="subhead">Stage is running in <strong>ios-preview</strong> mode: it resolves a local Expo route, builds a browser VFS with browser-metro, and mounts the screen in an isolated frame that intentionally looks like an iPhone while staying honest about fidelity gaps.</p>
      </div>
      <div class="meta">
        <span class="badge" id="preview-status" data-state="loading">ios-preview · loading</span>
        <code>v${escapeHtml(STAGE_VERSION)}</code>
      </div>
    </header>
    <div class="surface">
      <section class="panel">
        <strong>Target</strong>
        <span>${escapeHtml(targetLabel)}</span>
      </section>
      <section class="panel">
        <strong>Project root</strong>
        <code>${escapeHtml(projectRoot)}</code>
      </section>
      <section class="panel">
        <strong>Fidelity note</strong>
        <span class="panel-note">This shell is designed to feel iPhone-like for layout and review work, but native-only controls, fonts, gesture physics, and device APIs can still differ from a real device or Expo Go.</span>
      </section>
      <iframe title="Stage iOS preview shell" src="${escapeHtml(frameSrc)}"></iframe>
    </div>
    <script>
      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        if (!event.data || event.data.source !== "stage-preview") {
          return;
        }
        const badge = document.getElementById("preview-status");
        if (!badge || !event.data.state) {
          return;
        }
        badge.dataset.state = event.data.state.kind;
        badge.textContent = "ios-preview · " + event.data.state.kind;
      });
    </script>
  </body>
</html>`;
}

export function devFrameHtml(): string {
  return previewFrameDocument({
    title: "Stage iOS preview frame",
    scriptUrl: "/preview/assets/app.js",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
