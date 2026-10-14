/**
 * Cloudflare Worker (Workers + Static Assets).
 * سایت استاتیک Astro از پوشه dist سرو می‌شود و فقط مسیر /api/contact به کد زیر می‌رسد.
 */
import { onRequestGet, onRequestPost, type Env as ContactEnv } from "./contact";

interface Env extends ContactEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/contact") {
      if (request.method === "POST") return onRequestPost({ request, env });
      if (request.method === "GET") return onRequestGet({ env });
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST" } });
    }

    // هر مسیر دیگری: فایل‌های استاتیک
    return env.ASSETS.fetch(request);
  },
};
