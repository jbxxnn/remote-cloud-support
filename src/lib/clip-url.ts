const CLIP_BASE_URL = "https://1q0aqr4ebdyoq5vlkno5hdhd5d9jeqp6.ui.nabu.casa";

export function getClipHref(clipUrl?: string | null) {
  const value = clipUrl?.trim();

  if (!value) {
    return null;
  }

  if (/^https:\/[^/]/i.test(value)) {
    return value.replace(/^https:\//i, "https://");
  }

  if (/^http:\/[^/]/i.test(value)) {
    return value.replace(/^http:\//i, "http://");
  }

  if (/^(https?:|blob:|data:)/i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (/^(www\.|[a-z0-9-]+(\.[a-z0-9-]+)+\/)/i.test(value)) {
    return `https://${value}`;
  }

  return new URL(value.replace(/^\/+/, ""), `${CLIP_BASE_URL}/`).toString();
}
