import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const SITE = "https://nedakhanifar.com";

// hreflang صریح برای دو نسخه‌ی زبانی (فارسی در ریشه، عربی زیر /ar/)
// گزینه‌ی i18n افزونه فرض می‌کند همه‌ی زبان‌ها پیشوند دارند و برای فارسی در ریشه درست کار نمی‌کند
const alternates = [
  { url: `${SITE}/`, lang: "fa" },
  { url: `${SITE}/ar/`, lang: "ar" },
  { url: `${SITE}/`, lang: "x-default" },
];

// تنظیمات اصلی: خروجی استاتیک، sitemap دو زبانه (hreflang) و prefetch سبک
export default defineConfig({
  site: SITE,
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !/\/404\/?$/.test(page),
      serialize(item) {
        if (item.url === `${SITE}/` || item.url === `${SITE}/ar/`) item.links = alternates;
        return item;
      },
    }),
  ],
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  build: { inlineStylesheets: "auto" },
});
