import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

export function renderLandingPage() {
  const heroPrimaryImg = "/src/assets/images/hero_startup_studio_1795580706817.jpg";
  const heroDockerImg = "/assets/hero_startup_studio.jpg";

  return `
    <div class="landing-shell">
      <header class="landing-header">
        <div class="landing-header-inner">
          <a href="#top" class="brand-wordmark">Entrepreneur<span>AI</span></a>
          <nav class="landing-nav" aria-label="Primary navigation">
            <a href="#overview">Overview</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#schemes-preview">Government Schemes</a>
          </nav>
          <div class="landing-actions">
            <button type="button" class="btn btn-ghost" data-open-auth="login">Login</button>
            <button type="button" class="btn btn-primary" data-open-auth="register">Get Started</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section class="hero-section">
          <div class="landing-container">
            <div class="hero-grid">
              <div class="hero-copy">
                <div class="hero-kicker">Startup Intelligence &amp; Venture Planning</div>
                <h1 class="hero-title">Turn your skills and budget into a viable startup plan.</h1>
                <p class="hero-subtitle">
                  EntrepreneurAI evaluates your education, technical and business capabilities, capital budget, and regional market context to generate tailored startup recommendations, financial models, execution roadmaps, and investor-ready business plans.
                </p>
                <div class="hero-cta-row">
                  <button type="button" class="btn btn-primary" data-open-auth="register">Get Started</button>
                  <button type="button" class="btn btn-secondary" data-open-auth="login">Login to Workspace</button>
                </div>
                <div class="hero-meta-strip">
                  <span>Personalized Venture Discovery</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span>Interactive Break-Even Modeling</span>
                  <span class="meta-sep" aria-hidden="true">·</span>
                  <span>Verified Indian MSME &amp; Startup Schemes</span>
                </div>
              </div>

              <div class="hero-media">
                <img
                  src="${heroPrimaryImg}"
                  alt="Founders collaborating around financial blueprints and laptops in a bright modern startup studio"
                  referrerpolicy="no-referrer"
                  onerror="if(!this.dataset.triedAlt){this.dataset.triedAlt='1';this.src='${heroDockerImg}';}else{this.style.display='none';this.nextElementSibling.style.display='flex';}"
                />
                <div class="hero-media-fallback" style="display:none;">
                  <div style="font-family:var(--font-display);font-size:22px;font-weight:700;margin-bottom:8px;">EntrepreneurAI Studio</div>
                  <div style="font-size:14px;color:#cbd5e1;max-width:34ch;">AI-assisted venture discovery, financial feasibility, and structured business planning.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="overview" class="section-block">
          <div class="landing-container">
            <div class="section-header">
              <div class="section-kicker">Project Overview</div>
              <h2 class="section-title">Built for students, graduates, and first-time founders.</h2>
              <p class="section-desc">
                Most aspiring entrepreneurs struggle to bridge the gap between an academic background and an investable business model. EntrepreneurAI replaces guesswork with structured analysis across ideation, unit economics, compliance, and funding support.
              </p>
            </div>

            <div class="grid-3">
              <div class="bento-card">
                <div class="bento-card-index">01</div>
                <h3>Profile-First Matching</h3>
                <p>Recommendations adapt directly to your real capital limit, location, education, risk tolerance, and existing technical or commercial strengths.</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">02</div>
                <h3>Transparent Separation of Facts</h3>
                <p>Market reports clearly distinguish verified baseline regulatory context and official data portals from AI-generated strategic hypotheses.</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">03</div>
                <h3>Execution Through Launch</h3>
                <p>Move beyond ideas with deterministic ROI calculators, 11-section PDF business plans, 8-stage launch checklists, and VentureBot mentorship.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="capabilities" class="section-block" style="background-color:var(--slate-50);">
          <div class="landing-container">
            <div class="section-header">
              <div class="section-kicker">Key Capabilities</div>
              <h2 class="section-title">One workspace from initial concept to launch checklist.</h2>
              <p class="section-desc">Every module connects directly to your founder profile and saved venture concepts.</p>
            </div>

            <div class="bento-grid">
              <div class="bento-card bento-card-wide">
                <div class="bento-card-index">01 · AI Startup Recommendation Engine</div>
                <h3>Five personalized startup opportunities scored out of 100</h3>
                <p>Powered by Google Gemini, EntrepreneurAI analyses your skills, budget, and city to propose five distinct business models—complete with target customers, required skills, key opportunities, operational risks, and a clear explanation of why each fits you.</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">02 · Financial Analysis</div>
                <h3>Break-even &amp; ROI calculator</h3>
                <p>Adjust initial investment, monthly burn, expected revenue, and growth assumptions with live Chart.js cash flow charts clearly labeled as estimates.</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">03 · Business Plan Generator</div>
                <h3>11-section plan with PDF export</h3>
                <p>Generate structured executive summaries, competitor positioning, marketing playbooks, and risk mitigation plans, then download as a formatted PDF.</p>
              </div>
              <div class="bento-card bento-card-wide">
                <div class="bento-card-index">04 · Startup Roadmap &amp; VentureBot</div>
                <h3>Trackable 8-phase execution checklist and context-aware AI advisor</h3>
                <p>Convert any selected business idea into an actionable 8-stage launch roadmap—from idea validation and business registration to customer acquisition—and consult VentureBot anytime with full awareness of your profile and active venture.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" class="section-block section-block-navy">
          <div class="landing-container">
            <div class="section-header">
              <div class="section-kicker">How It Works</div>
              <h2 class="section-title">Four structured steps from profile to launch plan.</h2>
              <p class="section-desc">Create your private workspace in under two minutes and iterate at your own pace.</p>
            </div>

            <div class="steps-grid">
              <div class="step-card">
                <div class="step-num">Step 01</div>
                <h3>Build Your Profile</h3>
                <p>Enter your education, technical and business skills, interests, capital budget, city, and risk preference.</p>
              </div>
              <div class="step-card">
                <div class="step-num">Step 02</div>
                <h3>Discover &amp; Compare</h3>
                <p>Generate 5 tailored startup concepts, inspect suitability scores, and compare your top contenders side-by-side.</p>
              </div>
              <div class="step-card">
                <div class="step-num">Step 03</div>
                <h3>Model Market &amp; Finances</h3>
                <p>Run AI-assisted market research and test revenue, expense, and break-even scenarios using interactive charts.</p>
              </div>
              <div class="step-card">
                <div class="step-num">Step 04</div>
                <h3>Plan, Fund &amp; Launch</h3>
                <p>Export your PDF business plan, review verified Startup India, PMEGP &amp; MUDRA schemes, and track roadmap tasks.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="schemes-preview" class="section-block">
          <div class="landing-container">
            <div class="section-header">
              <div class="section-kicker">Official Funding &amp; Policy Directory</div>
              <h2 class="section-title">Verified Indian startup and MSME support schemes.</h2>
              <p class="section-desc">Explore factual eligibility rules, benefits, and direct official government portal links—with zero invented terms.</p>
            </div>

            <div class="grid-3">
              <div class="bento-card">
                <div class="bento-card-index">DPIIT · Seed Funding</div>
                <h3>Startup India Seed Fund (SISFS)</h3>
                <p>Up to ₹20 Lakhs grant for proof-of-concept and up to ₹50 Lakhs via convertible instruments through recognized incubators.</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">Ministry of MSME · Subsidy</div>
                <h3>PMEGP Credit-Linked Subsidy</h3>
                <p>15%–35% margin money subsidy for new manufacturing (up to ₹50 Lakhs) and service ventures (up to ₹20 Lakhs).</p>
              </div>
              <div class="bento-card">
                <div class="bento-card-index">Ministry of Finance · Micro Credit</div>
                <h3>Pradhan Mantri MUDRA Yojana</h3>
                <p>Collateral-free non-farm micro-credit up to ₹20 Lakhs across Shishu, Kishor, Tarun, and Tarun Plus categories.</p>
              </div>
            </div>

            <div style="margin-top:32px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
              <button type="button" class="btn btn-primary" data-open-auth="register">Create Free Account</button>
              <button type="button" class="btn btn-secondary" data-open-auth="login">Sign In</button>
            </div>
          </div>
        </section>
      </main>

      <footer class="landing-footer">
        <div class="landing-container landing-footer-inner">
          <div class="brand-wordmark" style="color:#ffffff;">Entrepreneur<span>AI</span></div>
          <div>AI-powered startup recommendations, financial modeling, and business planning.</div>
        </div>
      </footer>
    </div>

    ${renderAuthModal()}
  `;
}

export function renderAuthModal() {
  const isLogin = state.authMode === "login";
  return `
    <div id="auth-modal" class="modal-backdrop ${state.authModalOpen ? "open" : ""}" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div class="modal-panel">
        <div class="modal-header">
          <div>
            <h2 id="auth-modal-title" style="font-size:21px;font-weight:700;">
              ${isLogin ? "Sign in to EntrepreneurAI" : "Create your founder account"}
            </h2>
            <p style="margin:4px 0 0;font-size:13.5px;color:var(--slate-600);">
              ${isLogin ? "Access your saved startup ideas, plans, and roadmaps." : "Set up your private workspace in seconds."}
            </p>
          </div>
          <button type="button" class="modal-close" data-close-auth aria-label="Close dialog">&times;</button>
        </div>

        <div class="segmented" style="width:100%;margin-bottom:18px;">
          <button type="button" class="seg-btn ${isLogin ? "active" : ""}" style="flex:1;" data-switch-auth="login">Login</button>
          <button type="button" class="seg-btn ${!isLogin ? "active" : ""}" style="flex:1;" data-switch-auth="register">Register</button>
        </div>

        <div id="auth-error" class="notice-bar notice-bar-error" style="display:none;"></div>

        <form id="auth-form" style="display:flex;flex-direction:column;gap:14px;">
          ${
            !isLogin
              ? `<div class="form-field">
                  <label class="form-label" for="auth-name">Full Name</label>
                  <input class="form-input" id="auth-name" name="name" type="text" required minlength="2" placeholder="e.g., Aarav Sharma" />
                </div>`
              : ""
          }
          <div class="form-field">
            <label class="form-label" for="auth-email">Email Address</label>
            <input class="form-input" id="auth-email" name="email" type="email" required placeholder="founder@example.com" />
          </div>
          <div class="form-field">
            <label class="form-label" for="auth-password">Password</label>
            <input class="form-input" id="auth-password" name="password" type="password" required minlength="${isLogin ? 1 : 8}" placeholder="${isLogin ? "Enter your password" : "Minimum 8 characters"}" />
          </div>
          <button type="submit" class="btn btn-primary" id="auth-submit-btn" style="margin-top:4px;width:100%;">
            ${isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  `;
}
