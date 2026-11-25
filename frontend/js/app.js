import { api, clearAuthToken, setAuthToken } from "./api.js";
import { destroyAllCharts, renderDashboardMiniChart, renderFinancialCharts } from "./charts.js";
import { downloadBusinessPlanPdf } from "./pdf.js";
import { resetPrivateState, state } from "./state.js";
import { escapeHtml, parseCsvList } from "./utils.js";
import { renderFinancialAnalysisView, renderMarketAnalysisView, renderSchemesView } from "./views/analysis_pages.js";
import {
  renderDashboardView,
  renderDiscoverView,
  renderProfileView,
  renderRecommendationsView,
} from "./views/dashboard_pages.js";
import {
  renderBusinessPlansView,
  renderRoadmapView,
  renderSettingsView,
  renderVentureBotView,
} from "./views/execution_pages.js";
import { renderLandingPage } from "./views/landing.js";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
  { id: "profile", label: "My Profile", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { id: "discover", label: "Discover Startups", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>' },
  { id: "recommendations", label: "Recommendations", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' },
  { id: "market", label: "Market Analysis", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>' },
  { id: "financial", label: "Financial Analysis", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { id: "schemes", label: "Government Schemes", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg>' },
  { id: "plans", label: "Business Plans", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { id: "roadmap", label: "Startup Roadmap", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
  { id: "venturebot", label: "VentureBot", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
];

const FOOTER_NAV = [
  { id: "settings", label: "Settings", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
];

let confirmDeleteModalOpen = false;

function showToast(message, type = "info") {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "toast-error" : type === "success" ? "toast-success" : ""}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4200);
}

async function loadWorkspaceData() {
  const [dashRes, profRes, recRes, mktRes, finRes, planRes, rmRes, chatRes, schRes] = await Promise.all([
    api.getDashboard(),
    api.getProfile(),
    api.listRecommendations(false),
    api.listMarketAnalyses(),
    api.listFinancialScenarios(),
    api.listBusinessPlans(),
    api.listRoadmaps(),
    api.getChatHistory(),
    api.listSchemes(state.schemeCategory, state.schemeSearch),
  ]);

  state.dashboard = dashRes;
  state.profile = profRes.profile;
  state.profileCompletion = profRes.completion_percentage;
  state.recommendations = recRes.recommendations || [];
  state.marketAnalyses = mktRes.analyses || [];
  state.financialScenarios = finRes.scenarios || [];
  if (!state.activeFinancialScenario && state.financialScenarios.length > 0) {
    state.activeFinancialScenario = state.financialScenarios[0];
  }
  state.businessPlans = planRes.plans || [];
  state.roadmaps = rmRes.roadmaps || [];
  state.chatMessages = chatRes.messages || [];
  state.schemes = schRes.schemes || [];
}

async function refreshDashboardSummary() {
  try {
    state.dashboard = await api.getDashboard();
  } catch {
    // ignore background refresh error
  }
}

function renderWorkspaceShell() {
  const activeItem = [...NAV_ITEMS, ...FOOTER_NAV].find((n) => n.id === state.route) || NAV_ITEMS[0];
  let pageBody = "";
  switch (state.route) {
    case "dashboard":
      pageBody = renderDashboardView();
      break;
    case "profile":
      pageBody = renderProfileView();
      break;
    case "discover":
      pageBody = renderDiscoverView();
      break;
    case "recommendations":
      pageBody = renderRecommendationsView();
      break;
    case "market":
      pageBody = renderMarketAnalysisView();
      break;
    case "financial":
      pageBody = renderFinancialAnalysisView();
      break;
    case "schemes":
      pageBody = renderSchemesView();
      break;
    case "plans":
      pageBody = renderBusinessPlansView();
      break;
    case "roadmap":
      pageBody = renderRoadmapView();
      break;
    case "venturebot":
      pageBody = renderVentureBotView();
      break;
    case "settings":
      pageBody = renderSettingsView();
      break;
    default:
      pageBody = renderDashboardView();
  }

  return `
    <div class="app-shell">
      <div class="sidebar-overlay ${state.sidebarOpen ? "open" : ""}" id="sidebar-overlay"></div>
      <aside class="sidebar ${state.sidebarOpen ? "open" : ""}" aria-label="Workspace navigation">
        <div class="sidebar-brand">
          <span class="brand-wordmark">Entrepreneur<span>AI</span></span>
        </div>

        <nav class="sidebar-nav">
          ${NAV_ITEMS.map(
            (item) => `
            <button type="button" class="nav-item ${state.route === item.id ? "active" : ""}" data-nav="${item.id}">
              ${item.icon}
              <span>${escapeHtml(item.label)}</span>
            </button>
          `
          ).join("")}
        </nav>

        <div class="sidebar-footer">
          ${FOOTER_NAV.map(
            (item) => `
            <button type="button" class="nav-item ${state.route === item.id ? "active" : ""}" data-nav="${item.id}">
              ${item.icon}
              <span>${escapeHtml(item.label)}</span>
            </button>
          `
          ).join("")}
          <button type="button" class="nav-item" id="logout-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div class="workspace-main">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div class="breadcrumb-title">EntrepreneurAI / ${escapeHtml(activeItem.label)}</div>
          </div>
          <div class="topbar-right">
            <span class="topbar-user">${escapeHtml(state.user?.name || "")}</span>
            <button type="button" class="btn btn-primary btn-sm" data-nav="discover">New AI Ideas</button>
          </div>
        </header>

        <main class="page-content">
          ${pageBody}
        </main>
      </div>
    </div>

    ${
      confirmDeleteModalOpen
        ? `
          <div class="modal-backdrop open" role="dialog" aria-modal="true" aria-labelledby="confirm-del-title">
            <div class="modal-panel">
              <div class="modal-header">
                <div>
                  <h2 id="confirm-del-title" style="font-size:19px;font-weight:700;">Delete Account Permanently?</h2>
                  <p style="margin:6px 0 0;font-size:13.5px;color:var(--slate-600);">This action cannot be undone. All your saved startup recommendations, plans, roadmaps, and chat history will be removed.</p>
                </div>
                <button type="button" class="modal-close" id="cancel-delete-account" aria-label="Close">&times;</button>
              </div>
              <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button type="button" class="btn btn-secondary" id="cancel-delete-account-btn">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirm-delete-account-btn">Yes, Delete Account</button>
              </div>
            </div>
          </div>
        `
        : ""
    }
  `;
}

function render() {
  destroyAllCharts();
  const root = document.getElementById("app");
  if (!root) return;

  if (!state.user) {
    root.innerHTML = renderLandingPage();
    bindLandingHandlers();
    return;
  }

  root.innerHTML = renderWorkspaceShell();
  bindWorkspaceHandlers();

  // Mount Chart.js visualizations after DOM update
  if (state.route === "financial" && state.activeFinancialScenario) {
    renderFinancialCharts(state.activeFinancialScenario);
  } else if (state.route === "dashboard" && state.dashboard?.financial_overview) {
    renderDashboardMiniChart(state.dashboard.financial_overview);
  } else if (state.route === "venturebot") {
    const box = document.getElementById("chat-messages-box");
    if (box) box.scrollTop = box.scrollHeight;
  }
}

function bindLandingHandlers() {
  document.querySelectorAll("[data-open-auth]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.authMode = btn.getAttribute("data-open-auth") || "login";
      state.authModalOpen = true;
      render();
    });
  });

  document.querySelectorAll("[data-close-auth]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.authModalOpen = false;
      render();
    });
  });

  const backdrop = document.getElementById("auth-modal");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        state.authModalOpen = false;
        render();
      }
    });
  }

  document.querySelectorAll("[data-switch-auth]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.authMode = btn.getAttribute("data-switch-auth") || "login";
      render();
    });
  });

  const authForm = document.getElementById("auth-form");
  if (authForm) {
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = document.getElementById("auth-error");
      const submitBtn = document.getElementById("auth-submit-btn");
      const fd = new FormData(authForm);
      const email = String(fd.get("email") || "").trim();
      const password = String(fd.get("password") || "");
      const name = String(fd.get("name") || "").trim();

      if (errBox) errBox.style.display = "none";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Please wait...';
      }

      try {
        const res =
          state.authMode === "register"
            ? await api.register({ name, email, password })
            : await api.login({ email, password });

        setAuthToken(res.access_token);
        state.user = res.user;
        state.authModalOpen = false;
        state.route = state.authMode === "register" ? "profile" : "dashboard";
        await loadWorkspaceData();
        showToast(
          state.authMode === "register" ? "Account created. Complete your founder profile to get started." : "Welcome back!",
          "success"
        );
        render();
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = "block";
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = state.authMode === "login" ? "Sign In" : "Create Account";
        }
      }
    });
  }
}

function bindWorkspaceHandlers() {
  // Navigation
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", async () => {
      const target = el.getAttribute("data-nav");
      if (!target) return;
      state.route = target;
      state.sidebarOpen = false;
      if (target === "dashboard") {
        await refreshDashboardSummary();
      }
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  const menuBtn = document.getElementById("mobile-menu-btn");
  const overlay = document.getElementById("sidebar-overlay");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      state.sidebarOpen = !state.sidebarOpen;
      render();
    });
  }
  if (overlay) {
    overlay.addEventListener("click", () => {
      state.sidebarOpen = false;
      render();
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await api.logout();
      } catch {
        // ignore
      }
      clearAuthToken();
      resetPrivateState();
      state.route = "dashboard";
      showToast("Signed out safely.");
      render();
    });
  }

  // Profile Form
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("prof-save-btn");
      const fb = document.getElementById("profile-feedback");
      const fd = new FormData(profileForm);

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Saving...';
      }
      try {
        const res = await api.updateProfile({
          full_name: String(fd.get("full_name") || "").trim(),
          education: String(fd.get("education") || "").trim(),
          technical_skills: parseCsvList(fd.get("technical_skills")),
          business_skills: parseCsvList(fd.get("business_skills")),
          interests: parseCsvList(fd.get("interests")),
          investment_budget: Number(fd.get("investment_budget") || 0),
          currency: "INR",
          location: String(fd.get("location") || "").trim(),
          business_experience: String(fd.get("business_experience") || ""),
          risk_preference: String(fd.get("risk_preference") || "Moderate"),
        });
        state.profile = res.profile;
        state.profileCompletion = res.completion_percentage;
        if (state.user) state.user.name = res.profile.full_name;
        await refreshDashboardSummary();
        showToast("Founder profile saved.", "success");
        render();
      } catch (err) {
        if (fb) {
          fb.className = "notice-bar notice-bar-error";
          fb.textContent = err.message;
          fb.style.display = "block";
        }
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Save Profile";
        }
      }
    });
  }

  // Discover Startups Form
  const discoverForm = document.getElementById("discover-form");
  if (discoverForm) {
    discoverForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(discoverForm);
      const budgetRaw = String(fd.get("custom_budget") || "").trim();
      state.discoverDraft = {
        education: String(fd.get("education") || "").trim(),
        skills: String(fd.get("skills") || "").trim(),
        focus_sector: String(fd.get("focus_sector") || "").trim(),
        custom_budget: budgetRaw,
        custom_location: String(fd.get("custom_location") || "").trim(),
        additional_notes: String(fd.get("additional_notes") || "").trim(),
      };
      state.discoverError = "";
      state.busy.generateRecs = true;
      render();
      const startedAt = Date.now();
      const timerId = setInterval(() => {
        const el = document.getElementById("gen-elapsed");
        if (el) el.textContent = String(Math.floor((Date.now() - startedAt) / 1000));
      }, 500);
      try {
        const res = await api.generateRecommendations({
          education: state.discoverDraft.education || null,
          skills: state.discoverDraft.skills || null,
          focus_sector: state.discoverDraft.focus_sector || null,
          custom_budget: budgetRaw !== "" ? Number(budgetRaw) : null,
          custom_location: state.discoverDraft.custom_location || null,
          additional_notes: state.discoverDraft.additional_notes || null,
        });
        state.recommendations = [...(res.recommendations || []), ...state.recommendations];
        if (res.profile) state.profile = res.profile;
        if (typeof res.completion_percentage === "number") state.profileCompletion = res.completion_percentage;
        state.discoverDraft = null;
        void refreshDashboardSummary();
        showToast(`Generated ${res.recommendations?.length || 5} personalized startup recommendations.`, "success");
      } catch (err) {
        state.discoverError = err.message || "Failed to generate recommendations.";
        showToast(state.discoverError, "error");
      } finally {
        clearInterval(timerId);
        state.busy.generateRecs = false;
        render();
      }
    });
  }

  // Recommendation Card Actions (Save, Compare, Delete, Cross-Launch)
  document.querySelectorAll("[data-save-rec]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save-rec");
      try {
        const res = await api.toggleSaveRecommendation(id);
        const idx = state.recommendations.findIndex((r) => r.id === id);
        if (idx >= 0) state.recommendations[idx] = res.recommendation;
        await refreshDashboardSummary();
        showToast(res.recommendation.is_saved ? "Startup idea saved." : "Removed from saved ideas.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-compare-rec]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-compare-rec");
      if (state.compareIds.includes(id)) {
        state.compareIds = state.compareIds.filter((x) => x !== id);
      } else {
        if (state.compareIds.length >= 3) {
          showToast("You can compare up to 3 startup ideas at once.", "error");
          return;
        }
        state.compareIds = [...state.compareIds, id];
      }
      if (state.route === "discover" && state.compareIds.length >= 2) {
        state.route = "recommendations";
      }
      render();
    });
  });

  const clearCompareBtn = document.getElementById("clear-compare-btn");
  if (clearCompareBtn) {
    clearCompareBtn.addEventListener("click", () => {
      state.compareIds = [];
      render();
    });
  }

  document.querySelectorAll("[data-delete-rec]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-rec");
      try {
        await api.deleteRecommendation(id);
        state.recommendations = state.recommendations.filter((r) => r.id !== id);
        state.compareIds = state.compareIds.filter((x) => x !== id);
        await refreshDashboardSummary();
        showToast("Recommendation deleted.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-rec-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.recommendationFilter = btn.getAttribute("data-rec-filter") || "all";
      render();
    });
  });

  const recSearch = document.getElementById("rec-search-input");
  if (recSearch) {
    recSearch.addEventListener("input", (e) => {
      state.recommendationSearch = e.target.value;
      render();
      const el = document.getElementById("rec-search-input");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  // Cross-module launchers from recommendation cards
  const launchMap = [
    ["data-launch-market", "market"],
    ["data-launch-financial", "financial"],
    ["data-launch-plan", "plans"],
    ["data-launch-roadmap", "roadmap"],
    ["data-launch-chat", "venturebot"],
  ];
  for (const [attr, route] of launchMap) {
    document.querySelectorAll(`[${attr}]`).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute(attr);
        state.selectedStartupId = id;
        if (route === "venturebot") state.chatStartupId = id;
        if (route === "financial") state.activeFinancialScenario = null;
        state.route = route;
        render();
      });
    });
  }

  // Market Analysis Handlers
  const mktStartupSelect = document.getElementById("mkt-startup-select");
  if (mktStartupSelect) {
    mktStartupSelect.addEventListener("change", () => {
      const rec = state.recommendations.find((r) => r.id === mktStartupSelect.value);
      if (rec) {
        document.getElementById("mkt-topic").value = rec.business_name;
        document.getElementById("mkt-industry").value = rec.industry;
      }
    });
  }

  const mktForm = document.getElementById("market-form");
  if (mktForm) {
    mktForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(mktForm);
      state.busy.market = true;
      render();
      try {
        const res = await api.generateMarketAnalysis({
          startup_id: String(fd.get("startup_id") || "") || null,
          topic: String(fd.get("topic") || "").trim(),
          industry: String(fd.get("industry") || "").trim(),
          location: String(fd.get("location") || "India").trim(),
        });
        state.marketAnalyses = [res.analysis, ...state.marketAnalyses];
        state.activeMarketId = res.analysis.id;
        showToast("Market analysis generated.", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        state.busy.market = false;
        render();
      }
    });
  }

  const mktHist = document.getElementById("mkt-history-select");
  if (mktHist) {
    mktHist.addEventListener("change", () => {
      state.activeMarketId = mktHist.value;
      render();
    });
  }

  // Financial Analysis Handlers
  const finStartupSelect = document.getElementById("fin-startup-select");
  if (finStartupSelect) {
    finStartupSelect.addEventListener("change", () => {
      const rec = state.recommendations.find((r) => r.id === finStartupSelect.value);
      if (rec) {
        document.getElementById("fin-title").value = `${rec.business_name} Estimate`;
        document.getElementById("fin-initial").value = rec.required_investment_inr || 250000;
        document.getElementById("fin-expenses").value = rec.estimated_monthly_expenses_inr || 40000;
        document.getElementById("fin-revenue").value = rec.estimated_monthly_revenue_inr || 70000;
      }
    });
  }

  const finForm = document.getElementById("financial-form");
  if (finForm) {
    finForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(finForm);
      const btn = document.getElementById("fin-calc-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Calculating...';
      }
      try {
        const res = await api.calculateFinancials({
          startup_id: String(fd.get("startup_id") || "") || null,
          title: String(fd.get("title") || "Startup Financial Estimate").trim(),
          initial_investment: Number(fd.get("initial_investment")),
          monthly_expenses: Number(fd.get("monthly_expenses")),
          expected_monthly_revenue: Number(fd.get("expected_monthly_revenue")),
          monthly_growth_rate: Number(fd.get("monthly_growth_rate")),
          projection_months: Number(fd.get("projection_months")),
          save: true,
        });
        state.activeFinancialScenario = res.scenario;
        state.financialScenarios = [res.scenario, ...state.financialScenarios];
        await refreshDashboardSummary();
        showToast("Financial estimate calculated and saved.", "success");
        render();
      } catch (err) {
        showToast(err.message, "error");
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Calculate & Save Estimate";
        }
      }
    });
  }

  document.querySelectorAll("[data-select-fin]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-select-fin");
      const found = state.financialScenarios.find((s) => s.id === id);
      if (found) {
        state.activeFinancialScenario = found;
        render();
      }
    });
  });

  document.querySelectorAll("[data-delete-fin]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-fin");
      try {
        await api.deleteFinancialScenario(id);
        state.financialScenarios = state.financialScenarios.filter((s) => s.id !== id);
        if (state.activeFinancialScenario?.id === id) {
          state.activeFinancialScenario = state.financialScenarios[0] || null;
        }
        await refreshDashboardSummary();
        showToast("Financial scenario deleted.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // Government Schemes Handlers
  document.querySelectorAll("[data-scheme-cat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.schemeCategory = btn.getAttribute("data-scheme-cat") || "All";
      try {
        const res = await api.listSchemes(state.schemeCategory, state.schemeSearch);
        state.schemes = res.schemes || [];
      } catch (err) {
        showToast(err.message, "error");
      }
      render();
    });
  });

  const schemeSearch = document.getElementById("scheme-search-input");
  if (schemeSearch) {
    schemeSearch.addEventListener("input", async (e) => {
      state.schemeSearch = e.target.value;
      try {
        const res = await api.listSchemes(state.schemeCategory, state.schemeSearch);
        state.schemes = res.schemes || [];
      } catch {
        // ignore transient search error
      }
      render();
      const el = document.getElementById("scheme-search-input");
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }

  // Business Plans Handlers
  const planStartupSelect = document.getElementById("plan-startup-select");
  if (planStartupSelect) {
    planStartupSelect.addEventListener("change", () => {
      const rec = state.recommendations.find((r) => r.id === planStartupSelect.value);
      if (rec) {
        document.getElementById("plan-name").value = rec.business_name;
        document.getElementById("plan-industry").value = rec.industry;
      }
    });
  }

  const planForm = document.getElementById("plan-form");
  if (planForm) {
    planForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(planForm);
      state.busy.plan = true;
      render();
      try {
        const res = await api.generateBusinessPlan({
          startup_id: String(fd.get("startup_id") || "") || null,
          business_name: String(fd.get("business_name") || "").trim(),
          industry: String(fd.get("industry") || "").trim(),
          custom_notes: String(fd.get("custom_notes") || "").trim() || null,
        });
        state.businessPlans = [res.plan, ...state.businessPlans];
        state.activePlanId = res.plan.id;
        await refreshDashboardSummary();
        showToast("11-section business plan generated.", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        state.busy.plan = false;
        render();
      }
    });
  }

  const planHist = document.getElementById("plan-history-select");
  if (planHist) {
    planHist.addEventListener("change", () => {
      state.activePlanId = planHist.value;
      render();
    });
  }

  const pdfBtn = document.getElementById("download-plan-pdf-btn");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      const activePlan = state.businessPlans.find((p) => p.id === state.activePlanId) || state.businessPlans[0];
      if (!activePlan) return;
      try {
        downloadBusinessPlanPdf(activePlan);
        showToast("Business plan PDF downloaded.", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  document.querySelectorAll("[data-delete-plan]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-plan");
      try {
        await api.deleteBusinessPlan(id);
        state.businessPlans = state.businessPlans.filter((p) => p.id !== id);
        state.activePlanId = state.businessPlans[0]?.id || null;
        await refreshDashboardSummary();
        showToast("Business plan deleted.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // Startup Roadmap Handlers
  const rmStartupSelect = document.getElementById("rm-startup-select");
  if (rmStartupSelect) {
    rmStartupSelect.addEventListener("change", () => {
      const rec = state.recommendations.find((r) => r.id === rmStartupSelect.value);
      if (rec) {
        document.getElementById("rm-name").value = rec.business_name;
        document.getElementById("rm-industry").value = rec.industry;
      }
    });
  }

  const roadmapForm = document.getElementById("roadmap-form");
  if (roadmapForm) {
    roadmapForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(roadmapForm);
      state.busy.roadmap = true;
      render();
      try {
        const res = await api.generateRoadmap({
          startup_id: String(fd.get("startup_id") || "") || null,
          business_name: String(fd.get("business_name") || "").trim(),
          industry: String(fd.get("industry") || "").trim(),
        });
        state.roadmaps = [res.roadmap, ...state.roadmaps];
        state.activeRoadmapId = res.roadmap.id;
        await refreshDashboardSummary();
        showToast("8-stage startup roadmap created.", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        state.busy.roadmap = false;
        render();
      }
    });
  }

  const rmHist = document.getElementById("rm-history-select");
  if (rmHist) {
    rmHist.addEventListener("change", () => {
      state.activeRoadmapId = rmHist.value;
      render();
    });
  }

  document.querySelectorAll("[data-toggle-task]").forEach((cb) => {
    cb.addEventListener("change", async () => {
      const taskId = cb.getAttribute("data-toggle-task");
      const roadmapId = cb.getAttribute("data-roadmap-id");
      try {
        const res = await api.toggleRoadmapTask(roadmapId, taskId);
        const idx = state.roadmaps.findIndex((r) => r.id === roadmapId);
        if (idx >= 0) state.roadmaps[idx] = res.roadmap;
        await refreshDashboardSummary();
        render();
      } catch (err) {
        showToast(err.message, "error");
        render();
      }
    });
  });

  document.querySelectorAll("[data-delete-roadmap]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-roadmap");
      try {
        await api.deleteRoadmap(id);
        state.roadmaps = state.roadmaps.filter((rm) => rm.id !== id);
        state.activeRoadmapId = state.roadmaps[0]?.id || null;
        await refreshDashboardSummary();
        showToast("Roadmap deleted.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // VentureBot Chat Handlers
  const chatStartupCtx = document.getElementById("chat-startup-context");
  if (chatStartupCtx) {
    chatStartupCtx.addEventListener("change", () => {
      state.chatStartupId = chatStartupCtx.value;
    });
  }

  const clearChatBtn = document.getElementById("clear-chat-btn");
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", async () => {
      try {
        await api.clearChatHistory();
        state.chatMessages = [];
        showToast("VentureBot chat cleared.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  document.querySelectorAll("[data-quick-chat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-quick-chat") || "";
      const input = document.getElementById("chat-input");
      if (input) {
        input.value = q;
        document.getElementById("chat-form")?.requestSubmit();
      }
    });
  });

  const chatForm = document.getElementById("chat-form");
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      const text = String(input?.value || "").trim();
      if (!text) return;

      state.chatMessages.push({
        id: `temp-${Date.now()}`,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      });
      state.busy.chat = true;
      render();

      try {
        const res = await api.sendChatMessage({
          message: text,
          startup_id: state.chatStartupId || null,
        });
        state.chatMessages = state.chatMessages.filter((m) => !String(m.id).startsWith("temp-"));
        state.chatMessages.push(res.user_message, res.assistant_message);
      } catch (err) {
        state.chatMessages = state.chatMessages.filter((m) => !String(m.id).startsWith("temp-"));
        showToast(err.message, "error");
      } finally {
        state.busy.chat = false;
        render();
      }
    });
  }

  // Settings Handlers
  const settingsForm = document.getElementById("settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(settingsForm);
      const fb = document.getElementById("settings-feedback");
      try {
        const payload = { name: String(fd.get("name") || "").trim() };
        const newPw = String(fd.get("new_password") || "");
        if (newPw) {
          payload.current_password = String(fd.get("current_password") || "");
          payload.new_password = newPw;
        }
        const res = await api.updateSettings(payload);
        state.user = res.user;
        showToast("Settings updated.", "success");
        render();
      } catch (err) {
        if (fb) {
          fb.className = "notice-bar notice-bar-error";
          fb.textContent = err.message;
          fb.style.display = "block";
        }
      }
    });
  }

  const delAccBtn = document.getElementById("delete-account-btn");
  if (delAccBtn) {
    delAccBtn.addEventListener("click", () => {
      confirmDeleteModalOpen = true;
      render();
    });
  }

  const cancelDel1 = document.getElementById("cancel-delete-account");
  const cancelDel2 = document.getElementById("cancel-delete-account-btn");
  [cancelDel1, cancelDel2].forEach((el) => {
    if (el) {
      el.addEventListener("click", () => {
        confirmDeleteModalOpen = false;
        render();
      });
    }
  });

  const confirmDelBtn = document.getElementById("confirm-delete-account-btn");
  if (confirmDelBtn) {
    confirmDelBtn.addEventListener("click", async () => {
      try {
        await api.deleteAccount();
        confirmDeleteModalOpen = false;
        clearAuthToken();
        resetPrivateState();
        showToast("Account deleted.");
        render();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

async function bootstrap() {
  try {
    const me = await api.getMe();
    if (me?.user) {
      state.user = me.user;
      state.profileCompletion = me.profile_completion || 0;
      await loadWorkspaceData();
    }
  } catch {
    // Not signed in; render landing page cleanly
    state.user = null;
  }
  render();
}

bootstrap();
