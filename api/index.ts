import type { IncomingMessage, ServerResponse } from "node:http";
import { createApiApp } from "../server-app.ts";

const app = createApiApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const rawUrl = req.url || "/";
  const parsed = new URL(rawUrl, "http://localhost");
  const vpath = parsed.searchParams.get("__vpath");
  if (vpath !== null) {
    parsed.searchParams.delete("__vpath");
    const qs = parsed.searchParams.toString();
    req.url = `/api/${vpath}${qs ? `?${qs}` : ""}`;
  }
  return app(req as any, res as any);
}
