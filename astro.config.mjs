import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// تنظیمات اصلی: خروجی استاتیک، sitemap سه‌زبانه (hreflang) و prefetch سبک
export default defineConfig({
  site: "https://nedakhanifar.com",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      lastmod: new Date(), // تاریخ آخرین build؛ به موتور جستجو کمک می‌کند صفحه‌ی تازه را زودتر ببیند
      i18n: { defaultLocale: "en", locales: { en: "en", fa: "fa-IR", ar: "ar" } },
    }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  build: { inlineStylesheets: "auto" },
});
