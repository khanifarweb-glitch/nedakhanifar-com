import type { ImageMetadata } from "astro";

// هر عکس jpg/png/webp داخل src/assets/about/ خودکار پیدا می‌شود (عکس اول به ترتیب نام)
const photos = import.meta.glob<{ default: ImageMetadata }>("../assets/about/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", { eager: true });
export const ownerPhoto: ImageMetadata | undefined = Object.values(photos)[0]?.default;
