import { state } from "../state.js";
import { escapeHtml, formatCurrency, formatDate, isSafeHttpUrl } from "../utils.js";

export function renderMarketAnalysisView() {
  const analyses = state.marketAnalyses || [];
  const active = analyses.find((a) => a.id === state.activeMarketId) || analyses[0] || null;
  const selectedRec = state.recommendations.find((r) => r.id === state.selectedStartupId);
  const isBusy = Boolean(state.busy.market);

  return `
    <div class="page-header">
      <div>
        <h1>Market Analysis</h1>
        <p>AI-assisted market research separating established baseline context from AI-synthesized qualitative insights.</p>
      </div>
    </div>

    <div class="surface" style="margin-bottom:24px;">
      <form id="market-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="mkt-startup-select">Pre-fill from Saved / Recommended Startup (Optional)</label>
          <select class="form-select" id="mkt-startup-select" name="startup_id">
            <option value="">Custom startup or market topic</option>
            ${state.recommendations
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${selectedRec?.id === r.id ? "selected" : ""}>${escapeHtml(r.business_name)} (${escapeHtml(r.industry)})</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="mkt-topic">Business Concept / Topic</label>
          <input class="form-input" id="mkt-topic" name="topic" required value="${escapeHtml(selectedRec?.business_name || "")}" placeholder="e.g., B2B Cold-Chain Logistics SaaS" />
        </div>
        <div class="form-field">
          <label class="form-label" for="mkt-industry">Industry</label>
          <input class="form-input" id="mkt-industry" name="industry" required value="${escapeHtml(selectedRec?.industry || "")}" placeholder="e.g., Supply Chain & Logistics" />
        </div>
        <div class="form-field">
          <label class="form-label" for="mkt-location">Target Geography</label>
          <input class="form-input" id="mkt-location" name="location" required value="${escapeHtml(state.profile?.location || "India")}" placeholder="e.g., Bengaluru / India" />
        </div>
        <div class="form-field" style="justify-content:flex-end;">
          <button type="submit" class="btn btn-primary" ${isBusy ? "disabled" : ""}>
            ${isBusy ? '<span class="spinner"></span> Researching Market...' : "Generate Market Analysis"}
          </button>
        </div>
      </form>
    </div>

    ${
      analyses.length > 1
        ? `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
            <span style="font-size:13px;font-weight:600;color:var(--slate-600);">Saved Reports:</span>
            <select class="form-select" id="mkt-history-select" style="max-width:340px;">
              ${analyses
                .map(
                  (a) =>
                    `<option value="${escapeHtml(a.id)}" ${active?.id === a.id ? "selected" : ""}>${escapeHtml(a.topic)} · ${escapeHtml(a.location)}</option>`
                )
                .join("")}
            </select>
          </div>
        `
        : ""
    }

    ${
      active
        ? renderMarketReport(active)
        : `
          <div class="empty-state">
            <h3>No market analyses generated yet</h3>
            <p>Select one of your startup recommendations or enter a custom venture concept above to inspect target audience, competitors, and industry trends.</p>
          </div>
        `
    }
  `;
}

function renderMarketReport(report) {
  const verified = report.verified_context || {};
  const insights = report.ai_insights || {};
  return `
    <div style="display:flex;flex-direction:column;gap:20px;">
      <div class="surface">
        <div class="meta-line" style="margin-bottom:6px;">
          <span>${escapeHtml(report.industry)}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>${escapeHtml(report.location)}</span>
          <span class="meta-sep" aria-hidden="true">·</span>
          <span>${escapeHtml(formatDate(report.created_at))}</span>
        </div>
        <h2 style="font-size:21px;font-weight:700;margin-bottom:10px;">${escapeHtml(report.topic)}</h2>
        <p style="margin:0;color:var(--slate-700);">${escapeHtml(report.summary)}</p>
      </div>

      <div class="surface" style="background-color:var(--blue-50);border-color:#bfdbfe;">
        <div style="font-size:12.5px;font-weight:700;color:var(--blue-700);margin-bottom:6px;">VERIFIED BASELINE CONTEXT &amp; AUTHORITATIVE SOURCES</div>
        <p style="margin:0 0 12px;font-size:13.5px;color:#1e3a8a;">${escapeHtml(verified.disclaimer || "Use the official portals below to verify quantitative market figures before investor pitches.")}</p>
        <div class="grid-2">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--navy-900);margin-bottom:6px;">Structural &amp; Regulatory Context</div>
            <ul class="clean-list">
              ${(verified.structural_facts || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--navy-900);margin-bottom:6px;">Official Sources for Primary Data</div>
            <ul class="clean-list">
              ${(verified.official_sources_to_verify || [])
                .map((s) => `<li><strong>${escapeHtml(s.name)}:</strong> ${escapeHtml(s.purpose)}</li>`)
                .join("")}
            </ul>
          </div>
        </div>
      </div>

      <div class="surface">
        <div class="notice-bar notice-bar-caution" style="margin-bottom:18px;">
          <strong>AI-Generated Market Insights:</strong> The qualitative breakdown below is synthesized by Gemini AI to support hypothesis testing and customer discovery, not audited market statistics.
        </div>

        <div class="grid-2" style="margin-bottom:20px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">Target Audience Segments</h3>
            <ul class="clean-list">
              ${(insights.target_audience || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">Market Opportunities</h3>
            <ul class="clean-list">
              ${(insights.market_opportunities || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">Industry Trends</h3>
            <ul class="clean-list">
              ${(insights.industry_trends || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:600;margin-bottom:8px;">Business Challenges</h3>
            <ul class="clean-list">
              ${(insights.business_challenges || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>
        </div>

        <hr class="divider" />
        <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Competitor Landscape Overview (AI-Synthesized)</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Competitor Archetype</th>
                <th>Typical Positioning</th>
                <th>Differentiation Angle</th>
              </tr>
            </thead>
            <tbody>
              ${(insights.competitor_overview || [])
                .map(
                  (c) => `
                  <tr>
                    <td><strong>${escapeHtml(c.archetype)}</strong></td>
                    <td>${escapeHtml(c.positioning)}</td>
                    <td>${escapeHtml(c.differentiation_angle)}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

export function renderFinancialAnalysisView() {
  const scenarios = state.financialScenarios || [];
  const active = state.activeFinancialScenario || scenarios[0] || null;
  const selectedRec = state.recommendations.find((r) => r.id === state.selectedStartupId);

  const defaults = active?.assumptions || {
    initial_investment: selectedRec?.required_investment_inr || state.profile?.investment_budget || 300000,
    monthly_expenses: selectedRec?.estimated_monthly_expenses_inr || 45000,
    expected_monthly_revenue: selectedRec?.estimated_monthly_revenue_inr || 75000,
    monthly_growth_rate: 6,
    projection_months: 12,
  };
  const defaultTitle = active?.title || (selectedRec ? `${selectedRec.business_name} Estimate` : "Startup Financial Estimate");

  return `
    <div class="page-header">
      <div>
        <h1>Financial Analysis</h1>
        <p>Interactive break-even, cash flow, and ROI calculator. All projections are deterministic mathematical estimates based on your inputs.</p>
      </div>
    </div>

    <div class="notice-bar notice-bar-caution">
      <strong>Estimated Projections Notice:</strong> Results below are strictly model estimates derived from your assumptions—not guaranteed revenue or audited financial forecasts.
    </div>

    <div class="surface" style="margin-bottom:24px;">
      <form id="financial-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="fin-startup-select">Load Baseline from Startup Idea (Optional)</label>
          <select class="form-select" id="fin-startup-select" name="startup_id">
            <option value="">Custom assumptions</option>
            ${state.recommendations
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.id)}" ${selectedRec?.id === r.id ? "selected" : ""}>${escapeHtml(r.business_name)} (${escapeHtml(r.required_investment_label || formatCurrency(r.required_investment_inr))})</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-title">Scenario Title</label>
          <input class="form-input" id="fin-title" name="title" required value="${escapeHtml(defaultTitle)}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-initial">Initial Investment (INR)</label>
          <input class="form-input tabular" id="fin-initial" name="initial_investment" type="number" min="0" step="1000" required value="${escapeHtml(defaults.initial_investment)}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-expenses">Monthly Operating Expenses (INR)</label>
          <input class="form-input tabular" id="fin-expenses" name="monthly_expenses" type="number" min="0" step="500" required value="${escapeHtml(defaults.monthly_expenses)}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-revenue">Expected Month-1 Revenue (INR)</label>
          <input class="form-input tabular" id="fin-revenue" name="expected_monthly_revenue" type="number" min="0" step="500" required value="${escapeHtml(defaults.expected_monthly_revenue)}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-growth">Monthly Revenue Growth Rate (%)</label>
          <input class="form-input tabular" id="fin-growth" name="monthly_growth_rate" type="number" min="-20" max="100" step="0.5" required value="${escapeHtml(defaults.monthly_growth_rate)}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="fin-months">Projection Horizon (Months)</label>
          <select class="form-select tabular" id="fin-months" name="projection_months">
            ${[6, 12, 18, 24, 36]
              .map((m) => `<option value="${m}" ${Number(defaults.projection_months) === m ? "selected" : ""}>${m} Months</option>`)
              .join("")}
          </select>
        </div>

        <div class="form-field form-field-full" style="display:flex;flex-direction:row;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
          <button type="submit" class="btn btn-primary" id="fin-calc-btn">Calculate &amp; Save Estimate</button>
        </div>
      </form>
    </div>

    ${
      active
        ? `
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Est. Month-1 Profit</div>
              <div class="kpi-value ${active.metrics.estimated_monthly_profit_m1 >= 0 ? "state-positive" : "state-alert"}">${formatCurrency(active.metrics.estimated_monthly_profit_m1)}</div>
              <div class="kpi-sub">Revenue minus expenses</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Est. Horizon Net Profit</div>
              <div class="kpi-value">${formatCurrency(active.metrics.estimated_net_profit)}</div>
              <div class="kpi-sub">Over ${active.assumptions.projection_months} months</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Est. Break-Even Point</div>
              <div class="kpi-value">${active.metrics.break_even_month ? `Month ${active.metrics.break_even_month}` : "N/A"}</div>
              <div class="kpi-sub">${active.metrics.break_even_month ? "Cumulative cash flow >= 0" : "Not reached in horizon"}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Estimated ROI</div>
              <div class="kpi-value">${active.metrics.estimated_roi_percent}%</div>
              <div class="kpi-sub">On initial investment</div>
            </div>
          </div>

          <div class="grid-2" style="margin-bottom:24px;">
            <div class="surface">
              <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Estimated Monthly Revenue vs. Expenses</h3>
              <div class="chart-box"><canvas id="chart-rev-exp"></canvas></div>
            </div>
            <div class="surface">
              <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Estimated Cumulative Cash Flow (Break-Even)</h3>
              <div class="chart-box"><canvas id="chart-cashflow"></canvas></div>
            </div>
          </div>

          <div class="surface" style="margin-bottom:24px;">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Month-by-Month Estimate Breakdown</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th class="num-col">Est. Revenue</th>
                    <th class="num-col">Est. Expenses</th>
                    <th class="num-col">Est. Net Profit</th>
                    <th class="num-col">Cumulative Cash Flow</th>
                  </tr>
                </thead>
                <tbody>
                  ${(active.series || [])
                    .map(
                      (row) => `
                      <tr>
                        <td class="tabular">${escapeHtml(row.label)}</td>
                        <td class="num-col">${formatCurrency(row.revenue)}</td>
                        <td class="num-col">${formatCurrency(row.expenses)}</td>
                        <td class="num-col ${row.net_profit >= 0 ? "state-positive" : "state-alert"}">${formatCurrency(row.net_profit)}</td>
                        <td class="num-col ${row.cumulative_cashflow >= 0 ? "state-positive" : ""}">${formatCurrency(row.cumulative_cashflow)}</td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        : ""
    }

    ${
      scenarios.length > 0
        ? `
          <div class="surface">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:12px;">Saved Financial Scenarios</h3>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th class="num-col">Initial Capital</th>
                    <th class="num-col">Break-Even</th>
                    <th class="num-col">Est. ROI</th>
                    <th class="num-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${scenarios
                    .map(
                      (s) => `
                      <tr>
                        <td><strong>${escapeHtml(s.title)}</strong></td>
                        <td class="num-col">${formatCurrency(s.assumptions?.initial_investment)}</td>
                        <td class="num-col">${s.metrics?.break_even_month ? `Month ${s.metrics.break_even_month}` : "—"}</td>
                        <td class="num-col">${escapeHtml(s.metrics?.estimated_roi_percent ?? 0)}%</td>
                        <td class="num-col">
                          <button type="button" class="btn btn-secondary btn-sm" data-select-fin="${escapeHtml(s.id)}">Load</button>
                          <button type="button" class="btn btn-ghost btn-sm" data-delete-fin="${escapeHtml(s.id)}">Delete</button>
                        </td>
                      </tr>
                    `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        : ""
    }
  `;
}

export function renderSchemesView() {
  const categories = ["All", "Seed Funding", "Tax & Regulatory", "Subsidy & Credit", "Micro Credit", "Credit Guarantee", "Inclusive Entrepreneurship"];
  const schemes = state.schemes || [];

  return `
    <div class="page-header">
      <div>
        <h1>Government Schemes</h1>
        <p>Verified Indian Central Government startup and MSME funding, tax, and credit support schemes with official application portals.</p>
      </div>
    </div>

    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;">
      <div class="segmented">
        ${categories
          .map(
            (cat) =>
              `<button type="button" class="seg-btn ${state.schemeCategory === cat ? "active" : ""}" data-scheme-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
          )
          .join("")}
      </div>
      <input
        type="search"
        id="scheme-search-input"
        class="form-input"
        style="max-width:280px;"
        placeholder="Search schemes..."
        value="${escapeHtml(state.schemeSearch)}"
      />
    </div>

    ${
      schemes.length > 0
        ? `<div style="display:flex;flex-direction:column;gap:16px;">
            ${schemes
              .map((s) => {
                const safeHref = isSafeHttpUrl(s.official_url) ? s.official_url : "#";
                return `
                  <article class="surface">
                    <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;">
                      <div>
                        <div class="meta-line" style="margin-bottom:6px;">
                          <span>${escapeHtml(s.category)}</span>
                          <span class="meta-sep" aria-hidden="true">·</span>
                          <span>${escapeHtml(s.ministry)}</span>
                        </div>
                        <h2 style="font-size:19px;font-weight:700;color:var(--navy-900);">${escapeHtml(s.name)}</h2>
                        <div style="margin-top:4px;font-size:14px;font-weight:600;color:var(--blue-600);">${escapeHtml(s.max_support)}</div>
                      </div>
                      <a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                        Apply on Official Portal
                      </a>
                    </div>

                    <div class="grid-2">
                      <div>
                        <div style="font-size:13px;font-weight:600;color:var(--slate-900);margin-bottom:6px;">Eligibility Criteria</div>
                        <ul class="clean-list">
                          ${(s.eligibility || []).map((e) => `<li>${escapeHtml(e)}</li>`).join("")}
                        </ul>
                      </div>
                      <div>
                        <div style="font-size:13px;font-weight:600;color:var(--slate-900);margin-bottom:6px;">Key Benefits</div>
                        <ul class="clean-list">
                          ${(s.benefits || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
                        </ul>
                      </div>
                    </div>

                    <div style="margin-top:12px;font-size:12.5px;color:var(--slate-500);">
                      Official Source: <a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" style="color:var(--blue-600);text-decoration:underline;">${escapeHtml(s.portal_name)}</a>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>`
        : `<div class="empty-state"><h3>No schemes matched your search</h3><p>Try clearing the filter or searching for Startup India, PMEGP, or MUDRA.</p></div>`
    }
  `;
}
