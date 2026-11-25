let memoryToken = "";

export function setAuthToken(token) {
  memoryToken = typeof token === "string" ? token : "";
}

export function clearAuthToken() {
  memoryToken = "";
}

async function request(path, options = {}, timeoutMs = 20000) {
  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "EntrepreneurAI",
    ...(options.headers || {}),
  };

  if (memoryToken) {
    headers.Authorization = `Bearer ${memoryToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw new Error("Request timed out waiting for the server. Please try again.");
    }
    throw new Error(err?.message || "Network error. Please check your connection and retry.");
  }
  clearTimeout(timer);

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text || "Unexpected server response." };
  }

  if (!res.ok) {
    const err = new Error(data.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request("/api/health"),
  register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  getMe: () => request("/api/auth/me"),
  updateSettings: (payload) => request("/api/auth/settings", { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: () => request("/api/auth/account", { method: "DELETE" }),

  getProfile: () => request("/api/profile"),
  updateProfile: (payload) => request("/api/profile", { method: "PUT", body: JSON.stringify(payload) }),
  getDashboard: () => request("/api/dashboard"),

  listRecommendations: (savedOnly = false) =>
    request(`/api/recommendations${savedOnly ? "?saved_only=true" : ""}`),
  generateRecommendations: (payload) =>
    request("/api/recommendations/generate", { method: "POST", body: JSON.stringify(payload) }, 55000),
  toggleSaveRecommendation: (id) =>
    request(`/api/recommendations/${encodeURIComponent(id)}/save`, { method: "PATCH" }),
  deleteRecommendation: (id) =>
    request(`/api/recommendations/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listMarketAnalyses: () => request("/api/market-analysis"),
  generateMarketAnalysis: (payload) =>
    request("/api/market-analysis/generate", { method: "POST", body: JSON.stringify(payload) }, 55000),

  listFinancialScenarios: () => request("/api/financial-analysis"),
  calculateFinancials: (payload) =>
    request("/api/financial-analysis/calculate", { method: "POST", body: JSON.stringify(payload) }),
  deleteFinancialScenario: (id) =>
    request(`/api/financial-analysis/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listBusinessPlans: () => request("/api/business-plans"),
  generateBusinessPlan: (payload) =>
    request("/api/business-plans/generate", { method: "POST", body: JSON.stringify(payload) }, 55000),
  deleteBusinessPlan: (id) =>
    request(`/api/business-plans/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listRoadmaps: () => request("/api/roadmaps"),
  generateRoadmap: (payload) =>
    request("/api/roadmaps/generate", { method: "POST", body: JSON.stringify(payload) }, 55000),
  toggleRoadmapTask: (roadmapId, taskId) =>
    request(`/api/roadmaps/${encodeURIComponent(roadmapId)}/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
    }),
  deleteRoadmap: (id) =>
    request(`/api/roadmaps/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getChatHistory: () => request("/api/chat/history"),
  sendChatMessage: (payload) =>
    request("/api/chat/message", { method: "POST", body: JSON.stringify(payload) }, 55000),
  clearChatHistory: () => request("/api/chat/history", { method: "DELETE" }),

  listSchemes: (category = "", q = "") => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    return request(`/api/schemes${qs ? `?${qs}` : ""}`);
  },
};
