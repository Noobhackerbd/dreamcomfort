// lib/chat-media.ts — photos inside stored chat messages (shared by server and admin UI).
//
// A customer photo is stored in the message text as a line "[img]https://…", so the
// inbox can show it without a database change. Facebook's photo links expire after a
// while; the text "📷 ছবি পাঠিয়েছেন" stays.
export const PHOTO_LABEL = "📷 ছবি পাঠিয়েছেন";
const IMG_LINE = /^\[img\](\S+)$/;

export function withPhotos(text: string, urls: string[]): string {
  return [text, ...urls.map((u) => `[img]${u}`)].filter(Boolean).join("\n");
}

/** Message text without the photo lines, plus the photo links. */
export function splitPhotos(text: string): { text: string; photos: string[] } {
  const photos: string[] = [];
  const rest: string[] = [];
  for (const line of String(text || "").split("\n")) {
    const m = line.trim().match(IMG_LINE);
    if (m && /^https:\/\//.test(m[1])) photos.push(m[1]);
    else rest.push(line);
  }
  return { text: rest.join("\n").trim(), photos };
}
