/**
 * اطلاعات ثابت سایت (دامنه، نام و تصویر اشتراک‌گذاری).
 * متن‌های صفحه در src/data/content/*.json هستند و از پنل /admin/ ویرایش می‌شوند.
 */
export const site = {
  name: "Neda Khanifar",
  url: "https://nedakhanifar.com",
  ogImage: "/og-default.png",
  // اگر دامنه‌ی اصلی با www باشد، فقط همین آدرس و astro.config.mjs را عوض کنید
} as const;
