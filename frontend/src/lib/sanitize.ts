const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}

export const sanitize = {
  html: (str: string): string =>
    str.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c),

  username: (str: string): string =>
    str.replace(/[^a-zA-Z0-9_\-\.]/g, '').slice(0, 50),

  number: (val: unknown, min: number, max: number, def: number): number => {
    const n = Number(val)
    if (isNaN(n)) return def
    return Math.min(Math.max(n, min), max)
  },
}
