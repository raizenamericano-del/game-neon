import { api } from "./api.js";
import { audio } from "./audio.js";
import { OFFICIAL, getOfficial, makeDaily } from "./game/levels.js";

export function $(sel, root = document) {
  return root.querySelector(sel);
}
export function $$(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function toast(title, msg = "") {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<b>${esc(title)}</b>${msg ? `<div>${esc(msg)}</div>` : ""}`;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function showView(id) {
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${id}`));
  history.replaceState(null, "", `#${id}`);
}

export function openModal(html) {
  $("#modal-card").innerHTML = html;
  $("#modal").classList.remove("hidden");
}
export function closeModal() {
  $("#modal").classList.add("hidden");
}

export function stars(n) {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - Math.min(5, n)));
}

export function fmtTime(ms) {
  if (ms == null) return "—";
  const s = ms / 1000;
  return s.toFixed(2) + "s";
}

export function avatar(name, color) {
  return `<span class="avatar" style="background:${color || "#00f5ff"}">${esc((name || "?")[0].toUpperCase())}</span>`;
}

export function renderLevels(progress) {
  const list = $("#level-list");
  list.innerHTML = OFFICIAL.map((l, i) => {
    const p = progress[l.id] || {};
    const locked = i > 0 && !(progress[OFFICIAL[i - 1].id]?.completed) && (progress[OFFICIAL[i - 1].id]?.bestPercentage || 0) < 50;
    const pct = Math.floor(p.bestPercentage || 0);
    return `<button class="level-card" data-id="${l.id}" ${locked ? "disabled style='opacity:.45'" : ""}>
      <div class="num" style="color:${l.color.accent}">${String(i + 1).padStart(2, "0")}</div>
      <div>
        <h3>${esc(l.name)}</h3>
        <div class="meta">
          <span class="stars">${"★".repeat(l.stars)}</span>
          <span class="diff">${Array.from({ length: 10 }, (_, d) => `<i class="${d < l.difficulty ? "on" : ""}"></i>`).join("")}</span>
        </div>
      </div>
      <div class="pct">${p.completed ? "CLEAR" : pct + "%"}</div>
    </button>`;
  }).join("");
}

export function renderLeaderboard(data, mode) {
  const body = $("#lb-body");
  if (mode === "global") {
    body.innerHTML = (data.entries || []).map((e) => `
      <div class="row">
        <span class="rank">#${e.rank}</span>
        <div class="who">${avatar(e.username, e.avatarColor)} <b>${esc(e.username)}</b></div>
        <span>${e.totalStars} ★ · ${e.levelsBeaten} clears</span>
      </div>`).join("") || `<p class="muted">No pilots ranked yet. Be first.</p>`;
    return;
  }
  body.innerHTML = (data.entries || []).map((e) => `
    <div class="row">
      <span class="rank">#${e.rank}</span>
      <div class="who">${avatar(e.username, e.avatarColor)} <b>${esc(e.username)}</b></div>
      <span>${fmtTime(e.timeMs)} · ${e.attempts} att · ${e.coins || 0}◆</span>
    </div>`).join("") || `<p class="muted">No clears yet. First blood is yours.</p>`;
}

export function renderProfile(user, progress, achievements) {
  const body = $("#profile-body");
  if (!user) {
    body.innerHTML = `
      <h2>GUEST PILOT</h2>
      <p class="muted">Create an account to sync stars, climb the board, and publish levels.</p>
      <div class="overlay-actions">
        <button class="btn primary" id="open-register">REGISTER</button>
        <button class="btn" id="open-login">LOG IN</button>
      </div>`;
    return;
  }
  const rows = (progress || []).map((p) => {
    const lvl = OFFICIAL.find((l) => l.id === p.levelId);
    return `<div class="row"><span>${esc(lvl?.name || p.levelId)}</span><span>${p.completed ? "CLEAR" : Math.floor(p.bestPercentage) + "%"} · ${p.stars}★</span></div>`;
  }).join("");
  body.innerHTML = `
    <div class="who" style="margin-bottom:12px">${avatar(user.username, user.avatarColor)} <div><h2>${esc(user.username)}</h2><p class="muted">${esc(user.bio || "No bio yet.")}</p></div></div>
    <div class="stats">
      <div class="stat"><b>${user.totalStars}</b><span>STARS</span></div>
      <div class="stat"><b>${user.levelsBeaten}</b><span>CLEARS</span></div>
      <div class="stat"><b>${user.totalAttempts}</b><span>ATTEMPTS</span></div>
      <div class="stat"><b>${user.totalDeaths}</b><span>DEATHS</span></div>
    </div>
    ${rows || "<p class='muted'>No runs uploaded yet.</p>"}
    <p class="muted tiny" style="margin-top:12px">${(achievements || []).length} medals unlocked</p>`;
}

export function renderAchievements(list) {
  $("#ach-body").innerHTML = (list || []).map((a) => `
    <div class="ach ${a.unlocked ? "on" : ""}">
      <div class="ic">${a.icon}</div>
      <div><h4>${esc(a.name)}</h4><p>${esc(a.description)}</p></div>
    </div>`).join("");
}

export function renderCustom(list) {
  $("#custom-browse").innerHTML = (list || []).map((l) => `
    <div class="row">
      <div>
        <b>${esc(l.name)}</b>
        <div class="muted tiny">by ${esc(l.author?.username || "?")} · d${l.difficulty} · ${l.plays} plays · ${l.likes} likes</div>
      </div>
      <div class="overlay-actions">
        <button class="btn" data-play-custom="${l.id}">PLAY</button>
        <button class="btn" data-like-custom="${l.id}">${l.liked ? "♥" : "♡"}</button>
      </div>
    </div>`).join("") || `<p class="muted">Workshop is empty. Build the first track.</p>`;
}

export function authForm(mode) {
  const isReg = mode === "register";
  return `
    <h2>${isReg ? "CREATE PILOT" : "LOG IN"}</h2>
    <p>${isReg ? "Sync progress and hit the global board." : "Welcome back, cube jockey."}</p>
    <form class="form" id="auth-form">
      ${isReg ? `<input name="username" placeholder="username" required minlength="3" maxlength="20" />` : ""}
      <input name="${isReg ? "email" : "login"}" placeholder="${isReg ? "email" : "email or username"}" required />
      <input name="password" type="password" placeholder="password" required minlength="6" />
      <div class="modal-actions">
        <button class="btn" type="button" id="modal-cancel">CANCEL</button>
        <button class="btn primary" type="submit">${isReg ? "REGISTER" : "ENTER"}</button>
      </div>
    </form>
    <p class="muted tiny" style="margin-top:10px">${isReg ? "Already flying?" : "New here?"}
      <button class="btn" id="auth-switch" type="button">${isReg ? "LOG IN" : "REGISTER"}</button>
    </p>`;
}

export function overlayPause() {
  return `<h2>PAUSED</h2>
    <p>SPACE jump · again in air for double<br/>S slide · SHIFT dash · E aegis · Q overclock · F nova</p>
    <div class="overlay-actions">
      <button class="btn primary" data-ov="resume">RESUME</button>
      <button class="btn" data-ov="retry">RETRY</button>
      <button class="btn" data-ov="quit">QUIT</button>
    </div>`;
}

export function overlayWin(payload, level) {
  return `<h2>CLEARED</h2>
    <p>${esc(level.name)} · ${fmtTime(payload.timeMs)} · ${payload.attempts} attempts · ${payload.coins}/3 ◆</p>
    <p class="stars">${"★".repeat(payload.stars || 0)}</p>
    <div class="overlay-actions">
      <button class="btn primary" data-ov="next">NEXT</button>
      <button class="btn" data-ov="retry">AGAIN</button>
      <button class="btn" data-ov="quit">MENU</button>
    </div>`;
}

export function applyUserChip() {
  const u = api.user();
  $("#btn-user").textContent = u ? u.username.toUpperCase() : "GUEST";
  $("#btn-logout").hidden = !u;
}

export async function hydrateProgress() {
  const local = api.localProgress();
  if (!api.user()) return local;
  try {
    const { progress } = await api.progress();
    const map = { ...local };
    for (const p of progress) {
      const prev = map[p.levelId];
      map[p.levelId] = {
        ...p,
        bestPercentage: Math.max(prev?.bestPercentage || 0, p.bestPercentage),
      };
    }
    return map;
  } catch {
    return local;
  }
}

export { getOfficial, makeDaily, OFFICIAL };
