export function branchStudioDocument(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>STAGE · Branch scenes</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif;
        color: #f7f8ff;
        background: #03050a;
        --muted: #8f96a7;
        --soft: #b8bfd0;
        --blue: #4b93ff;
        --violet: #9d63ff;
        --green: #55db77;
        --amber: #ffb340;
        --danger: #ff6961;
      }
      * { box-sizing: border-box; }
      button, input { font: inherit; }
      button { color: inherit; }
      body {
        margin: 0;
        min-width: 1040px;
        min-height: 100vh;
        overflow: hidden;
        background:
          radial-gradient(circle at 58% 78%, rgba(37, 110, 255, .12), transparent 34%),
          radial-gradient(circle at 96% 84%, rgba(128, 58, 255, .13), transparent 32%),
          #03050a;
      }
      .shell {
        min-height: 100vh;
        height: 100vh;
        display: grid;
        grid-template-columns: 188px minmax(470px, 570px) minmax(520px, 1fr);
      }
      .rail {
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 38px 24px 26px;
        background: linear-gradient(90deg, rgba(2,4,9,.98), rgba(5,12,24,.78));
        box-shadow: 28px 0 80px rgba(0, 45, 120, .12);
        z-index: 3;
      }
      .wordmark {
        font-size: 19px;
        line-height: 1;
        letter-spacing: .34em;
        font-weight: 520;
        text-shadow: 0 0 32px rgba(100, 181, 255, .55);
      }
      .project { margin-top: 50px; }
      .project-mark {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        border-radius: 20px;
        background: rgba(25, 47, 85, .68);
        box-shadow: 0 16px 50px rgba(21, 116, 255, .22), inset 0 1px rgba(255,255,255,.12);
        color: #82b8ff;
        font-size: 31px;
        font-weight: 700;
      }
      .project strong { display: block; margin-top: 24px; font-size: 20px; letter-spacing: -.02em; }
      .project span { display: block; margin-top: 6px; color: var(--muted); font-size: 12px; }
      .agent {
        margin-top: min(34vh, 280px);
        display: flex;
        align-items: center;
        gap: 12px;
        color: var(--soft);
        font-size: 11px;
      }
      .agent-orb {
        width: 29px;
        height: 29px;
        border-radius: 50%;
        background: radial-gradient(circle at 40% 35%, #d9fbff 0 5%, #55d9ff 18%, #126dc4 46%, #031326 72%);
        box-shadow: 0 0 0 1px rgba(106, 221, 255, .75), 0 0 24px rgba(38, 192, 255, .55);
      }
      .agent strong { display: block; color: #fff; font-size: 11px; }
      .agent small { display: block; margin-top: 3px; color: var(--green); letter-spacing: .08em; }
      .library {
        min-width: 0;
        overflow: auto;
        padding: 30px 22px 110px 38px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,.16) transparent;
      }
      .library-head, .compare-head {
        min-height: 42px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
      }
      .library-head strong, .compare-head strong { font-size: 13px; font-weight: 610; }
      .library-head span, .compare-head span { color: var(--muted); font-size: 11px; }
      .branch-list { display: grid; gap: 14px; }
      .branch-shelf {
        position: relative;
        padding: 14px 16px 15px;
        border: 0;
        border-radius: 19px;
        background: rgba(13, 18, 28, .82);
        box-shadow: 0 18px 50px rgba(0,0,0,.26), inset 0 1px rgba(255,255,255,.045);
        transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
      }
      .branch-shelf:hover {
        transform: translateY(-2px);
        background: rgba(16, 23, 36, .92);
        box-shadow: 0 26px 60px rgba(0,0,0,.34), 0 0 48px rgba(47,122,255,.06), inset 0 1px rgba(255,255,255,.075);
      }
      .branch-shelf.selected {
        background: rgba(16, 26, 44, .94);
        box-shadow: 0 24px 64px rgba(0,0,0,.36), 0 0 42px rgba(51, 126, 255, .1), inset 3px 0 #4b93ff;
      }
      .branch-line { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .branch-dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; background: var(--blue); box-shadow: 0 0 16px rgba(75,147,255,.55); }
      .branch-shelf:nth-child(3n) .branch-dot { background: var(--violet); box-shadow: 0 0 16px rgba(157,99,255,.55); }
      .branch-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 610; }
      .default { padding: 3px 7px; border-radius: 7px; background: rgba(255,255,255,.07); color: var(--soft); font-size: 9px; }
      .refresh-time { margin-left: auto; color: var(--muted); font-size: 10px; white-space: nowrap; }
      .branch-meta { display: flex; align-items: center; gap: 7px; padding: 7px 0 12px 18px; color: var(--muted); font-size: 10px; font-variant-numeric: tabular-nums; }
      .branch-meta .live { color: var(--green); }
      .branch-meta .incompatible { color: var(--amber); }
      .scene-strip { display: flex; min-height: 143px; gap: 10px; overflow-x: auto; overflow-y: hidden; padding: 1px 5px 9px 18px; scroll-snap-type: x proximity; scrollbar-width: none; }
      .scene-strip::-webkit-scrollbar { display: none; }
      .scene {
        position: relative;
        flex: 0 0 88px;
        height: 132px;
        padding: 0;
        border: 0;
        border-radius: 14px;
        overflow: hidden;
        background: #080b12;
        box-shadow: 0 13px 28px rgba(0,0,0,.5), inset 0 1px rgba(255,255,255,.08);
        scroll-snap-align: start;
        cursor: pointer;
        transition: transform .18s ease, box-shadow .18s ease;
      }
      .scene:hover, .scene:focus-visible { transform: translateY(-4px) scale(1.015); box-shadow: 0 18px 32px rgba(0,0,0,.58), 0 0 24px rgba(68,143,255,.12); outline: none; }
      .scene img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
      .scene span {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 24px 7px 7px;
        background: linear-gradient(transparent, rgba(1,2,5,.96));
        color: #eef2ff;
        font-size: 9px;
        text-align: center;
      }
      .scene.empty {
        display: grid;
        place-items: end center;
        background: radial-gradient(circle at 50% 25%, rgba(70,145,255,.2), transparent 34%), #080b12;
        color: var(--muted);
      }
      .scene.empty::before { content: "AR2"; align-self: center; color: #7caeff; font-size: 10px; letter-spacing: .15em; }
      .workspace {
        position: relative;
        min-width: 0;
        overflow: hidden;
        padding: 30px 30px 112px 18px;
      }
      .workspace::before {
        content: "";
        position: absolute;
        width: 76%;
        height: 52%;
        left: 18%;
        bottom: 5%;
        border-radius: 50%;
        background: radial-gradient(ellipse, rgba(50,119,255,.16), rgba(128,55,255,.07) 45%, transparent 72%);
        filter: blur(20px);
        pointer-events: none;
      }
      .selection-row { display: flex; align-items: center; gap: 10px; }
      .selection { color: #e9edfb; font-size: 11px; }
      .selection + .selection::before { content: "vs"; margin-right: 10px; color: #696f7d; }
      .preview-grid {
        position: relative;
        z-index: 1;
        height: calc(100% - 42px);
        min-height: 520px;
        display: grid;
        grid-template-columns: repeat(2, minmax(240px, 1fr));
        gap: 26px;
        align-items: center;
      }
      .preview { min-width: 0; height: 100%; display: grid; grid-template-rows: 38px minmax(0,1fr); }
      .preview-label { display: flex; justify-content: space-between; align-items: center; padding: 0 6px; color: var(--soft); font-size: 11px; }
      .device-stage { min-height: 0; display: grid; place-items: center; perspective: 1200px; }
      .device {
        position: relative;
        width: min(100%, 330px);
        height: auto;
        max-height: min(72vh, 690px);
        aspect-ratio: 390 / 844;
        padding: 8px;
        border-radius: 49px;
        background: #11141b;
        box-shadow: 0 36px 90px rgba(0,0,0,.66), 0 0 70px rgba(52,119,255,.12), inset 0 1px rgba(255,255,255,.28);
      }
      .preview:nth-child(2) .device { box-shadow: 0 36px 90px rgba(0,0,0,.66), 0 0 70px rgba(151,65,255,.14), inset 0 1px rgba(255,255,255,.28); }
      .device iframe, .device img, .device-empty { width: 100%; height: 100%; border: 0; border-radius: 40px; background: #020308; }
      .device img { display: block; object-fit: cover; object-position: top; }
      .device-empty { display: grid; place-items: center; padding: 32px; text-align: center; color: var(--muted); font-size: 11px; line-height: 1.55; }
      .device-empty strong { display: block; margin-bottom: 7px; color: #fff; font-size: 18px; }
      .command {
        position: fixed;
        left: 14px;
        bottom: 18px;
        z-index: 9;
        width: 290px;
        height: 66px;
        display: grid;
        grid-template-columns: 34px 1fr 32px;
        align-items: center;
        gap: 10px;
        padding: 0 13px;
        border-radius: 22px;
        background: rgba(11, 17, 29, .9);
        box-shadow: 0 24px 70px rgba(0,0,0,.58), inset 0 1px rgba(255,255,255,.08);
        backdrop-filter: blur(24px);
      }
      .command input { width: 100%; border: 0; outline: 0; background: transparent; color: #fff; font-size: 11px; line-height: 1.4; }
      .command input::placeholder { color: #858c9c; }
      .command button, .dock button {
        border: 0;
        cursor: pointer;
        background: transparent;
      }
      .command button { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,.08); font-size: 15px; }
      .dock {
        position: fixed;
        right: 7%;
        bottom: 18px;
        z-index: 8;
        min-width: 330px;
        height: 66px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 12px;
        border-radius: 23px;
        background: rgba(19, 19, 40, .88);
        box-shadow: 0 25px 80px rgba(0,0,0,.58), 0 0 46px rgba(83,97,255,.14), inset 0 1px rgba(255,255,255,.1);
        backdrop-filter: blur(24px);
      }
      .dock button { padding: 11px 15px; border-radius: 15px; color: var(--soft); font-size: 11px; }
      .dock button.primary { min-width: 126px; color: #fff; background: rgba(63,121,255,.32); box-shadow: 0 0 0 1px rgba(103,157,255,.58), 0 0 26px rgba(60,121,255,.38); }
      .toast {
        position: fixed;
        top: 20px;
        right: 24px;
        z-index: 20;
        max-width: 420px;
        padding: 12px 16px;
        border-radius: 13px;
        background: rgba(18,24,38,.96);
        box-shadow: 0 18px 50px rgba(0,0,0,.48);
        color: var(--soft);
        font-size: 11px;
        display: none;
      }
      .toast.error { color: #ffd0cd; background: rgba(60,18,24,.97); }
      @media (max-width: 1250px) {
        .shell { grid-template-columns: 160px 440px minmax(440px, 1fr); }
        .rail { padding-inline: 18px; }
        .library { padding-left: 24px; }
        .scene { flex-basis: 78px; }
        .dock { right: 4%; }
      }
      @media (max-width: 1040px) {
        body { overflow: auto; min-width: 760px; }
        .shell { height: auto; min-height: 100vh; grid-template-columns: 142px minmax(0,1fr); }
        .rail { position: sticky; top: 0; height: 100vh; }
        .agent { margin-top: min(28vh, 220px); }
        .workspace { grid-column: 2; min-height: 720px; padding-left: 24px; }
        .library { min-height: 760px; }
        .dock { right: 24px; }
      }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>
  </head>
  <body>
    <main class="shell">
      <aside class="rail">
        <div class="wordmark">STAGE</div>
        <div id="project" class="project"><div class="project-mark">C</div><strong>Loading…</strong><span>project</span></div>
        <div class="agent"><div class="agent-orb"></div><div><strong>AR2</strong><small>ONLINE</small></div></div>
      </aside>
      <section class="library">
        <div class="library-head"><strong id="branch-count">Loading branch scenes</strong><span>Scenes refresh per commit</span></div>
        <div id="branches" class="branch-list"></div>
      </section>
      <section class="workspace">
        <div class="compare-head"><strong>Comparing</strong><div id="selections" class="selection-row"></div></div>
        <div id="preview-grid" class="preview-grid"></div>
      </section>
      <form id="command" class="command"><div class="agent-orb"></div><input id="command-input" placeholder="Ask AR2 to open, compare, or refresh a branch…" aria-label="Ask AR2"/><button aria-label="Run command">↑</button></form>
      <div class="dock"><button id="swap">Swap</button><button id="live" class="primary">Live compare</button><button id="refresh">Refresh</button></div>
    </main>
    <div id="toast" class="toast" role="status"></div>
    <script>
      const state = { snapshot: null, selected: [], sceneSelection: {} };
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
          if (!state.selected.length) {
            const available = state.snapshot.branches.filter((branch) => branch.availability === "available");
            state.selected = available.slice(0, 2).map((branch) => branch.name);
          }
          render();
        } catch (error) { showToast(error.message, true); }
      }

      function render() {
        const snapshot = state.snapshot;
        if (!snapshot) return;
        const project = snapshot.projects[0];
        $("project").innerHTML = '<div class="project-mark">C</div><strong>' + escapeHtml(project.name) + '</strong><span>' + escapeHtml(project.repository) + '</span>';
        $("branch-count").textContent = snapshot.branches.length + " active branch preview" + (snapshot.branches.length === 1 ? "" : "s");
        $("branches").innerHTML = snapshot.branches.map((branch) => branchShelf(branch, project, snapshot)).join("");
        renderCompare(snapshot);
      }

      function scenesFor(branch, snapshot) {
        return snapshot.scenes.filter((scene) => scene.projectId === branch.projectId && scene.branch === branch.name && scene.sha === branch.sha);
      }

      function branchShelf(branch, project, snapshot) {
        const sessions = snapshot.sessions.filter((session) => session.branch === branch.name && session.projectId === branch.projectId);
        const live = sessions.find((session) => session.status !== "stopped" && session.status !== "failed");
        const scenes = scenesFor(branch, snapshot);
        const expected = project.preview?.scenes || [];
        const selected = state.selected.includes(branch.name);
        const latest = scenes[0]?.capturedAt;
        const time = latest ? relativeTime(latest) : "capture queued";
        const sceneHtml = scenes.length
          ? scenes.map((scene) => '<button class="scene" data-scene="' + escapeHtml(scene.id) + '" data-branch="' + escapeHtml(branch.name) + '" aria-label="Open ' + escapeHtml(scene.title) + '"><img src="' + escapeHtml(scene.imageUrl) + '" alt="' + escapeHtml(scene.title) + ' scene"/><span>' + escapeHtml(scene.title) + '</span></button>').join("")
          : expected.map((scene) => '<button class="scene empty" data-capture-route="' + escapeHtml(scene.route) + '" data-branch="' + escapeHtml(branch.name) + '"><span>' + escapeHtml(scene.title) + '</span></button>').join("");
        const stateClass = branch.compatibility === "incompatible" ? "incompatible" : "live";
        return '<article class="branch-shelf' + (selected ? ' selected' : '') + '" data-select-branch="' + escapeHtml(branch.name) + '">' +
          '<div class="branch-line"><span class="branch-dot"></span><span class="branch-name">' + escapeHtml(branch.name) + '</span>' + (branch.name === project.baselineBranch ? '<span class="default">Default</span>' : '') + '<span class="refresh-time">' + escapeHtml(time) + '</span></div>' +
          '<div class="branch-meta"><span>' + escapeHtml(shortSha(branch.sha)) + '</span><span>·</span><span class="' + stateClass + '">' + escapeHtml(live ? live.status : branch.availability) + '</span><span>·</span><span>' + escapeHtml(branch.compatibility) + '</span><span>·</span><span>' + scenes.length + ' scene' + (scenes.length === 1 ? '' : 's') + '</span></div>' +
          '<div class="scene-strip">' + sceneHtml + '</div></article>';
      }

      function renderCompare(snapshot) {
        const branches = state.selected.map((name) => snapshot.branches.find((branch) => branch.name === name)).filter(Boolean).slice(0, 2);
        $("selections").innerHTML = branches.map((branch) => '<span class="selection"><span class="branch-dot"></span> ' + escapeHtml(branch.name) + '</span>').join("");
        $("preview-grid").innerHTML = [0, 1].map((index) => previewSlot(branches[index], snapshot)).join("");
      }

      function previewSlot(branch, snapshot) {
        if (!branch) return '<article class="preview"><div class="preview-label">Waiting for AR2</div><div class="device-stage"><div class="device"><div class="device-empty"><div><strong>STAGE</strong>Ask AR2 to choose a branch.</div></div></div></div></article>';
        const session = snapshot.sessions.find((candidate) => candidate.branch === branch.name && candidate.target === "web" && candidate.status !== "stopped" && candidate.status !== "failed");
        const scenes = scenesFor(branch, snapshot);
        const selectedId = state.sceneSelection[branch.name];
        const scene = scenes.find((candidate) => candidate.id === selectedId) || scenes[0];
        let body = '<div class="device-empty"><div><strong>' + escapeHtml(branch.name) + '</strong>AR2 is preparing the first scene for this commit.</div></div>';
        if (session?.status === "live") body = '<iframe title="' + escapeHtml(branch.name) + ' live preview" src="' + escapeHtml(session.previewUrl) + '"></iframe>';
        else if (scene) body = '<img src="' + escapeHtml(scene.imageUrl) + '" alt="' + escapeHtml(scene.title) + ' for ' + escapeHtml(branch.name) + '"/>';
        return '<article class="preview"><div class="preview-label"><span>' + escapeHtml(branch.name) + '</span><span>' + escapeHtml(scene?.title || (session ? session.status : "scene pending")) + '</span></div><div class="device-stage"><div class="device">' + body + '</div></div></article>';
      }

      function chooseBranch(branch) {
        if (state.selected.includes(branch)) state.selected = state.selected.filter((name) => name !== branch);
        else state.selected = [...state.selected.slice(-1), branch];
        render();
      }

      async function start(branch, target) {
        return api("/api/sessions", { method: "POST", body: JSON.stringify({ projectId: state.snapshot.projects[0].id, branch, target }) });
      }

      async function liveCompare() {
        if (!state.selected.length) return showToast("Ask AR2 to select at least one branch.");
        await Promise.all(state.selected.map((branch) => start(branch, "web")));
        showToast("AR2 started the live comparison.");
        await refresh();
      }

      async function runCommand(value) {
        const command = value.trim().toLowerCase();
        if (!command) return;
        const matches = state.snapshot.branches.filter((branch) => command.includes(branch.name.toLowerCase()) || command.includes(branch.name.split("/").pop().toLowerCase()));
        if (command.startsWith("open ") && matches[0]) {
          const session = await start(matches[0].name, "dev-client");
          window.location.href = session.devClientUrl;
          return;
        }
        if (command.includes("compare") && matches.length) {
          state.selected = matches.slice(0, 2).map((branch) => branch.name);
          await liveCompare();
          return;
        }
        if (command.includes("refresh") && (matches[0] || state.selected[0])) {
          await start(matches[0]?.name || state.selected[0], "web");
          showToast("AR2 queued a fresh scene capture for the current commit.");
          await refresh();
          return;
        }
        showToast("Try “compare arena and flighty”, “open main”, or “refresh arena”.");
      }

      document.addEventListener("click", (event) => {
        const scene = event.target.closest("[data-scene]");
        if (scene) {
          event.stopPropagation();
          state.sceneSelection[scene.dataset.branch] = scene.dataset.scene;
          if (!state.selected.includes(scene.dataset.branch)) chooseBranch(scene.dataset.branch);
          else renderCompare(state.snapshot);
          return;
        }
        const queued = event.target.closest("[data-capture-route]");
        if (queued) {
          event.stopPropagation();
          showToast("AR2 will capture " + queued.textContent.trim() + " on the next scene pass.");
          return;
        }
        const shelf = event.target.closest("[data-select-branch]");
        if (shelf) chooseBranch(shelf.dataset.selectBranch);
      });
      $("command").addEventListener("submit", async (event) => {
        event.preventDefault();
        try { await runCommand($("command-input").value); $("command-input").value = ""; }
        catch (error) { showToast(error.message, true); }
      });
      $("swap").addEventListener("click", () => { state.selected = [...state.selected].reverse(); render(); });
      $("live").addEventListener("click", () => { liveCompare().catch((error) => showToast(error.message, true)); });
      $("refresh").addEventListener("click", () => { refresh().then(() => showToast("Branch scenes are current.")); });
      function relativeTime(value) {
        const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
        if (seconds < 60) return "just now";
        if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
        if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
        return Math.floor(seconds / 86400) + "d ago";
      }
      function showToast(message, isError) {
        const node = $("toast");
        node.textContent = message;
        node.className = "toast" + (isError ? " error" : "");
        node.style.display = "block";
        window.setTimeout(() => { node.style.display = "none"; }, 4200);
      }
      refresh();
      window.setInterval(refresh, 5000);
    </script>
  </body>
</html>`;
}
