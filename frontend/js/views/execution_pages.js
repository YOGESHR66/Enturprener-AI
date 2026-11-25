import { state } from "../state.js";
import { escapeHtml, formatDate, formatRichText } from "../utils.js";

const PLAN_SECTIONS = [
  ["executive_summary", "01. Executive Summary"],
  ["business_introduction", "02. Business Introduction"],
  ["problem_statement", "03. Problem Statement"],
  ["proposed_solution", "04. Proposed Solution"],
  ["target_market", "05. Target Market"],
  ["competitor_analysis", "06. Competitor Analysis"],
  ["marketing_strategy", "07. Marketing Strategy"],
  ["investment_requirements", "08. Investment Requirements"],
  ["revenue_model", "09. Revenue Model"],
  ["risk_analysis", "10. Risk Analysis"],
  ["future_growth", "11. Future Growth"],
];

export function renderBusinessPlansView() {
  const plans = state.businessPlans || [];
  const active = plans.find((p) => p.id === state.activePlanId) || plans[0] || null;
  const selectedRec = state.recommendations.find((r) => r.id === state.selectedStartupId);
  const isBusy = Boolean(state.busy.plan);

  return `
    <div class="page-header">
      <div>
        <h1>Business Plan Generator</h1>
        <p>Generate structured 11-section business plans tailored to your profile and export them as formatted PDF documents.</p>
      </div>
    </div>

    <div class="surface" style="margin-bottom:24px;">
      <form id="plan-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="plan-startup-select">Select Recommended Startup (Optional)</label>
          <select class="form-select" id="plan-startup-select" name="startup_id">
            <option value="">Custom venture</option>
            ${state.recommendations
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${selectedRec?.id === r.id ? "selected" : ""}>${escapeHtml(r.business_name)} (${escapeHtml(r.industry)})</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="plan-name">Business Name</label>
          <input class="form-input" id="plan-name" name="business_name" required value="${escapeHtml(selectedRec?.business_name || "")}" placeholder="e.g., KrishiSense Analytics" />
        </div>
        <div class="form-field">
          <label class="form-label" for="plan-industry">Industry</label>
          <input class="form-input" id="plan-industry" name="industry" required value="${escapeHtml(selectedRec?.industry || "")}" placeholder="e.g., AgriTech" />
        </div>
        <div class="form-field form-field-full">
          <label class="form-label" for="plan-notes">Specific Goals or Notes (Optional)</label>
          <input class="form-input" id="plan-notes" name="custom_notes" placeholder="e.g., Bootstrapped MVP targeting Tier-2 cooperatives first" />
        </div>
        <div class="form-field form-field-full" style="display:flex;flex-direction:row;justify-content:flex-end;">
          <button type="submit" class="btn btn-primary" ${isBusy ? "disabled" : ""}>
            ${isBusy ? '<span class="spinner"></span> Writing Business Plan...' : "Generate 11-Section Business Plan"}
          </button>
        </div>
      </form>
    </div>

    ${
      plans.length > 0
        ? `
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span style="font-size:13px;font-weight:600;color:var(--slate-600);">Saved Plans:</span>
              <select class="form-select" id="plan-history-select" style="max-width:340px;">
                ${plans
                  .map(
                    (p) =>
                      `<option value="${escapeHtml(p.id)}" ${active?.id === p.id ? "selected" : ""}>${escapeHtml(p.business_name)} · ${escapeHtml(p.industry)}</option>`
                  )
                  .join("")}
              </select>
            </div>
            ${
              active
                ? `<div style="display:flex;gap:8px;">
                    <button type="button" class="btn btn-navy btn-sm" id="download-plan-pdf-btn">Download PDF</button>
                    <button type="button" class="btn btn-ghost btn-sm" data-delete-plan="${escapeHtml(active.id)}">Delete</button>
                  </div>`
                : ""
            }
          </div>
          ${active ? renderBusinessPlanDocument(active) : ""}
        `
        : `<div class="empty-state">
            <h3>No business plans saved yet</h3>
            <p>Choose a startup idea or enter your venture name above to generate an investor-ready 11-section business plan.</p>
          </div>`
    }
  `;
}

function renderBusinessPlanDocument(plan) {
  const sections = plan.sections || {};
  return `
    <div class="surface">
      <div style="padding-bottom:16px;border-bottom:1px solid var(--slate-200);margin-bottom:20px;">
        <div class="meta-line" style="margin-bottom:6px;">
          <span>${escapeHtml(plan.industry)}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>Created ${escapeHtml(formatDate(plan.created_at))}</span>
        </div>
        <h2 style="font-size:22px;font-weight:700;color:var(--navy-900);">${escapeHtml(plan.business_name)}</h2>
      </div>

      <div style="display:flex;flex-direction:column;gap:22px;">
        ${PLAN_SECTIONS.map(([key, title]) => {
          const text = sections[key] || "";
          if (!text) return "";
          return `
            <section>
              <h3 style="font-size:16px;font-weight:700;color:var(--blue-600);margin-bottom:8px;">${escapeHtml(title)}</h3>
              <div style="font-size:14.5px;color:var(--slate-700);line-height:1.7;">${formatRichText(text)}</div>
            </section>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderRoadmapView() {
  const roadmaps = state.roadmaps || [];
  const active = roadmaps.find((rm) => rm.id === state.activeRoadmapId) || roadmaps[0] || null;
  const selectedRec = state.recommendations.find((r) => r.id === state.selectedStartupId);
  const isBusy = Boolean(state.busy.roadmap);

  let totalTasks = 0;
  let completedTasks = 0;
  if (active) {
    for (const s of active.stages || []) {
      for (const t of s.tasks || []) {
        totalTasks += 1;
        if (t.completed) completedTasks += 1;
      }
    }
  }
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return `
    <div class="page-header">
      <div>
        <h1>Startup Roadmap</h1>
        <p>Step-by-step execution checklist across 8 launch phases from validation through customer acquisition.</p>
      </div>
    </div>

    <div class="surface" style="margin-bottom:24px;">
      <form id="roadmap-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="rm-startup-select">Select Recommended Startup (Optional)</label>
          <select class="form-select" id="rm-startup-select" name="startup_id">
            <option value="">Custom venture</option>
            ${state.recommendations
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${selectedRec?.id === r.id ? "selected" : ""}>${escapeHtml(r.business_name)} (${escapeHtml(r.industry)})</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="rm-name">Business Name</label>
          <input class="form-input" id="rm-name" name="business_name" required value="${escapeHtml(selectedRec?.business_name || "")}" placeholder="e.g., CampusBite Logistics" />
        </div>
        <div class="form-field">
          <label class="form-label" for="rm-industry">Industry</label>
          <input class="form-input" id="rm-industry" name="industry" required value="${escapeHtml(selectedRec?.industry || "")}" placeholder="e.g., FoodTech" />
        </div>
        <div class="form-field form-field-full" style="display:flex;flex-direction:row;justify-content:flex-end;">
          <button type="submit" class="btn btn-primary" ${isBusy ? "disabled" : ""}>
            ${isBusy ? '<span class="spinner"></span> Building 8-Stage Roadmap...' : "Generate Launch Roadmap"}
          </button>
        </div>
      </form>
    </div>

    ${
      active
        ? `
          <div class="surface" style="margin-bottom:20px;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
              <div>
                <h2 style="font-size:19px;font-weight:700;">${escapeHtml(active.business_name)}</h2>
                <div class="meta-line">
                  <span>${escapeHtml(active.industry)}</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span class="tabular">${completedTasks} of ${totalTasks} tasks completed (${pct}%)</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                ${
                  roadmaps.length > 1
                    ? `<select class="form-select" id="rm-history-select" style="max-width:260px;">
                        ${roadmaps
                          .map(
                            (rm) =>
                              `<option value="${escapeHtml(rm.id)}" ${active.id === rm.id ? "selected" : ""}>${escapeHtml(rm.business_name)}</option>`
                          )
                          .join("")}
                      </select>`
                    : ""
                }
                <button type="button" class="btn btn-ghost btn-sm" data-delete-roadmap="${escapeHtml(active.id)}">Delete</button>
              </div>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;"></div>
            </div>
          </div>

          ${(active.stages || [])
            .map((stage, idx) => {
              const stTotal = (stage.tasks || []).length;
              const stDone = (stage.tasks || []).filter((t) => t.completed).length;
              return `
                <div class="roadmap-stage">
                  <div class="roadmap-stage-head">
                    <div>
                      <div style="font-size:15.5px;font-weight:700;color:var(--navy-900);">${escapeHtml(String(idx + 1).padStart(2, "0"))}. ${escapeHtml(stage.phase)}</div>
                      <div style="font-size:13px;color:var(--slate-600);margin-top:2px;">${escapeHtml(stage.summary)}</div>
                    </div>
                    <div class="tabular" style="font-size:13px;font-weight:600;color:var(--blue-600);">${stDone}/${stTotal} Done</div>
                  </div>
                  <div>
                    ${(stage.tasks || [])
                      .map(
                        (task) => `
                        <label class="roadmap-task ${task.completed ? "done" : ""}">
                          <input
                            type="checkbox"
                            class="roadmap-checkbox"
                            data-toggle-task="${escapeHtml(task.id)}"
                            data-roadmap-id="${escapeHtml(active.id)}"
                            ${task.completed ? "checked" : ""}
                          />
                          <div style="flex:1;">
                            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;">
                              <span class="roadmap-task-title" style="font-weight:600;font-size:14.5px;">${escapeHtml(task.title)}</span>
                              <span style="font-size:12px;color:var(--slate-500);font-family:var(--font-mono);">${escapeHtml(task.estimated_timeline)}</span>
                            </div>
                            <div style="font-size:13.5px;color:var(--slate-600);margin-top:3px;">${escapeHtml(task.description)}</div>
                          </div>
                        </label>
                      `
                      )
                      .join("")}
                  </div>
                </div>
              `;
            })
            .join("")}
        `
        : `<div class="empty-state">
            <h3>No startup roadmap created yet</h3>
            <p>Generate an 8-stage execution plan covering idea validation, registration, product development, and launch.</p>
          </div>`
    }
  `;
}

export function renderVentureBotView() {
  const messages = state.chatMessages || [];
  const isBusy = Boolean(state.busy.chat);

  return `
    <div class="page-header">
      <div>
        <h1>VentureBot</h1>
        <p>Ask questions about startup ideas, unit economics, go-to-market strategy, business registration, or government schemes.</p>
      </div>
    </div>

    <div class="chat-shell">
      <div class="chat-toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <label for="chat-startup-context" style="font-size:13px;font-weight:600;color:var(--slate-700);">Active Startup Context:</label>
          <select id="chat-startup-context" class="form-select" style="max-width:300px;min-height:34px;padding:5px 10px;">
            <option value="">General Founder Profile Only</option>
            ${state.recommendations
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${state.chatStartupId === r.id ? "selected" : ""}>${escapeHtml(r.business_name)} (${escapeHtml(r.industry)})</option>`
              )
              .join("")}
          </select>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="clear-chat-btn">Clear History</button>
      </div>

      <div class="chat-messages" id="chat-messages-box">
        ${
          messages.length === 0
            ? `<div class="chat-bubble chat-bubble-assistant">
                <div class="chat-bubble-meta">VentureBot</div>
                <div>Hello ${escapeHtml(state.user?.name || "Founder")}. I have your founder profile ready. Select a startup idea above or ask me anything about validation, pricing, financial planning, marketing, or Indian government schemes like Startup India, PMEGP, and MUDRA.</div>
              </div>`
            : messages
                .map(
                  (m) => `
                  <div class="chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}">
                    <div class="chat-bubble-meta">${m.role === "user" ? "You" : "VentureBot"} · ${escapeHtml(formatDate(m.created_at))}</div>
                    <div>${formatRichText(m.content)}</div>
                  </div>
                `
                )
                .join("")
        }
        ${
          isBusy
            ? `<div class="chat-bubble chat-bubble-assistant"><span class="spinner spinner-dark"></span> Thinking...</div>`
            : ""
        }
      </div>

      <div class="chat-prompts">
        ${[
          "How should I validate this startup idea with ₹10,000?",
          "Which Indian government scheme fits my profile best?",
          "Suggest a 90-day customer acquisition strategy.",
          "What are the biggest financial risks to watch?",
        ]
          .map(
            (q) =>
              `<button type="button" class="btn btn-secondary btn-sm" data-quick-chat="${escapeHtml(q)}">${escapeHtml(q)}</button>`
          )
          .join("")}
      </div>

      <form id="chat-form" class="chat-compose">
        <input
          type="text"
          id="chat-input"
          class="form-input"
          placeholder="Ask VentureBot about strategy, funding, pricing, or schemes..."
          required
          ${isBusy ? "disabled" : ""}
        />
        <button type="submit" class="btn btn-primary" ${isBusy ? "disabled" : ""}>Send</button>
      </form>
    </div>
  `;
}

export function renderSettingsView() {
  const user = state.user || {};
  return `
    <div class="page-header">
      <div>
        <h1>Account Settings</h1>
        <p>Manage your EntrepreneurAI credentials and workspace data.</p>
      </div>
    </div>

    <div class="grid-2">
      <div class="surface">
        <h2 style="font-size:17px;font-weight:700;margin-bottom:14px;">Account &amp; Password</h2>
        <div id="settings-feedback" class="notice-bar" style="display:none;"></div>
        <form id="settings-form" style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-field">
            <label class="form-label" for="set-name">Display Name</label>
            <input class="form-input" id="set-name" name="name" required minlength="2" value="${escapeHtml(user.name || "")}" />
          </div>
          <div class="form-field">
            <label class="form-label" for="set-email">Email Address</label>
            <input class="form-input" id="set-email" disabled value="${escapeHtml(user.email || "")}" />
          </div>
          <hr class="divider" style="margin:6px 0;" />
          <div class="form-field">
            <label class="form-label" for="set-curr-pw">Current Password (only to change password)</label>
            <input class="form-input" id="set-curr-pw" name="current_password" type="password" />
          </div>
          <div class="form-field">
            <label class="form-label" for="set-new-pw">New Password</label>
            <input class="form-input" id="set-new-pw" name="new_password" type="password" minlength="8" placeholder="Minimum 8 characters" />
          </div>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </form>
      </div>

      <div class="surface">
        <h2 style="font-size:17px;font-weight:700;margin-bottom:10px;">Data Privacy &amp; Account Deletion</h2>
        <p style="font-size:14px;color:var(--slate-600);margin:0 0 18px;">
          Your founder profile, startup recommendations, financial estimates, business plans, roadmaps, and VentureBot messages are isolated strictly to your account.
        </p>
        <div class="notice-bar notice-bar-error" style="margin-bottom:16px;">
          Deleting your account permanently removes all saved ideas, business plans, and roadmaps.
        </div>
        <button type="button" class="btn btn-danger" id="delete-account-btn">Delete Account Permanently</button>
      </div>
    </div>
  `;
}
