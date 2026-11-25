import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_FALLBACK_MODEL = "gemini-4-hydrogen";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const DATA_DIR = path.resolve(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "entrepreneurai_db.json");

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

interface ProfileRecord {
  user_id: string;
  full_name: string;
  education: string;
  technical_skills: string[];
  business_skills: string[];
  interests: string[];
  investment_budget: number;
  currency: string;
  location: string;
  business_experience: string;
  risk_preference: "Low" | "Moderate" | "High";
  updated_at: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  profiles: ProfileRecord[];
  recommendations: Array<Record<string, any>>;
  market_analyses: Array<Record<string, any>>;
  financial_analyses: Array<Record<string, any>>;
  business_plans: Array<Record<string, any>>;
  roadmaps: Array<Record<string, any>>;
  chat_history: Array<Record<string, any>>;
  activities: Array<Record<string, any>>;
}

const VERIFIED_GOVERNMENT_SCHEMES = [
  {
    id: "sisfs",
    name: "Startup India Seed Fund Scheme (SISFS)",
    ministry: "Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce & Industry",
    category: "Seed Funding",
    max_support: "Up to ₹20 Lakhs (Grant) / ₹50 Lakhs (Debt or Convertible Debentures)",
    eligibility: [
      "Startup must be recognized by DPIIT and incorporated not more than 2 years ago at the time of application.",
      "Must have a business idea to develop a product or service with market fit, viable commercialization, and scope of scaling.",
      "Preference is given to startups creating innovative solutions in sectors such as social impact, waste management, water management, financial inclusion, education, agriculture, food processing, biotechnology, healthcare, energy, mobility, defence, space, railways, oil and gas, and textiles.",
      "Shareholding by Indian promoters must be at least 51% at the time of application.",
      "Must not have received more than ₹10 Lakhs of monetary support under any other Central or State Government scheme.",
    ],
    benefits: [
      "Up to ₹20 Lakhs as a grant for validation of Proof of Concept, prototype development, or product trials.",
      "Up to ₹50 Lakhs of investment for market entry, commercialization, or scaling through convertible debentures or debt/debt-linked instruments.",
      "Disbursed through selected DPIIT-recognized incubators across India.",
    ],
    official_url: "https://seedfund.startupindia.gov.in/",
    portal_name: "Startup India Seed Fund Portal",
  },
  {
    id: "dpiit-recognition",
    name: "DPIIT Startup India Recognition & Tax Benefits",
    ministry: "Department for Promotion of Industry and Internal Trade (DPIIT)",
    category: "Tax & Regulatory",
    max_support: "3-Year Income Tax Holiday (Section 80-IAC) & 80% Patent Fee Rebate",
    eligibility: [
      "Incorporated as a Private Limited Company, Registered Partnership Firm, or Limited Liability Partnership (LLP) in India.",
      "Period of existence and operations should not exceed 10 years from the date of incorporation.",
      "Annual turnover has not exceeded ₹100 Crore in any financial year since incorporation.",
      "Entity must be working towards innovation, development, or improvement of products/processes/services, or a scalable business model with high potential for employment generation or wealth creation.",
    ],
    benefits: [
      "Section 80-IAC: 100% income tax exemption on profits for 3 consecutive financial years out of the first 10 years (subject to Inter-Ministerial Board approval).",
      "Self-certification compliance under 6 Labour Laws and 3 Environmental Laws.",
      "Up to 80% rebate on patent filing fees and 50% rebate on trademark filing fees, plus fast-track patent examination.",
      "Exemption from prior experience and turnover criteria in public procurement on GeM.",
    ],
    official_url: "https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html",
    portal_name: "Startup India Official Portal",
  },
  {
    id: "pmegp",
    name: "Prime Minister's Employment Generation Programme (PMEGP)",
    ministry: "Ministry of Micro, Small and Medium Enterprises (Implemented by KVIC)",
    category: "Subsidy & Credit",
    max_support: "Up to ₹50 Lakhs (Manufacturing) / ₹20 Lakhs (Service) with 15%–35% Subsidy",
    eligibility: [
      "Any individual above 18 years of age.",
      "At least VIII standard pass educational qualification is required for projects costing above ₹10 Lakhs in the manufacturing sector and above ₹5 Lakhs in the business/service sector.",
      "Only new projects are sanctioned under PMEGP; existing units or units that have already availed government subsidy under another scheme are not eligible.",
      "Self Help Groups (including BPL), Institutions registered under Societies Registration Act 1860, Production Co-operative Societies, and Charitable Trusts are also eligible.",
    ],
    benefits: [
      "Maximum admissible project cost: ₹50 Lakhs for manufacturing and ₹20 Lakhs for business/service sector.",
      "Margin Money (Subsidy): 15% (Urban) and 25% (Rural) for General category; 25% (Urban) and 35% (Rural) for Special categories (SC/ST/OBC/Minorities/Women/Ex-Servicemen/Physically Handicapped/NER/Hill & Border areas).",
      "Beneficiary contribution is only 10% (General) or 5% (Special category) of the project cost.",
    ],
    official_url: "https://www.kviconline.gov.in/pmegpeportal/pmegphome/index.jsp",
    portal_name: "KVIC PMEGP Online Portal",
  },
  {
    id: "mudra",
    name: "Pradhan Mantri Mudra Yojana (PMMY / MUDRA)",
    ministry: "Department of Financial Services, Ministry of Finance",
    category: "Micro Credit",
    max_support: "Collateral-free loans up to ₹20 Lakhs (Shishu, Kishor, Tarun & Tarun Plus)",
    eligibility: [
      "Any Indian citizen who has a viable business plan for a non-farm income-generating activity such as manufacturing, processing, trading, or service sector.",
      "Micro and small enterprises including proprietorships, partnership firms, small manufacturing units, shopkeepers, artisans, and service providers.",
      "Borrower should not be a defaulter to any bank or financial institution.",
      "For Tarun Plus (₹10L to ₹20L), entrepreneur must have previously availed and successfully repaid a Tarun category MUDRA loan.",
    ],
    benefits: [
      "Shishu: Loans up to ₹50,000 for early-stage micro businesses.",
      "Kishor: Loans above ₹50,000 and up to ₹5 Lakhs.",
      "Tarun: Loans above ₹5 Lakhs and up to ₹10 Lakhs.",
      "Tarun Plus: Loans above ₹10 Lakhs and up to ₹20 Lakhs for repeat borrowers who repaid earlier Tarun loans.",
      "No collateral security required from banks, NBFCs, or MFIs; no processing fee typically charged for Shishu loans.",
    ],
    official_url: "https://www.mudra.org.in/",
    portal_name: "MUDRA Official Portal (Apply via JanSamarth)",
  },
  {
    id: "cgtmse",
    name: "Credit Guarantee Fund Trust for Micro and Small Enterprises (CGTMSE)",
    ministry: "Ministry of MSME & SIDBI",
    category: "Credit Guarantee",
    max_support: "Collateral-free credit guarantee up to ₹5 Crore",
    eligibility: [
      "New as well as existing Micro and Small Enterprises (MSEs) engaged in manufacturing or service activities (including retail trade).",
      "Must meet the MSME definition criteria under the MSMED Act and hold an Udyam Registration.",
      "Credit facility must be extended by an eligible Member Lending Institution (Scheduled Commercial Banks, RRBs, NBFCs, Small Finance Banks) without collateral security or third-party guarantee.",
    ],
    benefits: [
      "Guarantee coverage for collateral-free term loans and working capital facilities up to ₹5 Crore per borrower.",
      "Extent of guarantee cover ranges from 75% to 85% (85% for micro enterprises up to ₹5L, women entrepreneurs, SC/ST entrepreneurs, and MSEs in North Eastern Region).",
      "Enables founders without immovable property collateral to raise institutional bank debt.",
    ],
    official_url: "https://www.cgtmse.in/",
    portal_name: "CGTMSE Official Portal",
  },
  {
    id: "standup-india",
    name: "Stand-Up India Scheme",
    ministry: "Department of Financial Services, Ministry of Finance",
    category: "Inclusive Entrepreneurship",
    max_support: "Composite bank loans between ₹10 Lakhs and ₹1 Crore",
    eligibility: [
      "SC/ST and/or Women entrepreneurs above 18 years of age.",
      "Loans are available strictly for greenfield projects (first-time venture of the beneficiary in manufacturing, services, trading, or agri-allied sector).",
      "In case of non-individual enterprises, at least 51% of the shareholding and controlling stake should be held by either an SC/ST or Woman entrepreneur.",
      "Borrower must not be in default to any bank or financial institution.",
    ],
    benefits: [
      "Composite loan (inclusive of term loan and working capital) between ₹10 Lakhs and ₹1 Crore.",
      "Covers up to 85% of the project cost (with minimum 10% borrower contribution; can be converged with eligible central/state subsidies).",
      "Repayment period up to 7 years with a maximum moratorium period of 18 months.",
      "Handholding support for DPR preparation, skill development, and registration via Stand-Up Mitra portal.",
    ],
    official_url: "https://www.standupmitra.in/",
    portal_name: "Stand-Up Mitra Official Portal",
  },
];

function emptyDb(): DatabaseSchema {
  return {
    users: [],
    profiles: [],
    recommendations: [],
    market_analyses: [],
    financial_analyses: [],
    business_plans: [],
    roadmaps: [],
    chat_history: [],
    activities: [],
  };
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const initial = emptyDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}

function writeDb(db: DatabaseSchema): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), "utf-8");
  fs.renameSync(tmpFile, DB_FILE);
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf-8");
}

function signJwt(userId: string, email: string): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({ sub: userId, email, iat: nowSec, exp: nowSec + 60 * 60 * 24 * 7 })
  );
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  return `${header}.${payload}.${signature}`;
}

function verifyJwt(token: string): { sub: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest()
  );
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(payload));
    if (!parsed.sub || typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { sub: String(parsed.sub), email: String(parsed.email || "") };
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      cookies[k] = decodeURIComponent(v);
    }
  }
  return cookies;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const parts = [
    `eai_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  const parts = ["eai_session=", "Path=/", "HttpOnly", "Max-Age=0"];
  if (isHttps) {
    parts.push("Secure", "SameSite=None", "Partitioned");
  } else {
    parts.push("SameSite=Lax");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function computeProfileCompletion(profile: ProfileRecord | undefined): number {
  if (!profile) return 0;
  const checks = [
    Boolean(profile.full_name?.trim()),
    Boolean(profile.education?.trim()),
    Array.isArray(profile.technical_skills) && profile.technical_skills.length > 0,
    Array.isArray(profile.business_skills) && profile.business_skills.length > 0,
    Array.isArray(profile.interests) && profile.interests.length > 0,
    typeof profile.investment_budget === "number" && profile.investment_budget > 0,
    Boolean(profile.location?.trim()),
    Boolean(profile.business_experience?.trim()),
    Boolean(profile.risk_preference?.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function appendActivity(db: DatabaseSchema, userId: string, action: string, category: string, detail: string): void {
  db.activities.unshift({
    id: crypto.randomUUID(),
    user_id: userId,
    action,
    category,
    detail,
    created_at: nowIso(),
  });
  if (db.activities.length > 400) {
    db.activities = db.activities.slice(0, 400);
  }
}

function getGenAiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable AI generation."),
      { statusCode: 503 }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(err: any): { statusCode: number; message: string } {
  const rawMsg = String(err?.message || "AI service error.");
  try {
    const parsed = JSON.parse(rawMsg);
    if (parsed?.error?.message) {
      const code = Number(parsed.error.code);
      if (code === 503 || parsed.error.status === "UNAVAILABLE") {
        return {
          statusCode: 503,
          message: "Gemini AI is temporarily busy due to high demand. Please retry in a few seconds.",
        };
      }
      if (code === 429) {
        return {
          statusCode: 429,
          message: "Gemini API rate limit reached. Please wait a moment and try again.",
        };
      }
      return { statusCode: code >= 400 && code < 600 ? code : 502, message: parsed.error.message };
    }
  } catch {
    // not JSON
  }
  return { statusCode: err?.statusCode || 502, message: rawMsg };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(Object.assign(new Error(`${label} timed out after ${Math.round(ms / 1000)}s. Please try again.`), { statusCode: 504 }));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function callGeminiWithRetry(fn: (ai: GoogleGenAI, model: string) => Promise<any>) {
  const ai = getGenAiClient();
  const plan = [
    { model: GEMINI_MODEL, delayMs: 300 },
    { model: GEMINI_FALLBACK_MODEL, delayMs: 0 },
  ];
  let lastErr: any;
  for (let i = 0; i < plan.length; i++) {
    const { model, delayMs } = plan[i];
    const t0 = Date.now();
    try {
      const result = await withTimeout(fn(ai, model), 24000, "Gemini AI request");
      console.log(`[Gemini] ${model} succeeded in ${Date.now() - t0}ms`);
      return result;
    } catch (err: any) {
      lastErr = err;
      const msg = String(err?.message || "");
      console.warn(`[Gemini] ${model} failed in ${Date.now() - t0}ms: ${msg.slice(0, 160)}`);
      const isTransient =
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("timed out");
      if (!isTransient || i === plan.length - 1) {
        const formatted = formatGeminiError(err);
        throw Object.assign(new Error(formatted.message), { statusCode: formatted.statusCode });
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  const formatted = formatGeminiError(lastErr);
  throw Object.assign(new Error(formatted.message), { statusCode: formatted.statusCode });
}

async function generateStructuredJson<T>(prompt: string, systemInstruction: string, responseSchema: any): Promise<T> {
  const response = await callGeminiWithRetry((ai, model) =>
    ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: model === "gemini-3.1-flash-lite" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
        },
        responseMimeType: "application/json",
        responseSchema,
      },
    })
  );
  const text = (response.text ?? "").trim();
  if (!text) {
    throw Object.assign(new Error("AI returned an empty response."), { statusCode: 502 });
  }
  return JSON.parse(text) as T;
}

interface AuthedRequest extends Request {
  authUser?: { id: string; name: string; email: string; created_at: string };
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token = "";
  let usedCookie = false;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.eai_session) {
      token = cookies.eai_session;
      usedCookie = true;
    }
  }

  if (!token) {
    res.status(401).json({ detail: "Authentication required." });
    return;
  }

  if (usedCookie && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method.toUpperCase())) {
    const customHdr = req.headers["x-requested-with"];
    const origin = req.headers.origin;
    const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
    const originMatchesHost = Boolean(origin && host && origin.includes(host));
    if (customHdr !== "EntrepreneurAI" && !originMatchesHost) {
      res.status(403).json({ detail: "Request verification failed." });
      return;
    }
  }

  const decoded = verifyJwt(token);
  if (!decoded) {
    res.status(401).json({ detail: "Session invalid or expired. Please log in again." });
    return;
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === decoded.sub);
  if (!user) {
    res.status(401).json({ detail: "Account not found." });
    return;
  }

  req.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  };
  next();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((s) => s.length > 0)
    .slice(0, 30);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "2mb" }));

  // Health
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      database: "local-document-store",
      ai_configured: Boolean((process.env.GEMINI_API_KEY || "").trim()),
    });
  });

  // Auth routes
  app.post("/api/auth/register", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (name.length < 2 || name.length > 120) {
      res.status(400).json({ detail: "Name must be between 2 and 120 characters." });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ detail: "Please enter a valid email address." });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ detail: "Password must be at least 8 characters." });
      return;
    }

    const db = readDb();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ detail: "An account with this email already exists." });
      return;
    }

    const userId = crypto.randomUUID();
    const createdAt = nowIso();
    const newUser: UserRecord = {
      id: userId,
      name,
      email,
      password_hash: hashPassword(password),
      created_at: createdAt,
    };
    const newProfile: ProfileRecord = {
      user_id: userId,
      full_name: name,
      education: "",
      technical_skills: [],
      business_skills: [],
      interests: [],
      investment_budget: 0,
      currency: "INR",
      location: "",
      business_experience: "",
      risk_preference: "Moderate",
      updated_at: createdAt,
    };

    db.users.push(newUser);
    db.profiles.push(newProfile);
    appendActivity(db, userId, "Account Created", "auth", "Registered on EntrepreneurAI");
    writeDb(db);

    const token = signJwt(userId, email);
    setSessionCookie(req, res, token);
    res.status(201).json({
      access_token: token,
      token_type: "bearer",
      user: { id: userId, name, email, created_at: createdAt },
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password) {
      res.status(400).json({ detail: "Email and password are required." });
      return;
    }

    const db = readDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ detail: "Invalid email or password." });
      return;
    }

    appendActivity(db, user.id, "Signed In", "auth", "Logged into EntrepreneurAI workspace");
    writeDb(db);

    const token = signJwt(user.id, user.email);
    setSessionCookie(req, res, token);
    res.json({
      access_token: token,
      token_type: "bearer",
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(req, res);
    res.json({ status: "logged_out" });
  });

  app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const profile = db.profiles.find((p) => p.user_id === req.authUser!.id);
    res.json({
      user: req.authUser,
      profile_completion: computeProfileCompletion(profile),
    });
  });

  app.put("/api/auth/settings", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user) {
      res.status(404).json({ detail: "User not found." });
      return;
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const currentPassword = typeof req.body?.current_password === "string" ? req.body.current_password : "";
    const newPassword = typeof req.body?.new_password === "string" ? req.body.new_password : "";

    if (name && name.length >= 2) {
      user.name = name;
    }
    if (newPassword) {
      if (newPassword.length < 8) {
        res.status(400).json({ detail: "New password must be at least 8 characters." });
        return;
      }
      if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
        res.status(400).json({ detail: "Current password is incorrect." });
        return;
      }
      user.password_hash = hashPassword(newPassword);
    }

    appendActivity(db, user.id, "Account Updated", "settings", "Updated account preferences");
    writeDb(db);
    res.json({ user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at } });
  });

  app.delete("/api/auth/account", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    db.users = db.users.filter((u) => u.id !== uid);
    db.profiles = db.profiles.filter((p) => p.user_id !== uid);
    db.recommendations = db.recommendations.filter((r) => r.user_id !== uid);
    db.market_analyses = db.market_analyses.filter((m) => m.user_id !== uid);
    db.financial_analyses = db.financial_analyses.filter((f) => f.user_id !== uid);
    db.business_plans = db.business_plans.filter((b) => b.user_id !== uid);
    db.roadmaps = db.roadmaps.filter((rm) => rm.user_id !== uid);
    db.chat_history = db.chat_history.filter((c) => c.user_id !== uid);
    db.activities = db.activities.filter((a) => a.user_id !== uid);
    writeDb(db);
    clearSessionCookie(req, res);
    res.json({ status: "deleted" });
  });

  // Profile routes
  app.get("/api/profile", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    let profile = db.profiles.find((p) => p.user_id === req.authUser!.id);
    if (!profile) {
      profile = {
        user_id: req.authUser!.id,
        full_name: req.authUser!.name,
        education: "",
        technical_skills: [],
        business_skills: [],
        interests: [],
        investment_budget: 0,
        currency: "INR",
        location: "",
        business_experience: "",
        risk_preference: "Moderate",
        updated_at: nowIso(),
      };
    }
    res.json({ profile, completion_percentage: computeProfileCompletion(profile) });
  });

  app.put("/api/profile", requireAuth, (req: AuthedRequest, res) => {
    const uid = req.authUser!.id;
    const fullName = typeof req.body?.full_name === "string" ? req.body.full_name.trim() : "";
    const education = typeof req.body?.education === "string" ? req.body.education.trim() : "";
    const location = typeof req.body?.location === "string" ? req.body.location.trim() : "";
    const businessExperience =
      typeof req.body?.business_experience === "string" ? req.body.business_experience.trim() : "";
    const riskPref = req.body?.risk_preference;
    const budget = Number(req.body?.investment_budget);

    if (fullName.length < 2 || education.length < 2 || location.length < 2 || businessExperience.length < 2) {
      res.status(400).json({ detail: "Full name, education, location, and business experience are required." });
      return;
    }
    if (!Number.isFinite(budget) || budget < 0) {
      res.status(400).json({ detail: "Investment budget must be a valid non-negative number." });
      return;
    }
    if (!["Low", "Moderate", "High"].includes(riskPref)) {
      res.status(400).json({ detail: "Risk preference must be Low, Moderate, or High." });
      return;
    }

    const db = readDb();
    const updated: ProfileRecord = {
      user_id: uid,
      full_name: fullName,
      education,
      technical_skills: sanitizeStringArray(req.body?.technical_skills),
      business_skills: sanitizeStringArray(req.body?.business_skills),
      interests: sanitizeStringArray(req.body?.interests),
      investment_budget: budget,
      currency: typeof req.body?.currency === "string" && req.body.currency.trim() ? req.body.currency.trim() : "INR",
      location,
      business_experience: businessExperience,
      risk_preference: riskPref,
      updated_at: nowIso(),
    };

    const idx = db.profiles.findIndex((p) => p.user_id === uid);
    if (idx >= 0) db.profiles[idx] = updated;
    else db.profiles.push(updated);

    const uIdx = db.users.findIndex((u) => u.id === uid);
    if (uIdx >= 0) db.users[uIdx].name = fullName;

    appendActivity(db, uid, "Profile Updated", "profile", `Updated founder profile (${location})`);
    writeDb(db);
    res.json({ profile: updated, completion_percentage: computeProfileCompletion(updated) });
  });

  // Dashboard
  app.get("/api/dashboard", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const profile = db.profiles.find((p) => p.user_id === uid);
    const recs = db.recommendations.filter((r) => r.user_id === uid);
    const plans = db.business_plans.filter((p) => p.user_id === uid);
    const roadmaps = db.roadmaps.filter((rm) => rm.user_id === uid);
    const financials = db.financial_analyses.filter((f) => f.user_id === uid);
    const activities = db.activities.filter((a) => a.user_id === uid).slice(0, 10);

    let totalTasks = 0;
    let completedTasks = 0;
    for (const rm of roadmaps) {
      for (const stage of rm.stages || []) {
        for (const task of stage.tasks || []) {
          totalTasks += 1;
          if (task.completed) completedTasks += 1;
        }
      }
    }

    res.json({
      user: req.authUser,
      profile_completion: computeProfileCompletion(profile),
      total_recommendations: recs.length,
      saved_ideas_count: recs.filter((r) => Boolean(r.is_saved)).length,
      business_plans_count: plans.length,
      roadmap_progress: {
        completed: completedTasks,
        total: totalTasks,
        percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      recent_activities: activities,
      financial_overview: financials[0] || null,
    });
  });

  // Recommendations
  app.get("/api/recommendations", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const savedOnly = req.query.saved_only === "true";
    let items = db.recommendations.filter((r) => r.user_id === req.authUser!.id);
    if (savedOnly) {
      items = items.filter((r) => Boolean(r.is_saved));
    }
    res.json({ recommendations: items });
  });

  app.post("/api/recommendations/generate", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const db = readDb();
      const uid = req.authUser!.id;
      let profile = db.profiles.find((p) => p.user_id === uid);
      if (!profile) {
        profile = {
          user_id: uid,
          full_name: req.authUser!.name,
          education: "",
          technical_skills: [],
          business_skills: [],
          interests: [],
          investment_budget: 0,
          currency: "INR",
          location: "",
          business_experience: "Student / First-time founder",
          risk_preference: "Moderate",
          updated_at: nowIso(),
        };
        db.profiles.push(profile);
      }

      const inlineEducation = typeof req.body?.education === "string" ? req.body.education.trim() : "";
      const inlineSkills = Array.isArray(req.body?.skills)
        ? sanitizeStringArray(req.body.skills)
        : typeof req.body?.skills === "string"
        ? req.body.skills
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

      const customBudget =
        req.body?.custom_budget !== undefined && req.body?.custom_budget !== null && req.body?.custom_budget !== ""
          ? Number(req.body.custom_budget)
          : profile.investment_budget;
      const customLocation =
        typeof req.body?.custom_location === "string" && req.body.custom_location.trim()
          ? req.body.custom_location.trim()
          : profile.location;
      const focusSector = typeof req.body?.focus_sector === "string" ? req.body.focus_sector.trim() : "";
      const additionalNotes = typeof req.body?.additional_notes === "string" ? req.body.additional_notes.trim() : "";

      // Merge any newly provided inline context into the founder profile so completion updates smoothly
      let profileUpdated = false;
      if (inlineEducation && !profile.education) {
        profile.education = inlineEducation;
        profileUpdated = true;
      }
      if (inlineSkills.length > 0 && profile.technical_skills.length === 0) {
        profile.technical_skills = inlineSkills;
        profileUpdated = true;
      }
      if (customLocation && !profile.location) {
        profile.location = customLocation;
        profileUpdated = true;
      }
      if (Number.isFinite(customBudget) && customBudget > 0 && profile.investment_budget === 0) {
        profile.investment_budget = customBudget;
        profileUpdated = true;
      }
      if (profileUpdated) {
        profile.updated_at = nowIso();
      }

      const effectiveEducation = inlineEducation || profile.education;
      const effectiveTechSkills = inlineSkills.length > 0 ? inlineSkills : profile.technical_skills;
      const hasUsefulContext =
        Boolean(effectiveEducation) ||
        effectiveTechSkills.length > 0 ||
        profile.business_skills.length > 0 ||
        profile.interests.length > 0 ||
        Boolean(customLocation) ||
        Boolean(focusSector) ||
        Boolean(additionalNotes);

      if (!hasUsefulContext) {
        res.status(400).json({
          detail: "Please provide at least your education, skills, location, or target sector to generate tailored startup ideas.",
        });
        return;
      }

      const prompt = `Founder Profile:
- Name: ${profile.full_name}
- Education: ${effectiveEducation || "Not specified"}
- Technical Skills: ${effectiveTechSkills.join(", ") || "None specified"}
- Business Skills: ${profile.business_skills.join(", ") || "None specified"}
- Interests: ${profile.interests.join(", ") || "General"}
- Investment Budget: ${Number.isFinite(customBudget) ? customBudget : 0} ${profile.currency}
- Location: ${customLocation || "India"}
- Business Experience: ${profile.business_experience || "First-time founder"}
- Risk Preference: ${profile.risk_preference || "Moderate"}
- Optional Focus Sector: ${focusSector || "Open"}
- Additional Notes: ${additionalNotes || "None"}

Generate exactly 5 personalized, viable startup recommendations tailored to this founder.`;

      const ideas = await generateStructuredJson<Array<Record<string, any>>>(
        prompt,
        "You are a pragmatic startup advisor. Return a JSON array of EXACTLY 5 distinct, realistic startup recommendations matched to the user's profile. Keep description and match_explanation under 25 words each, and each list to 2 short phrases. Do not fabricate market statistics.",
        {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              business_name: { type: Type.STRING },
              tagline: { type: Type.STRING },
              description: { type: Type.STRING },
              industry: { type: Type.STRING },
              required_investment_inr: { type: Type.NUMBER },
              required_investment_label: { type: Type.STRING },
              estimated_monthly_expenses_inr: { type: Type.NUMBER },
              estimated_monthly_revenue_inr: { type: Type.NUMBER },
              target_customers: { type: Type.STRING },
              required_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              market_opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              business_challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
              risk_level: { type: Type.STRING },
              suitability_score: { type: Type.INTEGER },
              match_explanation: { type: Type.STRING },
            },
            required: [
              "business_name",
              "tagline",
              "description",
              "industry",
              "required_investment_inr",
              "required_investment_label",
              "estimated_monthly_expenses_inr",
              "estimated_monthly_revenue_inr",
              "target_customers",
              "required_skills",
              "market_opportunities",
              "business_challenges",
              "risk_level",
              "suitability_score",
              "match_explanation",
            ],
          },
        }
      );

      const batchId = crypto.randomUUID();
      const timestamp = nowIso();
      const docs = ideas.slice(0, 5).map((idea) => ({
        id: crypto.randomUUID(),
        batch_id: batchId,
        user_id: uid,
        ...idea,
        suitability_score: Math.max(0, Math.min(100, Number(idea.suitability_score) || 75)),
        risk_level: ["Low", "Medium", "High"].includes(idea.risk_level) ? idea.risk_level : "Medium",
        is_saved: false,
        created_at: timestamp,
      }));

      db.recommendations = [...docs, ...db.recommendations];
      appendActivity(db, uid, "Generated Startup Ideas", "recommendations", `Generated ${docs.length} AI startup recommendations`);
      writeDb(db);

      res.json({
        recommendations: docs,
        profile,
        completion_percentage: computeProfileCompletion(profile),
      });
    } catch (err: any) {
      const code = err?.statusCode || 502;
      res.status(code).json({ detail: err?.message || "Failed to generate startup recommendations." });
    }
  });

  app.patch("/api/recommendations/:id/save", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const item = db.recommendations.find((r) => r.id === req.params.id && r.user_id === uid);
    if (!item) {
      res.status(404).json({ detail: "Startup recommendation not found." });
      return;
    }
    item.is_saved = !Boolean(item.is_saved);
    appendActivity(
      db,
      uid,
      item.is_saved ? "Saved Startup Idea" : "Removed Saved Idea",
      "recommendations",
      item.business_name
    );
    writeDb(db);
    res.json({ recommendation: item });
  });

  app.delete("/api/recommendations/:id", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const before = db.recommendations.length;
    db.recommendations = db.recommendations.filter((r) => !(r.id === req.params.id && r.user_id === uid));
    if (db.recommendations.length === before) {
      res.status(404).json({ detail: "Startup recommendation not found." });
      return;
    }
    writeDb(db);
    res.json({ status: "deleted" });
  });

  // Market Analysis
  app.get("/api/market-analysis", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const items = db.market_analyses.filter((m) => m.user_id === req.authUser!.id);
    res.json({ analyses: items });
  });

  app.post("/api/market-analysis/generate", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
      const industry = typeof req.body?.industry === "string" ? req.body.industry.trim() : "";
      const location = typeof req.body?.location === "string" && req.body.location.trim() ? req.body.location.trim() : "India";
      const startupId = typeof req.body?.startup_id === "string" ? req.body.startup_id : null;

      if (topic.length < 2 || industry.length < 2) {
        res.status(400).json({ detail: "Startup topic and industry are required." });
        return;
      }

      const db = readDb();
      const uid = req.authUser!.id;
      const profile = db.profiles.find((p) => p.user_id === uid);

      const prompt = `Conduct structured market research for:
- Startup / Concept: ${topic}
- Industry: ${industry}
- Geography: ${location}
- Founder Budget Context: ${profile?.investment_budget ?? "Not specified"} INR`;

      const generated = await generateStructuredJson<Record<string, any>>(
        prompt,
        "You are a senior market research analyst. Never invent specific unverified market size figures, growth percentages, or proprietary revenues. Separate structural baseline context and public portals (IBEF, DPIIT, MoSPI, RBI) from AI-synthesized insights. Keep summary under 40 words, each array to 3 concise items, and competitor descriptions crisp.",
        {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            verified_context: {
              type: Type.OBJECT,
              properties: {
                disclaimer: { type: Type.STRING },
                structural_facts: { type: Type.ARRAY, items: { type: Type.STRING } },
                official_sources_to_verify: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      purpose: { type: Type.STRING },
                    },
                    required: ["name", "purpose"],
                  },
                },
              },
              required: ["disclaimer", "structural_facts", "official_sources_to_verify"],
            },
            ai_insights: {
              type: Type.OBJECT,
              properties: {
                target_audience: { type: Type.ARRAY, items: { type: Type.STRING } },
                market_opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                competitor_overview: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      archetype: { type: Type.STRING },
                      positioning: { type: Type.STRING },
                      differentiation_angle: { type: Type.STRING },
                    },
                    required: ["archetype", "positioning", "differentiation_angle"],
                  },
                },
                industry_trends: { type: Type.ARRAY, items: { type: Type.STRING } },
                business_challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                "target_audience",
                "market_opportunities",
                "competitor_overview",
                "industry_trends",
                "business_challenges",
              ],
            },
          },
          required: ["summary", "verified_context", "ai_insights"],
        }
      );

      const doc = {
        id: crypto.randomUUID(),
        user_id: uid,
        startup_id: startupId,
        topic,
        industry,
        location,
        ...generated,
        created_at: nowIso(),
      };
      db.market_analyses.unshift(doc);
      appendActivity(db, uid, "Market Analysis Generated", "market", `${topic} (${location})`);
      writeDb(db);

      res.json({ analysis: doc });
    } catch (err: any) {
      res.status(err?.statusCode || 502).json({ detail: err?.message || "Market analysis generation failed." });
    }
  });

  // Financial Analysis (deterministic mathematical model, labeled as estimates)
  app.get("/api/financial-analysis", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const scenarios = db.financial_analyses.filter((f) => f.user_id === req.authUser!.id);
    res.json({ scenarios });
  });

  app.post("/api/financial-analysis/calculate", requireAuth, (req: AuthedRequest, res) => {
    const title =
      typeof req.body?.title === "string" && req.body.title.trim().length >= 2
        ? req.body.title.trim()
        : "Startup Financial Scenario";
    const initialInvestment = Number(req.body?.initial_investment);
    const monthlyExpenses = Number(req.body?.monthly_expenses);
    const expectedMonthlyRevenue = Number(req.body?.expected_monthly_revenue);
    const monthlyGrowthRate = req.body?.monthly_growth_rate !== undefined ? Number(req.body.monthly_growth_rate) : 5;
    const projectionMonths = req.body?.projection_months !== undefined ? Number(req.body.projection_months) : 12;
    const shouldSave = req.body?.save !== false;
    const startupId = typeof req.body?.startup_id === "string" ? req.body.startup_id : null;

    if (
      !Number.isFinite(initialInvestment) ||
      initialInvestment < 0 ||
      !Number.isFinite(monthlyExpenses) ||
      monthlyExpenses < 0 ||
      !Number.isFinite(expectedMonthlyRevenue) ||
      expectedMonthlyRevenue < 0 ||
      !Number.isFinite(monthlyGrowthRate) ||
      monthlyGrowthRate < -20 ||
      monthlyGrowthRate > 100 ||
      !Number.isInteger(projectionMonths) ||
      projectionMonths < 6 ||
      projectionMonths > 36
    ) {
      res.status(400).json({ detail: "Please provide valid non-negative financial assumptions." });
      return;
    }

    const growth = monthlyGrowthRate / 100;
    const series: Array<Record<string, any>> = [];
    let cumulativeCashflow = -initialInvestment;
    let breakEvenMonth: number | null = null;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (let m = 1; m <= projectionMonths; m++) {
      const rev = expectedMonthlyRevenue * Math.pow(1 + growth, m - 1);
      const exp = monthlyExpenses;
      const net = rev - exp;
      cumulativeCashflow += net;
      totalRevenue += rev;
      totalExpenses += exp;
      if (breakEvenMonth === null && cumulativeCashflow >= 0) {
        breakEvenMonth = m;
      }
      series.push({
        month: m,
        label: `M${m}`,
        revenue: Math.round(rev * 100) / 100,
        expenses: Math.round(exp * 100) / 100,
        net_profit: Math.round(net * 100) / 100,
        cumulative_cashflow: Math.round(cumulativeCashflow * 100) / 100,
      });
    }

    const monthlyNetM1 = expectedMonthlyRevenue - monthlyExpenses;
    const totalNetProfit = totalRevenue - totalExpenses;
    const roiPercent =
      initialInvestment > 0
        ? Math.round(((totalNetProfit - initialInvestment) / initialInvestment) * 10000) / 100
        : 0;

    const scenario = {
      id: crypto.randomUUID(),
      user_id: req.authUser!.id,
      startup_id: startupId,
      title,
      is_estimate: true,
      assumptions: {
        initial_investment: initialInvestment,
        monthly_expenses: monthlyExpenses,
        expected_monthly_revenue: expectedMonthlyRevenue,
        monthly_growth_rate: monthlyGrowthRate,
        projection_months: projectionMonths,
      },
      metrics: {
        estimated_monthly_profit_m1: Math.round(monthlyNetM1 * 100) / 100,
        estimated_total_revenue: Math.round(totalRevenue * 100) / 100,
        estimated_total_expenses: Math.round(totalExpenses * 100) / 100,
        estimated_net_profit: Math.round(totalNetProfit * 100) / 100,
        break_even_month: breakEvenMonth,
        estimated_roi_percent: roiPercent,
      },
      series,
      created_at: nowIso(),
    };

    if (shouldSave) {
      const db = readDb();
      db.financial_analyses.unshift(scenario);
      appendActivity(db, req.authUser!.id, "Financial Estimate Saved", "financial", title);
      writeDb(db);
    }

    res.json({ scenario });
  });

  app.delete("/api/financial-analysis/:id", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const before = db.financial_analyses.length;
    db.financial_analyses = db.financial_analyses.filter((f) => !(f.id === req.params.id && f.user_id === uid));
    if (db.financial_analyses.length === before) {
      res.status(404).json({ detail: "Financial scenario not found." });
      return;
    }
    writeDb(db);
    res.json({ status: "deleted" });
  });

  // Business Plans
  app.get("/api/business-plans", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const plans = db.business_plans.filter((p) => p.user_id === req.authUser!.id);
    res.json({ plans });
  });

  app.post("/api/business-plans/generate", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const businessName = typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
      const industry = typeof req.body?.industry === "string" ? req.body.industry.trim() : "";
      const startupId = typeof req.body?.startup_id === "string" ? req.body.startup_id : null;
      const customNotes = typeof req.body?.custom_notes === "string" ? req.body.custom_notes.trim() : "";

      if (businessName.length < 2 || industry.length < 2) {
        res.status(400).json({ detail: "Business name and industry are required." });
        return;
      }

      const db = readDb();
      const uid = req.authUser!.id;
      const profile = db.profiles.find((p) => p.user_id === uid);
      const startup = startupId ? db.recommendations.find((r) => r.id === startupId && r.user_id === uid) : null;

      const prompt = `Business Name: ${businessName}
Industry: ${industry}
Founder Profile: ${JSON.stringify(profile || {})}
Selected Startup Context: ${startup ? JSON.stringify(startup) : "Custom Venture"}
Additional Notes: ${customNotes || "None"}

Generate a comprehensive, practical business plan covering all 11 sections. Clearly label any financial projections as estimates.`;

      const sections = await generateStructuredJson<Record<string, string>>(
        prompt,
        "You are an experienced startup CFO and venture strategist. Write a clear, actionable business plan tailored to the founder's profile, budget, and geography. Label financial figures as estimates. Keep each of the 11 sections crisp and focused (2-3 short sentences or 3 concise bullet points).",
        {
          type: Type.OBJECT,
          properties: {
            executive_summary: { type: Type.STRING },
            business_introduction: { type: Type.STRING },
            problem_statement: { type: Type.STRING },
            proposed_solution: { type: Type.STRING },
            target_market: { type: Type.STRING },
            competitor_analysis: { type: Type.STRING },
            marketing_strategy: { type: Type.STRING },
            investment_requirements: { type: Type.STRING },
            revenue_model: { type: Type.STRING },
            risk_analysis: { type: Type.STRING },
            future_growth: { type: Type.STRING },
          },
          required: [
            "executive_summary",
            "business_introduction",
            "problem_statement",
            "proposed_solution",
            "target_market",
            "competitor_analysis",
            "marketing_strategy",
            "investment_requirements",
            "revenue_model",
            "risk_analysis",
            "future_growth",
          ],
        }
      );

      const doc = {
        id: crypto.randomUUID(),
        user_id: uid,
        startup_id: startupId,
        business_name: businessName,
        industry,
        sections,
        created_at: nowIso(),
      };
      db.business_plans.unshift(doc);
      appendActivity(db, uid, "Business Plan Created", "plans", businessName);
      writeDb(db);

      res.json({ plan: doc });
    } catch (err: any) {
      res.status(err?.statusCode || 502).json({ detail: err?.message || "Failed to generate business plan." });
    }
  });

  app.delete("/api/business-plans/:id", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const before = db.business_plans.length;
    db.business_plans = db.business_plans.filter((p) => !(p.id === req.params.id && p.user_id === uid));
    if (db.business_plans.length === before) {
      res.status(404).json({ detail: "Business plan not found." });
      return;
    }
    writeDb(db);
    res.json({ status: "deleted" });
  });

  // Startup Roadmap
  app.get("/api/roadmaps", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const roadmaps = db.roadmaps.filter((rm) => rm.user_id === req.authUser!.id);
    res.json({ roadmaps });
  });

  app.post("/api/roadmaps/generate", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const businessName = typeof req.body?.business_name === "string" ? req.body.business_name.trim() : "";
      const industry = typeof req.body?.industry === "string" ? req.body.industry.trim() : "";
      const startupId = typeof req.body?.startup_id === "string" ? req.body.startup_id : null;

      if (businessName.length < 2 || industry.length < 2) {
        res.status(400).json({ detail: "Business name and industry are required." });
        return;
      }

      const db = readDb();
      const uid = req.authUser!.id;
      const profile = db.profiles.find((p) => p.user_id === uid);
      const startup = startupId ? db.recommendations.find((r) => r.id === startupId && r.user_id === uid) : null;

      const prompt = `Business Name: ${businessName}
Industry: ${industry}
Location: ${profile?.location || "India"}
Budget: ${profile?.investment_budget ?? 0} ${profile?.currency || "INR"}
Startup Context: ${startup ? JSON.stringify(startup) : "Custom Venture"}

Create a practical step-by-step launch roadmap covering all 8 stages:
1. Idea Validation
2. Market Research
3. Business Registration
4. Financial Planning
5. Product Development
6. Marketing
7. Customer Acquisition
8. Business Launch
Include 3 actionable tasks per stage.`;

      const rawStages = await generateStructuredJson<Array<Record<string, any>>>(
        prompt,
        "You are a startup execution mentor. Generate an 8-stage launch roadmap with 3 concrete, concise tasks per stage tailored to the business and geography. Keep summaries and task descriptions to 1 crisp sentence.",
        {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              summary: { type: Type.STRING },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    estimated_timeline: { type: Type.STRING },
                  },
                  required: ["title", "description", "estimated_timeline"],
                },
              },
            },
            required: ["phase", "summary", "tasks"],
          },
        }
      );

      const stages = rawStages.map((s) => ({
        phase: s.phase,
        summary: s.summary,
        tasks: (s.tasks || []).map((t: any) => ({
          id: crypto.randomUUID(),
          title: t.title,
          description: t.description,
          estimated_timeline: t.estimated_timeline,
          completed: false,
        })),
      }));

      const doc = {
        id: crypto.randomUUID(),
        user_id: uid,
        startup_id: startupId,
        business_name: businessName,
        industry,
        stages,
        created_at: nowIso(),
      };
      db.roadmaps.unshift(doc);
      appendActivity(db, uid, "Startup Roadmap Generated", "roadmap", businessName);
      writeDb(db);

      res.json({ roadmap: doc });
    } catch (err: any) {
      res.status(err?.statusCode || 502).json({ detail: err?.message || "Failed to generate startup roadmap." });
    }
  });

  app.patch("/api/roadmaps/:id/tasks/:taskId", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const roadmap = db.roadmaps.find((rm) => rm.id === req.params.id && rm.user_id === uid);
    if (!roadmap) {
      res.status(404).json({ detail: "Roadmap not found." });
      return;
    }

    let found = false;
    let toggledTitle = "";
    let toggledState = false;
    for (const stage of roadmap.stages || []) {
      for (const task of stage.tasks || []) {
        if (task.id === req.params.taskId) {
          task.completed = !Boolean(task.completed);
          found = true;
          toggledTitle = task.title;
          toggledState = task.completed;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      res.status(404).json({ detail: "Roadmap task not found." });
      return;
    }

    if (toggledState) {
      appendActivity(db, uid, "Completed Roadmap Task", "roadmap", toggledTitle);
    }
    writeDb(db);
    res.json({ roadmap });
  });

  app.delete("/api/roadmaps/:id", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const uid = req.authUser!.id;
    const before = db.roadmaps.length;
    db.roadmaps = db.roadmaps.filter((rm) => !(rm.id === req.params.id && rm.user_id === uid));
    if (db.roadmaps.length === before) {
      res.status(404).json({ detail: "Roadmap not found." });
      return;
    }
    writeDb(db);
    res.json({ status: "deleted" });
  });

  // VentureBot Chat
  app.get("/api/chat/history", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    const messages = db.chat_history.filter((m) => m.user_id === req.authUser!.id);
    res.json({ messages });
  });

  app.post("/api/chat/message", requireAuth, async (req: AuthedRequest, res) => {
    try {
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      const startupId = typeof req.body?.startup_id === "string" ? req.body.startup_id : null;
      if (!message) {
        res.status(400).json({ detail: "Message cannot be empty." });
        return;
      }

      const db = readDb();
      const uid = req.authUser!.id;
      const profile = db.profiles.find((p) => p.user_id === uid);
      const selectedStartup = startupId
        ? db.recommendations.find((r) => r.id === startupId && r.user_id === uid)
        : null;
      const recentHistory = db.chat_history.filter((m) => m.user_id === uid).slice(-12);

      const systemInstruction = `You are VentureBot, an expert AI startup advisor inside EntrepreneurAI.
You assist students, graduates, and aspiring entrepreneurs with startup ideas, entrepreneurship, business planning, financial modeling, marketing, and Indian government schemes (Startup India Seed Fund Scheme, DPIIT Recognition, PMEGP, PMMY/MUDRA, CGTMSE, Stand-Up India).
Ground your responses in the founder's profile and selected startup context below. Never invent fake statistics or unverified scheme terms; clearly label projections as estimates.

Founder Profile Context: ${JSON.stringify(profile || {})}
Selected Startup Context: ${JSON.stringify(selectedStartup || {})}`;

      const contents = [
        ...recentHistory.map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: String(item.content || "") }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];

      const response = await callGeminiWithRetry((client, model) =>
        client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingLevel: model === "gemini-3.1-flash-lite" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
            },
          },
        })
      );

      const reply = (response.text ?? "").trim();
      if (!reply) {
        res.status(502).json({ detail: "VentureBot returned an empty response." });
        return;
      }

      const userMsg = {
        id: crypto.randomUUID(),
        user_id: uid,
        startup_id: startupId,
        role: "user",
        content: message,
        created_at: nowIso(),
      };
      const assistantMsg = {
        id: crypto.randomUUID(),
        user_id: uid,
        startup_id: startupId,
        role: "assistant",
        content: reply,
        created_at: nowIso(),
      };

      db.chat_history.push(userMsg, assistantMsg);
      appendActivity(db, uid, "Consulted VentureBot", "chat", message.slice(0, 80));
      writeDb(db);

      res.json({ reply, user_message: userMsg, assistant_message: assistantMsg });
    } catch (err: any) {
      res.status(err?.statusCode || 502).json({ detail: err?.message || "VentureBot request failed." });
    }
  });

  app.delete("/api/chat/history", requireAuth, (req: AuthedRequest, res) => {
    const db = readDb();
    db.chat_history = db.chat_history.filter((m) => m.user_id !== req.authUser!.id);
    writeDb(db);
    res.json({ status: "cleared" });
  });

  // Government Schemes (verified public data)
  app.get("/api/schemes", (req, res) => {
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

    let results = VERIFIED_GOVERNMENT_SCHEMES;
    if (category && category !== "All") {
      results = results.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }
    if (q) {
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ministry.toLowerCase().includes(q) ||
          s.benefits.some((b) => b.toLowerCase().includes(q))
      );
    }
    res.json({ schemes: results });
  });

  // Frontend mounting (Vite in dev, dist/ in production)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EntrepreneurAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start EntrepreneurAI server:", err);
  process.exit(1);
});
