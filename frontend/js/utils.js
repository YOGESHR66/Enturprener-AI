export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function formatCurrency(amount, currency = "INR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return "—";
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(isoStr) {
  if (!isoStr) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(isoStr));
  } catch {
    return String(isoStr);
  }
}

export function formatRichText(raw) {
  const safe = escapeHtml(raw || "");
  const lines = safe.split(/\r?\n/);
  const html = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const formatted = trimmed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html.push('<ul class="clean-list">');
        inList = true;
      }
      html.push(`<li>${formatted.slice(2)}</li>`);
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      if (trimmed.length > 0) {
        html.push(`<p style="margin:0 0 8px;">${formatted}</p>`);
      }
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

export function parseCsvList(input) {
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function riskClass(risk) {
  if (risk === "Low") return "state-positive";
  if (risk === "High") return "state-alert";
  return "state-caution";
}
