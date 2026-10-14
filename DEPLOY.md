# راه‌اندازی nedakhanifar.com (رایگان: GitHub + Cloudflare)

## ۱) ریپوی جدید در GitHub
1. GitHub ← New repository ← نام: `nedakhanifar-com` ← Private یا Public ← Create.
2. «uploading an existing file» را بزنید و **همه‌ی محتوای زیپ** (نه خود زیپ) را بکشید داخل صفحه ← Commit.
   - پوشه‌های مهم: `src`، `public`، `worker` و فایل‌های `package.json`، `astro.config.mjs`، `wrangler.jsonc`.
3. اگر نام کاربری GitHub شما `khanifarweb-glitch` نیست، در `public/admin/config.yml` خط `repo:` را اصلاح کنید.

## ۲) ساخت پروژه در Cloudflare (Workers)
1. Cloudflare ← Workers & Pages ← Create ← **Import a repository** ← ریپوی بالا.
2. نام پروژه دقیقاً `nedakhanifar-com` (باید با `wrangler.jsonc` یکی باشد).
3. Build command: `npm run build` — Deploy command: `npx wrangler deploy` — Root directory خالی.
4. Deploy را بزنید؛ بعد از موفقیت، آدرس `nedakhanifar-com.<حساب>.workers.dev` باید سایت را نشان دهد.

## ۳) دامنه‌ی nedakhanifar.com
1. Cloudflare ← Add a domain ← `nedakhanifar.com` ← پلن **Free**.
2. دو Nameserver که Cloudflare می‌دهد را در پنل ثبت‌کننده‌ی دامنه (مالک دامنه) جایگزین کنید.
3. پروژه ← Settings ← **Domains & Routes** ← Add ← Custom domain ← `nedakhanifar.com`.
4. ریدایرکت `www` به بدون `www`: دامنه ← Rules ← Redirect Rules ← Create:
   - اگر Hostname برابر `www.nedakhanifar.com` بود ← Dynamic redirect به
     `concat("https://nedakhanifar.com", http.request.uri.path)` با کد 301.
   - در DNS یک رکورد `www` از نوع CNAME به `nedakhanifar.com` با Proxy روشن (ابر نارنجی) بسازید.
5. SSL/TLS ← Overview ← حالت **Full**.

## ۴) فرم تماس (اختیاری ولی پیشنهادی)
در Telegram با `@BotFather` ربات بسازید، در ربات Start بزنید و سپس باز کنید:
`https://api.telegram.org/bot<TOKEN>/getUpdates` ← مقدار `chat.id` را بردارید.
Cloudflare ← پروژه ← Settings ← **Variables and Secrets** ← نوع **Secret**:
- `TELEGRAM_BOT_TOKEN` و `TELEGRAM_CHAT_ID`
- (اختیاری) `SITE_ORIGIN` = `https://nedakhanifar.com`

تست: `https://nedakhanifar.com/api/contact` باید `{"ok":true,"ready":true}` نشان دهد.

## ۵) پنل ویرایش محتوا
آدرس: `https://nedakhanifar.com/admin/` ← Sign in with Token.
توکن: GitHub ← Settings (حساب کاربری) ← Developer settings ← Fine-grained tokens ← فقط ریپوی `nedakhanifar-com` ← **Contents: Read and write**.
در پنل، «محتوای سایت» ← نسخه فارسی / عربی / اطلاعات تماس.

## ۶) چیزهایی که باید پر یا جایگزین شود
- **عکس ندا:** فایل jpg/png/webp را در `src/assets/about/` بگذارید (هر نامی). بدون عکس، حرف اول نام نمایش داده می‌شود.
- **واتساپ:** در پنل ← «اطلاعات تماس» ← شماره با پیش‌شماره‌ی کشور (مثلاً 971…). خالی = دکمه نمایش داده نمی‌شود.
- **تلفن:** فعلاً شماره‌ی ایرانی (+98…) است؛ اگر شماره‌ی امارات دارد جایگزین کنید.
- **رزومه PDF:** فایل را در `public/cv/` بگذارید و در پنل «آدرس فایل رزومه» را بنویسید (مثلاً `/cv/neda-fa.pdf`).
- **محصولات و ویدیوها:** در پنل آیتم اضافه کنید؛ تا آیتمی نباشد آن بخش و لینک منویش نمایش داده نمی‌شود.
- **ترجمه‌ی عربی:** قبل از انتشار یک عرب‌زبان بومی بازبینی کند (به‌خصوص املای نام «ندى خنيفر»).
- **مدارک دستاوردها:** عکس غرفه، تقدیرنامه و ... را بعداً به بخش دستاوردها اضافه کنید.

## ۷) بعد از انتشار
1. Google Search Console ← دامنه را تأیید کنید ← Sitemap: `https://nedakhanifar.com/sitemap-index.xml`
2. آدرس‌های `/` و `/ar/` را در «URL Inspection» بررسی و Request indexing بزنید.
3. در Cloudflare ← Security ← Settings، Bot Fight Mode را فقط در صورت لزوم فعال نگه دارید (می‌تواند ربات‌های گوگل را مختل کند).
