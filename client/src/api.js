const TOKEN_KEY = "nd_token";
const USER_KEY = "nd_user";
const LOCAL_PROGRESS = "nd_progress";
const LOCAL_SETTINGS = "nd_settings";

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(path, { ...opts, headers, credentials: "include" });
  } catch {
    const err = new Error("offline");
    err.offline = true;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  online: true,
  socket: null,

  async health() {
    try {
      const h = await req("/api/health");
      this.online = true;
      return h;
    } catch {
      this.online = false;
      return { ok: false, db: "down", online: 0 };
    }
  },

  token,
  user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  },
  setSession(tokenValue, user) {
    if (tokenValue) localStorage.setItem(TOKEN_KEY, tokenValue);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  register: (body) => req("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => req("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => req("/api/auth/logout", { method: "POST", body: "{}" }),
  me: () => req("/api/auth/me"),
  patchMe: (body) => req("/api/auth/me", { method: "PATCH", body: JSON.stringify(body) }),

  levels: () => req("/api/levels"),
  progress: () => req("/api/progress"),
  submit: (body) => req("/api/progress", { method: "POST", body: JSON.stringify(body) }),
  replay: (levelId) => req(`/api/progress/replay/${levelId}`),
  leaderboard: (levelId) => req(`/api/leaderboard/${encodeURIComponent(levelId)}`),
  globalBoard: () => req("/api/leaderboard/global"),
  profile: (username) => req(`/api/profile/${encodeURIComponent(username)}`),
  achievements: () => req("/api/achievements"),
  daily: () => req("/api/daily"),
  customList: (sort = "hot") => req(`/api/custom?sort=${sort}`),
  customGet: (id) => req(`/api/custom/${id}`),
  customCreate: (body) => req("/api/custom", { method: "POST", body: JSON.stringify(body) }),
  customLike: (id) => req(`/api/custom/${id}/like`, { method: "POST", body: "{}" }),
  adminStats: () => req("/api/admin/stats"),

  localProgress() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_PROGRESS) || "{}");
    } catch {
      return {};
    }
  },
  saveLocalProgress(levelId, patch) {
    const all = this.localProgress();
    const prev = all[levelId] || {
      bestPercentage: 0,
      attempts: 0,
      stars: 0,
      coins: 0,
      completed: false,
      bestTimeMs: null,
    };
    const next = {
      ...prev,
      ...patch,
      bestPercentage: Math.max(prev.bestPercentage, patch.percentage ?? 0),
      attempts: prev.attempts + (patch.died || patch.completed ? 1 : 0),
      coins: Math.max(prev.coins || 0, patch.coins || 0),
      completed: prev.completed || !!patch.completed,
      stars: Math.max(prev.stars || 0, patch.stars || 0),
      bestTimeMs:
        patch.completed
          ? Math.min(prev.bestTimeMs || patch.timeMs, patch.timeMs)
          : prev.bestTimeMs,
    };
    all[levelId] = next;
    localStorage.setItem(LOCAL_PROGRESS, JSON.stringify(all));
    return next;
  },
  settings() {
    try {
      return {
        master: 80,
        music: 55,
        sfx: 85,
        shake: true,
        particles: true,
        trail: true,
        flash: true,
        reduce: false,
        ...JSON.parse(localStorage.getItem(LOCAL_SETTINGS) || "{}"),
      };
    } catch {
      return { master: 80, music: 55, sfx: 85, shake: true, particles: true, trail: true, flash: true, reduce: false };
    }
  },
  saveSettings(s) {
    localStorage.setItem(LOCAL_SETTINGS, JSON.stringify(s));
  },

  connectSocket() {
    if (this.socket || typeof window === "undefined") return null;
    try {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const url = `${location.origin.replace(/^http/, proto === "wss" ? "https" : "http")}`;
      import("https://cdn.socket.io/4.8.1/socket.io.esm.min.js")
        .then(({ io }) => {
          this.socket = io(url, { path: "/socket.io", transports: ["websocket", "polling"] });
          const t = token();
          this.socket.on("connect", () => {
            if (t) this.socket.emit("auth", t);
          });
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
    return this.socket;
  },
};
