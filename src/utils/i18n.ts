/** انتخاب زبان و خواندن محتوا. برای افزودن زبان جدید: یک JSON در src/data/content و یک صفحه در src/pages. */
import fa from "../data/content/fa.json";
import ar from "../data/content/ar.json";
import en from "../data/content/en.json";
import common from "../data/content/common.json";

export type Lang = "fa" | "ar" | "en";

export interface Content {
  meta: { title: string; description: string };
  ui: {
    skipLink: string; menu: string; navLabel: string; langLabel: string; rights: string;
    nav: Record<"about" | "achievements" | "gallery" | "expertise" | "cooperation" | "products" | "videos" | "contact", string>;
  };
  hero: { kicker: string; name: string; role: string; headline: string; contactLabel: string; cvLabel: string; cvUrl: string };
  about: { title: string; eyebrow: string; paragraphs: string[] };
  achievements: {
    title: string; eyebrow: string;
    items: { icon: string; title: string; text: string; link: string; linkLabel: string }[];
  };
  gallery: {
    title: string; eyebrow: string; openLabel: string; closeLabel: string; prevLabel: string; nextLabel: string;
    items: { image: string; caption?: string }[];
  };
  expertise: { title: string; eyebrow: string; items: string[] };
  cooperation: { title: string; eyebrow: string; intro: string; items: { title: string; text: string }[] };
  products: { title: string; eyebrow: string; intro: string; items: { title: string; text: string }[] };
  videos: {
    title: string; eyebrow: string; playLabel: string;
    items: { title: string; youtubeId?: string; aparatHash?: string; file?: string }[];
  };
  contact: {
    title: string; eyebrow: string; intro: string;
    labels: { phone: string; whatsapp: string; email: string; linkedin: string };
    form: { name: string; contact: string; message: string; submit: string; sending: string; success: string; invalid: string; failed: string; network: string };
  };
}

export interface Common { email: string; linkedin: string; phone: string; whatsapp: string }

// پنل CMS فیلد یا فهرست خالی را از JSON حذف می‌کند؛ اینجا مقدار پیش‌فرض خالی می‌گذاریم تا سایت نشکند
function normalize(raw: unknown): Content {
  const c = structuredClone(raw) as Content;
  c.about.paragraphs ??= [];
  c.achievements.items ??= [];
  c.gallery.items ??= [];
  c.expertise.items ??= [];
  c.cooperation.items ??= [];
  c.products.items ??= [];
  c.videos.items ??= [];
  return c;
}
const contents: Record<Lang, Content> = { fa: normalize(fa), ar: normalize(ar), en: normalize(en) };
export const getContent = (lang: Lang): Content => contents[lang];
export const commonInfo: Common = { email: "", linkedin: "", phone: "", whatsapp: "", ...(common as Partial<Common>) };

/** فهرست زبان‌ها؛ فارسی زبان پیش‌فرض (ریشه) است. name = نام زبان به خود آن زبان (برای دکمه‌ی تغییر زبان) */
export const langs: Lang[] = ["fa", "ar", "en"];
export const langMeta: Record<Lang, { name: string; html: string; og: string; dir: "rtl" | "ltr"; path: string }> = {
  fa: { name: "فارسی", html: "fa-IR", og: "fa_IR", dir: "rtl", path: "/" },
  ar: { name: "العربية", html: "ar", og: "ar_AR", dir: "rtl", path: "/ar/" },
  en: { name: "English", html: "en", og: "en_US", dir: "ltr", path: "/en/" },
};
export const pathFor = (lang: Lang) => langMeta[lang].path;
export const otherLangs = (lang: Lang): Lang[] => langs.filter((l) => l !== lang);
export const htmlLang: Record<Lang, string> = { fa: "fa-IR", ar: "ar", en: "en" };
