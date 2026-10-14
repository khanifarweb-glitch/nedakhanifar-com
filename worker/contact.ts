/**
 * Handler فرم تماس: /api/contact (از worker/index.ts فراخوانی می‌شود)
 *  - POST: دریافت پیام فرم تماس و ارسال به Telegram و/یا Bale (چیزی ذخیره نمی‌شود)
 *  - GET : فقط {ok, ready} برای بررسی سلامت؛ هیچ مقدار محرمانه‌ای برنمی‌گرداند
 * متغیرهای محیطی در داشبورد Cloudflare Pages تنظیم می‌شوند (راهنما: DEPLOY.md).
 */

export interface Env {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  BALE_BOT_TOKEN?: string;
  BALE_CHAT_ID?: string;
  TURNSTILE_SECRET_KEY?: string; // اختیاری
  SITE_ORIGIN?: string; // اختیاری: مثلاً https://nedakhanifar.com
}
type Ctx = { request: Request; env: Env };

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

// پاسخ خطا همراه با «code» کوتاه برای عیب‌یابی (بدون اطلاعات محرمانه)
const fail = (error: string, status: number, code: string) => json({ ok: false, error, code }, status);

// حذف کاراکترهای کنترلی و محدودکردن طول ورودی
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "";

// تبدیل ارقام فارسی/عربی به لاتین برای اعتبارسنجی شماره
const toLatinDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

interface Channel { name: string; base: string; token: string; chat: string }

/** ارسال پیام به یک کانال؛ در صورت خطا Error با کد کوتاه (مثل telegram:400) پرتاب می‌شود. */
async function send(ch: Channel, text: string): Promise<void> {
  const chat_id = /^-?\d+$/.test(ch.chat) ? Number(ch.chat) : ch.chat; // Bale شناسه عددی می‌خواهد
  let res: Response;
  try {
    res = await fetch(`${ch.base}/bot${ch.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text }), // بدون parse_mode: متن ساده
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error(`[contact] ${ch.name} network error:`, e);
    throw new Error(`${ch.name}:network`);
  }
  if (!res.ok) {
    const info = (await res.json().catch(() => ({}))) as { description?: string };
    console.error(`[contact] ${ch.name} ${res.status}: ${info.description ?? ""}`); // در لاگ Cloudflare دیده می‌شود
    throw new Error(`${ch.name}:${res.status}`);
  }
}

const channels = (env: Env): Channel[] => {
  const list: Channel[] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    list.push({ name: "telegram", base: "https://api.telegram.org", token: env.TELEGRAM_BOT_TOKEN.trim(), chat: env.TELEGRAM_CHAT_ID.trim() });
  }
  if (env.BALE_BOT_TOKEN && env.BALE_CHAT_ID) {
    list.push({ name: "bale", base: "https://tapi.bale.ai", token: env.BALE_BOT_TOKEN.trim(), chat: env.BALE_CHAT_ID.trim() });
  }
  return list;
};

// GET /api/contact : وضعیت پیکربندی
export const onRequestGet = ({ env }: { env: Env }): Response =>
  json({ ok: true, ready: channels(env).length > 0 }); // فقط آماده/ناآماده؛ جزئیات پیکربندی فاش نمی‌شود

async function handle({ request, env }: Ctx): Promise<Response> {
  // ۱) محافظت CSRF: فقط درخواست JSON از همین دامنه
  const origin = request.headers.get("Origin");
  const allowed = [new URL(request.url).origin, env.SITE_ORIGIN].filter(Boolean);
  const sameSite = origin ? allowed.includes(origin) : request.headers.get("Sec-Fetch-Site") === "same-origin";
  if (!sameSite) return fail("invalid", 403, "origin");
  if (!(request.headers.get("Content-Type") ?? "").startsWith("application/json")) {
    return fail("درخواست نامعتبر است.", 415, "content-type");
  }

  // ۲) خواندن بدنه با محدودیت حجم
  const raw = await request.text();
  if (raw.length > 6000) return fail("درخواست بیش از حد بزرگ است.", 413, "size");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return fail("درخواست نامعتبر است.", 400, "json");
  }

  // ۳) ضد اسپم: honeypot و زمان پر کردن فرم (ربات‌ها بی‌صدا «موفق» می‌گیرند).
  //    زمان را مرورگر اندازه می‌گیرد (elapsed) تا به ساعت دستگاه کاربر وابسته نباشیم.
  const elapsed = Number(data.elapsed);
  if (!Number.isFinite(elapsed)) return fail("درخواست نامعتبر است.", 400, "payload");
  if (clean(data.website, 100) !== "" || elapsed < 1200) return json({ ok: true });

  // ۴) اعتبارسنجی ورودی
  const name = clean(data.name, 80);
  const contact = toLatinDigits(clean(data.contact, 120));
  const message = clean(data.message, 1500);
  const lang = clean(data.lang, 4) === "ar" ? "عربی" : "فارسی";

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const isPhone = /^\+?\d{7,15}$/.test(contact.replace(/[\s\-()]/g, ""));

  if (name.length < 2) return fail("invalid", 400, "validation");
  if (!isEmail && !isPhone) return fail("invalid", 400, "validation");
  if (message.length < 5) return fail("invalid", 400, "validation");

  // ۵) Turnstile (فقط اگر کلید سمت سرور تنظیم شده باشد)
  if (env.TURNSTILE_SECRET_KEY) {
    const token = clean(data["cf-turnstile-response"], 2048);
    const ok = token && (await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, request.headers.get("CF-Connecting-IP")));
    if (!ok) return fail("تأیید امنیتی انجام نشد. دوباره تلاش کنید.", 400, "turnstile");
  }

  // ۶) ارسال به کانال‌های تنظیم‌شده
  const list = channels(env);
  if (list.length === 0) return fail("ارسال فرم هنوز پیکربندی نشده است.", 500, "not-configured");

  const text = [
    "📩 پیام جدید از سایت ندا خنیفر",
    `نام: ${name}`,
    `تماس: ${contact}`,
    `زبان صفحه: ${lang}`,
    `پیام: ${message}`,
  ].join("\n");

  const results = await Promise.allSettled(list.map((ch) => send(ch, text)));
  if (results.some((r) => r.status === "fulfilled")) return json({ ok: true });

  const code = results.map((r) => (r.status === "rejected" ? String((r.reason as Error).message) : "")).join(",");
  return fail("ارسال انجام نشد. لطفاً از راه‌های ارتباط مستقیم استفاده کنید.", 502, code);
}

// POST /api/contact : هر خطای پیش‌بینی‌نشده هم به‌صورت JSON برمی‌گردد (نه صفحه خطای HTML)
export const onRequestPost = async (ctx: Ctx): Promise<Response> => {
  try {
    return await handle(ctx);
  } catch (e) {
    console.error("[contact] unexpected:", e);
    return fail("خطای داخلی سرور.", 500, "exception");
  }
};
