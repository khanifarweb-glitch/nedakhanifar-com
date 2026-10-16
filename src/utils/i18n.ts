/** انتخاب زبان و خواندن محتوا. برای افزودن زبان جدید: یک JSON در src/data/content و یک صفحه در src/pages. */
import fa from "../data/content/fa.json";
import ar from "../data/content/ar.json";
import en from "../data/content/en.json";
import common from "../data/content/common.json";

export type Lang = "fa" | "ar" | "en";

export interface Content {
  meta: { title: string; description: string };
  ui: {
    skipLink: string; menu: string; navLabel: string; otherLangLabel: string; otherLangName: string; rights: string;
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
    partners: { title: string; url: string }[];
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
  c.contact.partners ??= [];
  return c;
}
const contents: Record<Lang, Content> = { fa: normalize(fa), ar: normalize(ar), en: normalize(en) };
export const getContent = (lang: Lang): Content => contents[lang];
export const commonInfo: Common = { email: "", linkedin: "", phone: "", whatsapp: "", ...(common as Partial<Common>) };

/** زبان‌های سایت (ترتیب = ترتیب نمایش در سوئیچ زبان) */
export const langs: Lang[] = ["en", "fa", "ar"];

/** مشخصات هر زبان: نام بومی (برای سوئیچ)، جهت متن، locale و og:locale */
export const langMeta: Record<Lang, { label: string; name: string; dir: "rtl" | "ltr"; locale: string; og: string }> = {
  fa: { label: "فارسی", name: "نسخه فارسی", dir: "rtl", locale: "fa-IR", og: "fa_IR" },
  ar: { label: "العربية", name: "النسخة العربية", dir: "rtl", locale: "ar", og: "ar_AR" },
  en: { label: "English", name: "English version", dir: "ltr", locale: "en", og: "en_US" },
};

/** آدرس صفحه هر زبان (زبان پیش‌فرض = انگلیسی در ریشه، بقیه زیر /fa/ و /ar/) */
export const defaultLang: Lang = "en";
export const pathFor = (lang: Lang) => (lang === defaultLang ? "/" : `/${lang}/`);
/** بقیه‌ی زبان‌ها (برای سوئیچ زبان) */
export const otherLangs = (lang: Lang): Lang[] => langs.filter((l) => l !== lang);
export const htmlLang: Record<Lang, string> = { fa: "fa-IR", ar: "ar", en: "en" };
