import { state } from "../state.js";
import { escapeHtml, formatCurrency, formatDate, riskClass } from "../utils.js";

export function renderDashboardView() {
  const d = state.dashboard || {};
  const userName = state.user?.name || "Founder";
  const completion = d.profile_completion ?? state.profileCompletion ?? 0;
  const roadmap = d.roadmap_progress || { completed: 0, total: 0, percentage: 0 };
  const activities = d.recent_activities || [];
  const fin = d.financial_overview;

  return `
    <div class="page-header">
      <div>
        <h1>Welcome back, ${escapeHtml(userName)}</h1>
        <p>Overview of your founder profile, AI startup recommendations, financial estimates, and launch execution.</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button type="button" class="btn btn-secondary" data-nav="profile">Edit Profile</button>
        <button type="button" class="btn btn-primary" data-nav="discover">Discover Startups</button>
      </div>
    </div>

    ${
      completion < 60
        ? `<div class="notice-bar notice-bar-info" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <span><strong>Profile completion is ${completion}%.</strong> Add your skills, budget, education, and location for accurate AI startup matching.</span>
            <button type="button" class="btn btn-primary btn-sm" data-nav="profile">Complete Profile</button>
          </div>`
        : ""
    }

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Profile Completion</div>
        <div class="kpi-value">${completion}%</div>
        <div class="progress-track" style="margin-top:10px;">
          <div class="progress-fill" style="width:${completion}%;"></div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Recommendations</div>
        <div class="kpi-value">${d.total_recommendations ?? 0}</div>
        <div class="kpi-sub">Saved ideas: <span class="tabular">${d.saved_ideas_count ?? 0}</span></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Business Plans</div>
        <div class="kpi-value">${d.business_plans_count ?? 0}</div>
        <div class="kpi-sub">Ready for PDF export</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Roadmap Progress</div>
        <div class="kpi-value">${roadmap.percentage}%</div>
        <div class="kpi-sub"><span class="tabular">${roadmap.completed}/${roadmap.total}</span> tasks completed</div>
      </div>
    </div>

    <div class="grid-asym">
      <div class="surface">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <div>
            <h2 style="font-size:17px;font-weight:600;">Financial Overview (Estimates)</h2>
            <p style="margin:2px 0 0;font-size:13px;color:var(--slate-500);">
              ${fin ? escapeHtml(fin.title) : "Run a financial model to visualize monthly profit estimates."}
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-nav="financial">Open Calculator</button>
        </div>

        ${
          fin
            ? `
              <div class="grid-3" style="margin-bottom:16px;">
                <div>
                  <div class="kpi-label">Est. M1 Net Profit</div>
                  <div class="tabular" style="font-size:17px;font-weight:700;">${formatCurrency(fin.metrics?.estimated_monthly_profit_m1)}</div>
                </div>
                <div>
                  <div class="kpi-label">Est. Break-Even</div>
                  <div class="tabular" style="font-size:17px;font-weight:700;">${fin.metrics?.break_even_month ? `Month ${fin.metrics.break_even_month}` : "Beyond horizon"}</div>
                </div>
                <div>
                  <div class="kpi-label">Est. Horizon ROI</div>
                  <div class="tabular" style="font-size:17px;font-weight:700;">${fin.metrics?.estimated_roi_percent ?? 0}%</div>
                </div>
              </div>
              <div class="chart-box" style="height:220px;">
                <canvas id="chart-dashboard-fin"></canvas>
              </div>
            `
            : `
              <div class="empty-state" style="padding:32px 16px;">
                <h3>No financial scenario saved yet</h3>
                <p>Estimate initial capital, burn rate, expected revenue, and break-even timeline for your startup idea.</p>
                <button type="button" class="btn btn-primary btn-sm" data-nav="financial">Model Financials</button>
              </div>
            `
        }
      </div>

      <div class="surface">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
          <h2 style="font-size:17px;font-weight:600;">Recent Activities</h2>
          <span class="meta-line">Latest actions</span>
        </div>
        ${
          activities.length > 0
            ? activities
                .map(
                  (a) => `
                <div class="activity-row">
                  <div>
                    <div style="font-weight:600;color:var(--slate-900);">${escapeHtml(a.action)}</div>
                    <div style="font-size:12.5px;color:var(--slate-500);">${escapeHtml(a.detail)}</div>
                  </div>
                  <div style="font-size:12px;color:var(--slate-400);white-space:nowrap;">${escapeHtml(formatDate(a.created_at))}</div>
                </div>
              `
                )
                .join("")
            : `<p style="font-size:13.5px;color:var(--slate-500);">Your workspace activity log will appear here as you update your profile and generate plans.</p>`
        }
      </div>
    </div>
  `;
}

export function renderProfileView() {
  const p = state.profile || {};
  const completion = state.profileCompletion || 0;
  return `
    <div class="page-header">
      <div>
        <h1>My Founder Profile</h1>
        <p>Your profile grounds Gemini recommendations, financial assumptions, business plans, and VentureBot guidance.</p>
      </div>
      <div class="meta-line">
        <span>Completion</span>
        <span class="tabular" style="font-weight:700;color:var(--navy-900);">${completion}%</span>
      </div>
    </div>

    <div class="surface">
      <div id="profile-feedback" class="notice-bar" style="display:none;"></div>
      <form id="profile-form" class="form-grid">
        <div class="form-field">
          <label class="form-label" for="prof-name">Full Name</label>
          <input class="form-input" id="prof-name" name="full_name" required value="${escapeHtml(p.full_name || state.user?.name || "")}" placeholder="e.g., Priya Nair" />
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-education">Education &amp; Degree</label>
          <input class="form-input" id="prof-education" name="education" required value="${escapeHtml(p.education || "")}" placeholder="e.g., B.Tech Computer Science, Final Year" />
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-tech-skills">Technical Skills (comma-separated)</label>
          <input class="form-input" id="prof-tech-skills" name="technical_skills" value="${escapeHtml((p.technical_skills || []).join(", "))}" placeholder="e.g., Python, Web Development, Data Analytics" />
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-biz-skills">Business &amp; Soft Skills (comma-separated)</label>
          <input class="form-input" id="prof-biz-skills" name="business_skills" value="${escapeHtml((p.business_skills || []).join(", "))}" placeholder="e.g., Digital Marketing, B2B Sales, Operations" />
        </div>

        <div class="form-field form-field-full">
          <label class="form-label" for="prof-interests">Industries &amp; Problem Interests (comma-separated)</label>
          <input class="form-input" id="prof-interests" name="interests" value="${escapeHtml((p.interests || []).join(", "))}" placeholder="e.g., EdTech, AgriTech, Healthcare Logistics, D2C Sustainability" />
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-budget">Available Investment Budget (INR)</label>
          <input class="form-input tabular" id="prof-budget" name="investment_budget" type="number" min="0" step="1000" required value="${escapeHtml(p.investment_budget ?? 200000)}" />
          <span class="form-hint">Enter 0 if bootstrapping with zero initial capital.</span>
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-location">City &amp; State / Location</label>
          <input class="form-input" id="prof-location" name="location" required value="${escapeHtml(p.location || "")}" placeholder="e.g., Pune, Maharashtra" />
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-exp">Business Experience</label>
          <select class="form-select" id="prof-exp" name="business_experience" required>
            ${[
              "Student / First-time founder",
              "Fresh graduate with internship experience",
              "1-3 years industry experience",
              "3+ years working professional",
              "Prior startup or family business experience",
            ]
              .map(
                (opt) =>
                  `<option value="${escapeHtml(opt)}" ${p.business_experience === opt ? "selected" : ""}>${escapeHtml(opt)}</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="prof-risk">Risk Preference</label>
          <select class="form-select" id="prof-risk" name="risk_preference" required>
            ${["Low", "Moderate", "High"]
              .map(
                (opt) =>
                  `<option value="${opt}" ${(p.risk_preference || "Moderate") === opt ? "selected" : ""}>${opt} Risk</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="form-field form-field-full" style="display:flex;flex-direction:row;justify-content:flex-end;gap:12px;margin-top:8px;">
          <button type="submit" class="btn btn-primary" id="prof-save-btn">Save Profile</button>
          <button type="button" class="btn btn-navy" data-nav="discover">Go to Discover Startups</button>
        </div>
      </form>
    </div>
  `;
}

export function renderDiscoverView() {
  const p = state.profile || {};
  const draft = state.discoverDraft || {};
  const isBusy = Boolean(state.busy.generateRecs);
  const latestBatch = state.recommendations.slice(0, 5);
  const needsQuickContext = !p.education || !(p.technical_skills?.length || p.business_skills?.length) || !p.location;

  const eduVal = draft.education ?? p.education ?? "";
  const skillsVal = draft.skills ?? [...(p.technical_skills || []), ...(p.business_skills || [])].join(", ");
  const sectorVal = draft.focus_sector ?? "";
  const budgetVal = draft.custom_budget ?? p.investment_budget ?? "";
  const locVal = draft.custom_location ?? p.location ?? "";
  const notesVal = draft.additional_notes ?? "";

  return `
    <div class="page-header">
      <div>
        <h1>Discover Startups</h1>
        <p>Use Google Gemini AI to analyze your profile and generate five tailored startup opportunities.</p>
      </div>
      <button type="button" class="btn btn-secondary" data-nav="recommendations">View All Saved &amp; Compare (${state.recommendations.length})</button>
    </div>

    ${
      needsQuickContext
        ? `<div class="notice-bar notice-bar-info" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <span>Add your education, skills, and location below (or complete your full profile) so Gemini can match opportunities accurately.</span>
            <button type="button" class="btn btn-secondary btn-sm" data-nav="profile">Open My Profile</button>
          </div>`
        : ""
    }

    ${
      state.discoverError
        ? `<div class="notice-bar notice-bar-error">${escapeHtml(state.discoverError)}</div>`
        : ""
    }

    <div class="surface" style="margin-bottom:24px;">
      <form id="discover-form" class="form-grid">
        ${
          needsQuickContext
            ? `
              <div class="form-field">
                <label class="form-label" for="disc-education">Education &amp; Background</label>
                <input class="form-input" id="disc-education" name="education" required value="${escapeHtml(eduVal)}" placeholder="e.g., B.Tech CS / BBA / Graduate" />
              </div>
              <div class="form-field">
                <label class="form-label" for="disc-skills">Key Skills (comma-separated)</label>
                <input class="form-input" id="disc-skills" name="skills" required value="${escapeHtml(skillsVal)}" placeholder="e.g., Web Dev, Marketing, Operations" />
              </div>
            `
            : ""
        }
        <div class="form-field">
          <label class="form-label" for="disc-sector">Optional Focus Sector</label>
          <input class="form-input" id="disc-sector" name="focus_sector" value="${escapeHtml(sectorVal)}" placeholder="Leave blank for broad matching, or e.g. SaaS, Agritech" />
        </div>
        <div class="form-field">
          <label class="form-label" for="disc-budget">Budget Override (INR)</label>
          <input class="form-input tabular" id="disc-budget" name="custom_budget" type="number" min="0" value="${escapeHtml(budgetVal)}" placeholder="Uses profile budget by default" />
        </div>
        <div class="form-field">
          <label class="form-label" for="disc-location">Target Location${needsQuickContext ? "" : " Override"}</label>
          <input class="form-input" id="disc-location" name="custom_location" ${needsQuickContext ? "required" : ""} value="${escapeHtml(locVal)}" placeholder="e.g., Bengaluru, Tier-2 India" />
        </div>
        <div class="form-field">
          <label class="form-label" for="disc-notes">Founder Preferences / Constraints</label>
          <input class="form-input" id="disc-notes" name="additional_notes" value="${escapeHtml(notesVal)}" placeholder="e.g., Weekend-friendly MVP, B2B focus, zero inventory" />
        </div>
        <div class="form-field form-field-full" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <span class="form-hint">Profile completion: <strong class="tabular">${state.profileCompletion}%</strong> · Inline details automatically update your founder profile.</span>
          <button type="submit" class="btn btn-primary" ${isBusy ? "disabled" : ""}>
            ${isBusy ? '<span class="spinner"></span> Generating 5 Startup Ideas...' : "Generate 5 AI Recommendations"}
          </button>
        </div>
      </form>
    </div>

    ${
      isBusy
        ? `<div class="surface" style="margin-bottom:20px;display:flex;align-items:center;gap:14px;">
            <span class="spinner spinner-dark" style="width:22px;height:22px;flex-shrink:0;"></span>
            <div>
              <div style="font-weight:600;color:var(--navy-900);">Analyzing your profile and generating 5 tailored startup ideas...</div>
              <div style="font-size:13px;color:var(--slate-500);">Elapsed: <span class="tabular" id="gen-elapsed">0</span>s · Usually completes in 5–15 seconds.</div>
            </div>
          </div>`
        : ""
    }

    ${
      latestBatch.length > 0
        ? `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h2 style="font-size:18px;font-weight:700;">Recent AI Recommendations</h2>
            <span class="meta-line">Click Save or Compare to shortlist ideas</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:16px;">
            ${latestBatch.map((rec) => renderRecommendationCard(rec)).join("")}
          </div>
        `
        : !isBusy
        ? `
          <div class="empty-state">
            <h3>Ready to generate your personalized startup ideas</h3>
            <p>Submit the form above to receive five startup recommendations scored out of 100 for your profile, budget, and location.</p>
          </div>
        `
        : ""
    }
  `;
}

export function renderRecommendationsView() {
  const filter = state.recommendationFilter;
  const search = state.recommendationSearch.trim().toLowerCase();
  let items = state.recommendations;
  if (filter === "saved") {
    items = items.filter((r) => Boolean(r.is_saved));
  }
  if (search) {
    items = items.filter(
      (r) =>
        (r.business_name || "").toLowerCase().includes(search) ||
        (r.industry || "").toLowerCase().includes(search) ||
        (r.description || "").toLowerCase().includes(search)
    );
  }

  const comparedItems = state.recommendations.filter((r) => state.compareIds.includes(r.id));

  return `
    <div class="page-header">
      <div>
        <h1>Startup Recommendations</h1>
        <p>Save promising ideas, inspect suitability rationale, and compare up to three opportunities side-by-side.</p>
      </div>
      <button type="button" class="btn btn-primary" data-nav="discover">Generate More Ideas</button>
    </div>

    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;">
      <div class="segmented">
        <button type="button" class="seg-btn ${filter === "all" ? "active" : ""}" data-rec-filter="all">All Ideas (${state.recommendations.length})</button>
        <button type="button" class="seg-btn ${filter === "saved" ? "active" : ""}" data-rec-filter="saved">Saved Only (${state.recommendations.filter((r) => r.is_saved).length})</button>
      </div>
      <input
        type="search"
        id="rec-search-input"
        class="form-input"
        style="max-width:290px;"
        placeholder="Filter by name or industry..."
        value="${escapeHtml(state.recommendationSearch)}"
      />
    </div>

    ${
      comparedItems.length >= 2
        ? renderCompareMatrix(comparedItems)
        : comparedItems.length === 1
        ? `<div class="notice-bar notice-bar-info">Select 1 or 2 more recommendations using <strong>Compare</strong> to view a side-by-side comparison matrix.</div>`
        : ""
    }

    ${
      items.length > 0
        ? `<div style="display:flex;flex-direction:column;gap:16px;">${items.map((rec) => renderRecommendationCard(rec)).join("")}</div>`
        : `<div class="empty-state">
            <h3>No startup recommendations match this view</h3>
            <p>${filter === "saved" ? "You have not saved any startup ideas yet." : "Generate AI recommendations from Discover Startups to populate this workspace."}</p>
            <button type="button" class="btn btn-primary" data-nav="discover">Discover Startups</button>
          </div>`
    }
  `;
}

function renderCompareMatrix(items) {
  return `
    <div class="surface" style="margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;">
        <h2 style="font-size:17px;font-weight:700;">Side-by-Side Comparison (${items.length} Selected)</h2>
        <button type="button" class="btn btn-ghost btn-sm" id="clear-compare-btn">Clear Selection</button>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Dimension</th>
              ${items.map((i) => `<th>${escapeHtml(i.business_name)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Industry</strong></td>
              ${items.map((i) => `<td>${escapeHtml(i.industry)}</td>`).join("")}
            </tr>
            <tr>
              <td><strong>Suitability Score</strong></td>
              ${items.map((i) => `<td class="tabular"><strong>${escapeHtml(i.suitability_score)} / 100</strong></td>`).join("")}
            </tr>
            <tr>
              <td><strong>Risk Level</strong></td>
              ${items.map((i) => `<td><span class="${riskClass(i.risk_level)}">${escapeHtml(i.risk_level)} Risk</span></td>`).join("")}
            </tr>
            <tr>
              <td><strong>Required Investment</strong></td>
              ${items.map((i) => `<td class="tabular">${escapeHtml(i.required_investment_label || formatCurrency(i.required_investment_inr))}</td>`).join("")}
            </tr>
            <tr>
              <td><strong>Est. Monthly Revenue</strong></td>
              ${items.map((i) => `<td class="tabular">${formatCurrency(i.estimated_monthly_revenue_inr)}</td>`).join("")}
            </tr>
            <tr>
              <td><strong>Est. Monthly Expenses</strong></td>
              ${items.map((i) => `<td class="tabular">${formatCurrency(i.estimated_monthly_expenses_inr)}</td>`).join("")}
            </tr>
            <tr>
              <td><strong>Target Customers</strong></td>
              ${items.map((i) => `<td>${escapeHtml(i.target_customers)}</td>`).join("")}
            </tr>
            <tr>
              <td><strong>Required Skills</strong></td>
              ${items.map((i) => `<td>${escapeHtml((i.required_skills || []).join(", "))}</td>`).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRecommendationCard(rec) {
  const isCompared = state.compareIds.includes(rec.id);
  return `
    <article class="surface">
      <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;">
        <div>
          <div class="meta-line" style="margin-bottom:6px;">
            <span>${escapeHtml(rec.industry)}</span>
            <span class="meta-sep" aria-hidden="true">·</span>
            <span class="${riskClass(rec.risk_level)}">${escapeHtml(rec.risk_level)} Risk</span>
            <span class="meta-sep" aria-hidden="true">·</span>
            <span class="tabular">Suitability: <strong>${escapeHtml(rec.suitability_score)}/100</strong></span>
            ${rec.is_saved ? '<span class="meta-sep" aria-hidden="true">·</span><span style="color:var(--blue-600);font-weight:600;">Saved</span>' : ""}
          </div>
          <h3 style="font-size:20px;font-weight:700;color:var(--navy-900);">${escapeHtml(rec.business_name)}</h3>
          ${rec.tagline ? `<div style="font-size:14px;color:var(--slate-600);margin-top:2px;">${escapeHtml(rec.tagline)}</div>` : ""}
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm ${isCompared ? "btn-navy" : "btn-secondary"}" data-compare-rec="${escapeHtml(rec.id)}">
            ${isCompared ? "Comparing" : "Compare"}
          </button>
          <button type="button" class="btn btn-sm ${rec.is_saved ? "btn-primary" : "btn-secondary"}" data-save-rec="${escapeHtml(rec.id)}">
            ${rec.is_saved ? "Saved" : "Save Idea"}
          </button>
          <button type="button" class="btn btn-sm btn-ghost" data-delete-rec="${escapeHtml(rec.id)}" aria-label="Delete idea">Delete</button>
        </div>
      </div>

      <p style="margin:0 0 14px;color:var(--slate-700);font-size:14.5px;">${escapeHtml(rec.description)}</p>

      <div class="grid-3" style="padding:14px 0;border-top:1px solid var(--slate-100);border-bottom:1px solid var(--slate-100);margin-bottom:14px;">
        <div>
          <div class="kpi-label">Required Investment (Est.)</div>
          <div class="tabular" style="font-weight:600;font-size:14.5px;">${escapeHtml(rec.required_investment_label || formatCurrency(rec.required_investment_inr))}</div>
        </div>
        <div>
          <div class="kpi-label">Target Customers</div>
          <div style="font-size:14px;color:var(--slate-800);">${escapeHtml(rec.target_customers)}</div>
        </div>
        <div>
          <div class="kpi-label">Required Skills</div>
          <div style="font-size:14px;color:var(--slate-800);">${escapeHtml((rec.required_skills || []).join(", "))}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:14px;">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--slate-900);margin-bottom:6px;">Market Opportunities</div>
          <ul class="clean-list">
            ${(rec.market_opportunities || []).map((o) => `<li>${escapeHtml(o)}</li>`).join("")}
          </ul>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--slate-900);margin-bottom:6px;">Business Challenges</div>
          <ul class="clean-list">
            ${(rec.business_challenges || []).map((c) => `<li>${escapeHtml(c)}</li>`).join("")}
          </ul>
        </div>
      </div>

      <div style="background-color:var(--slate-50);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;font-size:13.5px;color:var(--slate-700);">
        <strong>Why it matches your profile:</strong> ${escapeHtml(rec.match_explanation)}
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button type="button" class="btn btn-secondary btn-sm" data-launch-market="${escapeHtml(rec.id)}">Market Analysis</button>
        <button type="button" class="btn btn-secondary btn-sm" data-launch-financial="${escapeHtml(rec.id)}">Financial Model</button>
        <button type="button" class="btn btn-secondary btn-sm" data-launch-plan="${escapeHtml(rec.id)}">Business Plan</button>
        <button type="button" class="btn btn-secondary btn-sm" data-launch-roadmap="${escapeHtml(rec.id)}">Build Roadmap</button>
        <button type="button" class="btn btn-ghost btn-sm" data-launch-chat="${escapeHtml(rec.id)}">Ask VentureBot</button>
      </div>
    </article>
  `;
}
