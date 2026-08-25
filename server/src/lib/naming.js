export function slugify(name) {
  return (
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

// A filesystem/URL-safe display name (keeps spaces/case, strips anything
// that would break a path segment) — used for human-readable folder names
// like "Demo Page/2026-08-25/OpenAI news".
export function safeSegment(name) {
  return String(name).replace(/[\/\\:*?"<>|]/g, '').trim() || 'untitled';
}

export function todayFolder(date = new Date()) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
