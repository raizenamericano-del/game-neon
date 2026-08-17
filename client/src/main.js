import "./styles.css";
import { api } from "./api.js";
import { audio } from "./audio.js";
import { Game } from "./game/engine.js";
import { Editor } from "./game/editor.js";
import { OFFICIAL, getOfficial, makeDaily } from "./game/levels.js";
import {
  $, $$, toast, showView, openModal, closeModal, renderLevels, renderLeaderboard,
  renderProfile, renderAchievements, renderCustom, authForm, overlayPause, overlayWin,
  applyUserChip, hydrateProgress,
} from "./ui.js";

const state = {
  view: "boot",
  progress: {},
  practice: false,
  current: null,
  daily: null,
  settings: api.settings(),
  editor: null,
  game: null,
};

function applySettings() {
  audio.setVolumes(state.settings.master, state.settings.music, state.settings.sfx);
  document.body.classList.toggle("reduce", !!state.settings.reduce);
  if (state.game) {
    state.game.settings = {
      shake: state.settings.shake,
      particles: state.settings.particles,
      trail: state.settings.trail,
      flash: state.settings.flash,
    };
    state.game.fx.enabled = state.settings.particles;
  }
  api.saveSettings(state.settings);
}

async function boot() {
  $("#vol-master").value = state.settings.master;
  $("#vol-music").value = state.settings.music;
  $("#vol-sfx").value = state.settings.sfx;
  $("#opt-shake").checked = state.settings.shake;
  $("#opt-particles").checked = state.settings.particles;
  $("#opt-trail").checked = state.settings.trail;
  $("#opt-flash").checked = state.settings.flash;
  $("#opt-reduce").checked = state.settings.reduce;
  applySettings();

  const statuses = ["calibrating thrusters…", "syncing pulse grid…", "warming neon…", "ready."];
  statuses.forEach((s, i) => setTimeout(() => { $("#boot-status").textContent = s; }, 350 * (i + 1)));

  const health = await api.health();
  if (api.user()) {
    try {
      const { user } = await api.me();
      api.setSession(api.token(), user);
    } catch {
      api.clearSession();
    }
  }
  state.progress = await hydrateProgress();
  applyUserChip();
  fillLevelSelect();
  api.connectSocket();
  if (api.socket) {
    api.socket.on("online", (d) => { $("#btn-online").textContent = `● ${d.count}`; });
    api.socket.on("leaderboard:update", () => toast("Leaderboard", "Live update received"));
  }
  $("#btn-online").textContent = `● ${health.online || 0}`;

  setTimeout(() => {
    showView("menu");
    state.view = "menu";
  }, 1700);
}

function fillLevelSelect() {
  $("#lb-select").innerHTML = OFFICIAL.map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
}

function bindUI() {
  $$("#view-menu [data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => go("menu")));
  $("#btn-play").onclick = () => go("levels");
  $("#btn-daily").onclick = playDaily;
  $("#btn-user").onclick = () => go("profile");
  $("#btn-logout").onclick = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    api.clearSession();
    applyUserChip();
    toast("Signed out");
    go("profile");
  };
  $("#practice-toggle").onclick = () => {
    state.practice = !state.practice;
    $("#practice-toggle").textContent = state.practice ? "PRACTICE" : "NORMAL";
  };
  $("#level-list").addEventListener("click", (e) => {
    const card = e.target.closest("[data-id]");
    if (card) playOfficial(card.dataset.id);
  });
  $("#btn-pause").onclick = () => {
    if (!state.game) return;
    state.game.paused = true;
    showOverlay(overlayPause());
  };
  $("#overlay").addEventListener("click", (e) => {
    const act = e.target.closest("[data-ov]")?.dataset.ov;
    if (!act) return;
    handleOverlay(act);
  });
  $("#lb-tabs").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    $$("#lb-tabs button").forEach((b) => b.classList.toggle("on", b === t));
    loadLeaderboard(t.dataset.tab);
  });
  $("#lb-select").onchange = () => loadLeaderboard("level");
  $("#custom-tabs").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    $$("#custom-tabs button").forEach((b) => b.classList.toggle("on", b === t));
    const ed = t.dataset.tab === "editor";
    $("#custom-browse").classList.toggle("hidden", ed);
    $("#custom-editor").classList.toggle("hidden", !ed);
    if (ed) ensureEditor();
  });
  $("#btn-new-level").onclick = () => {
    $$("#custom-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === "editor"));
    $("#custom-browse").classList.add("hidden");
    $("#custom-editor").classList.remove("hidden");
    ensureEditor();
    state.editor?.load([]);
  };
  $("#custom-browse").addEventListener("click", async (e) => {
    const play = e.target.closest("[data-play-custom]");
    const like = e.target.closest("[data-like-custom]");
    if (play) {
      try {
        const { level } = await api.customGet(play.dataset.playCustom);
        const data = level.data;
        startLevel({
          id: `custom-${level.id}`,
          name: level.name,
          difficulty: level.difficulty,
          stars: 0,
          coins: 3,
          speed: data.speed || 10.4,
          color: data.color || OFFICIAL[0].color,
          ceiling: 10,
          length: data.length,
          objects: data.objects,
        });
      } catch (err) { toast("Couldn't load level", err.message); }
    }
    if (like) {
      try {
        await api.customLike(like.dataset.likeCustom);
        loadCustom();
      } catch (err) { toast("Login required", err.message); }
    }
  });
  $("#ed-test").onclick = () => {
    ensureEditor();
    const name = $("#ed-name").value || "Untitled";
    const diff = Number($("#ed-diff").value) || 3;
    const data = state.editor.toLevel(name, diff);
    startLevel({
      id: "draft",
      name,
      difficulty: diff,
      stars: 0,
      coins: 0,
      speed: data.speed,
      color: data.color,
      ceiling: 10,
      length: data.length,
      objects: data.objects,
    });
  };
  $("#ed-pub").onclick = publishLevel;

  document.body.addEventListener("click", () => {
    audio.unlock();
    if (state.view !== "boot") audio.startMusic();
  }, { once: false });

  $("#profile-body").addEventListener("click", (e) => {
    if (e.target.id === "open-register") showAuth("register");
    if (e.target.id === "open-login") showAuth("login");
  });
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
    if (e.target.id === "modal-cancel") closeModal();
    if (e.target.id === "auth-switch") {
      const next = $("#auth-form input[name='username']") ? "login" : "register";
      showAuth(next);
    }
  });

  for (const id of ["vol-master", "vol-music", "vol-sfx"]) {
    $(`#${id}`).addEventListener("input", syncSettings);
  }
  for (const id of ["opt-shake", "opt-particles", "opt-trail", "opt-flash", "opt-reduce"]) {
    $(`#${id}`).addEventListener("change", syncSettings);
  }
}

function syncSettings() {
  state.settings = {
    master: Number($("#vol-master").value),
    music: Number($("#vol-music").value),
    sfx: Number($("#vol-sfx").value),
    shake: $("#opt-shake").checked,
    particles: $("#opt-particles").checked,
    trail: $("#opt-trail").checked,
    flash: $("#opt-flash").checked,
    reduce: $("#opt-reduce").checked,
  };
  applySettings();
}

function go(view) {
  audio.click();
  state.view = view;
  showView(view);
  if (view === "levels") renderLevels(state.progress);
  if (view === "leaderboard") loadLeaderboard("level");
  if (view === "profile") loadProfile();
  if (view === "achievements") loadAchievements();
  if (view === "custom") loadCustom();
  if (view !== "game" && state.game) {
    /* keep running only on game view */
  }
}

function showAuth(mode) {
  openModal(authForm(mode));
  $("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = mode === "register" ? await api.register(body) : await api.login(body);
      api.setSession(res.token, res.user);
      applyUserChip();
      closeModal();
      toast("Welcome", res.user.username);
      state.progress = await hydrateProgress();
      go("profile");
    } catch (err) {
      toast("Auth failed", err.message);
    }
  };
}

function ensureGame() {
  if (state.game) return state.game;
  const canvas = $("#game");
  state.game = new Game(canvas, {
    onHud: ({ percent, attempt }) => {
      $("#hud-percent").textContent = `${Math.floor(percent)}%`;
      $("#hud-attempts").textContent = `ATTEMPT ${attempt}`;
      $("#hud-bar").style.width = `${percent}%`;
    },
    onAttempt: (n) => { $("#hud-attempts").textContent = `ATTEMPT ${n}`; },
    onPause: (paused) => {
      if (paused) showOverlay(overlayPause());
      else hideOverlay();
    },
    onToast: (m) => toast(m),
    onSubmit: (payload) => submitRun(payload),
    onWin: (payload) => {
      submitRun(payload);
      showOverlay(overlayWin(payload, state.current));
    },
  });
  applySettings();
  return state.game;
}

function showOverlay(html) {
  $("#overlay-card").innerHTML = html;
  $("#overlay").classList.remove("hidden");
}
function hideOverlay() {
  $("#overlay").classList.add("hidden");
}

function handleOverlay(act) {
  if (act === "resume") {
    hideOverlay();
    if (state.game) state.game.paused = false;
  } else if (act === "retry") {
    hideOverlay();
    state.game?.retry();
  } else if (act === "quit") {
    hideOverlay();
    state.game?.stop();
    go("levels");
    audio.startMusic();
  } else if (act === "next") {
    hideOverlay();
    const idx = OFFICIAL.findIndex((l) => l.id === state.current?.id);
    if (idx >= 0 && idx < OFFICIAL.length - 1) playOfficial(OFFICIAL[idx + 1].id);
    else {
      state.game?.stop();
      go("levels");
    }
  }
}

async function playOfficial(id) {
  const level = getOfficial(id);
  if (!level) return;
  let ghost = [];
  try {
    if (api.user()) {
      const r = await api.replay(id);
      ghost = r.ghost || r.own || [];
    }
  } catch { /* offline */ }
  startLevel(level, ghost);
}

async function playDaily() {
  try {
    const d = await api.daily();
    state.daily = d;
    const level = makeDaily(d.seed, d.date);
    startLevel(level);
  } catch {
    const key = new Date().toISOString().slice(0, 10);
    startLevel(makeDaily(Number(key.replace(/-/g, "")), key));
  }
}

function startLevel(level, ghost = []) {
  audio.unlock();
  audio.startMusic();
  state.current = level;
  showView("game");
  state.view = "game";
  $("#hud-level").textContent = level.name.toUpperCase();
  hideOverlay();
  const g = ensureGame();
  g.resize();
  g.load(level, { practice: state.practice && !level.daily, ghost, attempt: (state.progress[level.id]?.attempts || 0) + 1 });
  g.start();
  if (api.socket) api.socket.emit("join-level", level.id);
}

async function submitRun(payload) {
  if (!state.current || state.current.id === "draft") return;
  const stars = payload.completed && !payload.practice ? state.current.stars || 0 : 0;
  api.saveLocalProgress(state.current.id, { ...payload, stars });
  state.progress = api.localProgress();
  if (!api.user()) return;
  try {
    const res = await api.submit({
      levelId: state.current.id,
      percentage: payload.percentage,
      attempts: payload.attempts || 1,
      jumps: payload.jumps || 0,
      timeMs: payload.timeMs || 0,
      coins: payload.coins || 0,
      died: !!payload.died,
      completed: !!payload.completed,
      practice: !!payload.practice,
      replayData: payload.completed ? payload.replayData : undefined,
    });
    if (res.unlocked?.length) {
      toast("Medal unlocked", res.unlocked.join(", "));
    }
    if (res.starDelta) toast(`+${res.starDelta} stars`);
    if (res.progress) {
      const u = api.user();
      if (u) {
        try {
          const { user } = await api.me();
          api.setSession(api.token(), user);
          applyUserChip();
        } catch { /* ignore */ }
      }
    }
  } catch {
    /* queued locally */
  }
}

async function loadLeaderboard(tab) {
  try {
    if (tab === "global") {
      renderLeaderboard(await api.globalBoard(), "global");
    } else {
      renderLeaderboard(await api.leaderboard($("#lb-select").value), "level");
    }
  } catch {
    renderLeaderboard({ entries: [] }, tab);
    toast("Offline", "Leaderboard unavailable");
  }
}

async function loadProfile() {
  const u = api.user();
  if (!u) {
    renderProfile(null);
    return;
  }
  try {
    const data = await api.profile(u.username);
    renderProfile(data.user, data.progress, data.achievements);
  } catch {
    renderProfile(u, Object.values(state.progress), []);
  }
}

async function loadAchievements() {
  try {
    const { achievements } = await api.achievements();
    renderAchievements(achievements);
  } catch {
    renderAchievements([]);
    toast("Offline", "Medals need a server connection");
  }
}

async function loadCustom() {
  try {
    const { levels } = await api.customList("hot");
    renderCustom(levels);
  } catch {
    renderCustom([]);
  }
}

function ensureEditor() {
  if (state.editor) {
    state.editor.draw();
    return state.editor;
  }
  state.editor = new Editor($("#editor-canvas"), $("#editor-toolbar"));
  return state.editor;
}

async function publishLevel() {
  if (!api.user()) {
    showAuth("login");
    toast("Login required", "Publish needs an account");
    return;
  }
  ensureEditor();
  const name = $("#ed-name").value.trim();
  const difficulty = Number($("#ed-diff").value) || 3;
  if (name.length < 2) return toast("Name required");
  const data = state.editor.toLevel(name, difficulty);
  if (!data.objects.length) return toast("Empty level");
  try {
    await api.customCreate({ name, description: "Built in NEON DASH editor", difficulty, data });
    toast("Published", name);
    loadCustom();
    $$("#custom-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === "browse"));
    $("#custom-browse").classList.remove("hidden");
    $("#custom-editor").classList.add("hidden");
  } catch (err) {
    toast("Publish failed", err.message);
  }
}

bindUI();
boot();
