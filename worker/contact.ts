/**
 * Handler فرم تماس: /api/contact (از worker/index.ts فراخوانی می‌شود)
 *  - POST: دریافت پیام فرم و ارسال آن به‌صورت ایمیل زیبا به ایمیل مالک سایت
 *          (Cloudflare Email Routing + binding «EMAIL»؛ رایگان و بدون سرویس خارجی)
 *  - GET : فقط {ok, ready} برای بررسی سلامت؛ هیچ مقدار محرمانه‌ای برنمی‌گرداند
 * چیزی ذخیره نمی‌شود. راه‌اندازی: DEPLOY.md
 */
// @ts-ignore — ماژول زمان اجرای Cloudflare است و در tsc تعریف تایپ ندارد
import { EmailMessage } from "cloudflare:email";

export interface Env {
  /** binding از wrangler.jsonc (send_email) */
  EMAIL?: { send(message: unknown): Promise<void> };
  /** آدرس فرستنده؛ باید روی دامنه‌ی سایت باشد. پیش‌فرض: form@nedakhanifar.com */
  MAIL_FROM?: string;
  TURNSTILE_SECRET_KEY?: string; // اختیاری
  SITE_ORIGIN?: string; // اختیاری: مثلاً https://nedakhanifar.com
}
type Ctx = { request: Request; env: Env };

const DEFAULT_FROM = "form@nedakhanifar.com";
const DEFAULT_TO = "Khanifarnda@gmail.com"; // ایمیل مالک سایت

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

// فرار از HTML (جلوگیری از XSS در ایمیل)
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

/* ───────── ساخت ایمیل (MIME) ───────── */

const enc = new TextEncoder();

/** متن UTF-8 → base64 با خط‌های ≤۷۶ کاراکتر (استاندارد MIME) */
function b64(text: string): string {
  const bytes = enc.encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/** هدر غیر ASCII (مثل عنوان) به‌صورت encoded-word */
const encodeHeader = (s: string) => `=?UTF-8?B?${btoa(String.fromCharCode(...enc.encode(s)))}?=`;

interface Mail { name: string; contact: string; isEmail: boolean; message: string; lang: string; when: string }

function renderHtml(m: Mail): string {
  const contactHtml = m.isEmail
    ? `<a href="mailto:${esc(m.contact)}" style="color:#1f3a5f;text-decoration:none;" dir="ltr">${esc(m.contact)}</a>`
    : `<a href="tel:${esc(m.contact.replace(/[\s\-()]/g, ""))}" style="color:#1f3a5f;text-decoration:none;" dir="ltr">${esc(m.contact)}</a>`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:12px 0;border-bottom:1px solid #ece8df;">
       <div style="font-size:12px;color:#8a7a55;margin-bottom:4px;">${label}</div>
       <div style="font-size:16px;color:#0e1b2c;line-height:1.8;">${value}</div>
     </td></tr>`;
  return `<!doctype html>
<html lang="fa" dir="rtl"><body style="margin:0;padding:0;background:#f7f6f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;padding:24px 12px;">
 <tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6e1d4;font-family:Tahoma,'Segoe UI',Arial,sans-serif;direction:rtl;text-align:right;">
   <tr><td style="background:#0e1b2c;padding:24px 28px;border-bottom:4px solid #b8914a;">
     <div style="font-size:12px;color:#d8b673;letter-spacing:.5px;">NEDAKHANIFAR.COM</div>
     <div style="font-size:20px;color:#ffffff;margin-top:6px;font-weight:bold;">پیام جدید از فرم تماس سایت</div>
   </td></tr>
   <tr><td style="padding:8px 28px 4px;">
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row("نام فرستنده", esc(m.name))}
       ${row("راه ارتباط", contactHtml)}
       ${row("پیام", `<div style="white-space:pre-wrap;">${esc(m.message)}</div>`)}
     </table>
   </td></tr>
   <tr><td style="padding:16px 28px 24px;">
     <div style="font-size:12px;color:#8a8a8a;line-height:1.9;">
       زبان صفحه: ${esc(m.lang)} · زمان ارسال: ${esc(m.when)}<br>
       برای پاسخ، همین ایمیل را Reply کنید${m.isEmail ? "؛ پاسخ مستقیم به فرستنده می‌رسد." : "؛ فرستنده شماره تلفن داده است، با او تماس بگیرید."}
     </div>
   </td></tr>
  </table>
 </td></tr>
</table></body></html>`;
}

function renderText(m: Mail): string {
  return [
    "پیام جدید از فرم تماس nedakhanifar.com",
    "",
    `نام: ${m.name}`,
    `راه ارتباط: ${m.contact}`,
    `زبان صفحه: ${m.lang}`,
    `زمان: ${m.when}`,
    "",
    "پیام:",
    m.message,
  ].join("\r\n");
}

/** ایمیل کامل multipart/alternative (متن ساده + HTML) */
function buildRaw(from: string, to: string, replyTo: string | null, m: Mail): string {
  const boundary = `nk_${crypto.randomUUID().replace(/-/g, "")}`;
  const domain = from.split("@")[1] ?? "nedakhanifar.com";
  const headers = [
    `From: ${encodeHeader("فرم سایت ندا خنیفر")} <${from}>`,
    `To: <${to}>`,
    ...(replyTo ? [`Reply-To: <${replyTo}>`] : []),
    `Subject: ${encodeHeader(`پیام جدید از سایت: ${m.name.replace(/\s+/g, " ").slice(0, 60)}`)}`,
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  return [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(renderText(m)),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64(renderHtml(m)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

// GET /api/contact : وضعیت پیکربندی
export const onRequestGet = ({ env }: { env: Env }): Response =>
  json({ ok: true, ready: Boolean(env.EMAIL) }); // فقط آماده/ناآماده

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
  const elapsed = Number(data.elapsed);
  if (!Number.isFinite(elapsed)) return fail("درخواست نامعتبر است.", 400, "payload");
  if (clean(data.website, 100) !== "" || elapsed < 1200) return json({ ok: true });

  // ۴) اعتبارسنجی ورودی
  const name = clean(data.name, 80);
  const contact = toLatinDigits(clean(data.contact, 120));
  const message = clean(data.message, 1500);
  const lang = clean(data.lang, 4) === "ar" ? "عربی" : "فارسی";

  const isEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(contact);
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

  // ۶) ارسال ایمیل
  if (!env.EMAIL) return fail("ارسال فرم هنوز پیکربندی نشده است.", 500, "not-configured");

  const from = env.MAIL_FROM?.trim() || DEFAULT_FROM;
  const to = DEFAULT_TO; // باید با destination_address در wrangler.jsonc یکی باشد
  const when = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date());

  try {
    const rawMail = buildRaw(from, to, isEmail ? contact : null, { name, contact, isEmail, message, lang, when });
    await env.EMAIL.send(new EmailMessage(from, to, rawMail));
    return json({ ok: true });
  } catch (e) {
    console.error("[contact] email send failed:", e); // در لاگ Cloudflare دیده می‌شود
    return fail("ارسال انجام نشد. لطفاً از راه‌های ارتباط مستقیم استفاده کنید.", 502, "email");
  }
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
