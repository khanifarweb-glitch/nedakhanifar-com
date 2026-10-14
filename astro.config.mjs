import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// تنظیمات اصلی: خروجی استاتیک، sitemap دو زبانه (hreflang) و prefetch سبک
export default defineConfig({
  site: "https://nedakhanifar.com",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      i18n: { defaultLocale: "fa", locales: { fa: "fa-IR", ar: "ar" } },
    }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  build: { inlineStylesheets: "auto" },
});
